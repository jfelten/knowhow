
var logger=require('./log-control').logger;
var async = require('async');
var agentControl = require('./agent-control');

var http = require('http');
var io =  require('socket.io-client');
var fileControl = require('../routes/file-control');
var ss = require('socket.io-stream');
//deliver the agent files

var pathlib = require('path');

var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
exports.eventEmitter = eventEmitter;
var currentJobs = {};

updateJob = function(agent, job, callback ) {
	if (agent && agent._id) {
		agentId=agent._id;
		if(!currentJobs[agentId]) {
			currentJobs[agentId] = {};
			currentJobs[agentId].agent=agent;
			currentJobs[agentId][job.id] = job;
		} 
		if (!currentJobs[agentId][job.id]) {
			currentJobs[agentId][job.id] = job;
		} else {
			currentJobs[agentId][job.id].progress=job.progress;
			currentJobs[agentId][job.id].status=currentJobs[agentId][job.id].status;
		}
	}
	if (callback) {
		callback();
	}
		
	
};

exports.updateJob = updateJob;

cancelJob = function(agentId, jobId, callback ) {
	if (currentJobs[agentId] != undefined && currentJobs[agentId][jobId] != undefined) {
		if (currentJobs[agentId][jobId].fileSocket != undefined) {
			currentJobs[agentId][jobId].fileSocket.close();
		}
		if (currentJobs[agentId][jobId].eventSocket != undefined) {
			currentJobs[agentId][jobId].eventSocket.close();
		}
		for (uploadFile in currentJobs[agentId][jobId].fileProgress) {
			if (currentJobs[agentId][jobId].fileProgress[uploadFile].readStream != null) {
				currentJobs[agentId][jobId].fileProgress[uploadFile].readStream.close();
			}
	    }
		clearTimeout(currentJobs[agentId][jobId].timeout);
	    clearInterval(currentJobs[agentId][jobId].fileCheck);
	    eventEmitter.emit('job-cancel',currentJobs[agentId].agent, currentJobs[agentId][jobId]);
	    delete currentJobs[agentId][jobId];
	}
	 
    if (callback) {
    	callback();
    }
}

exports.cancelJob = cancelJob;

completeJob = function(agent,job) {
	if (agent && job) {
		
		var jobId = job.id;
		var agentId = agent._id;
		logger.info("completing "+jobId);
		if (currentJobs[agentId][jobId].fileSocket) {
			logger.debug("closing file socket.");
			currentJobs[agentId][jobId].fileSocket.close();
		}
		if (currentJobs[agentId][jobId].eventSocket) {
			logger.debug("closing event socket.");
			currentJobs[agentId][jobId].eventSocket.close();
		}
		if (uploadFile in currentJobs[agentId][jobId].fileProgress) {
			logger.debug("closing files.");
			for (uploadFile in currentJobs[agentId][jobId].fileProgress) {
				if (currentJobs[agentId][jobId].fileProgress[uploadFile] && 
				currentJobs[agentId][jobId].fileProgress[uploadFile].readStream) {
				
					currentJobs[agentId][jobId].fileProgress[uploadFile].readStream.close();
				}
		    }
		}
		clearTimeout(currentJobs[agentId][jobId].timeout);
	    clearInterval(currentJobs[agentId][jobId].fileCheck);
	    delete currentJobs[agentId][jobId];
	    logger.info("completed.");
	    eventEmitter.emit('job-complete',agent, job);
	 }
}
exports.completeJob = completeJob;

exports.cancelJobOnAgent = function(agent,job,callback) {

	var jobId = job.id;
	var agentId = agent._id;


	cancelJob(agentId, jobId)
	
	callback();
}

exports.executeJob = function(agent,job,callback) {

	var jobId = job.id;
	var agentId = agent._id;
	

	var headers = {
		    'Content-Type' : 'application/json',
		    'Content-Length' : Buffer.byteLength(JSON.stringify(job) , 'utf8'),
		    'Content-Disposition' : 'form-data; name="script"'
		};

	// the post options
	var options = {
	    host : agent.host,
	    port : agent.port,
	    path : '/api/execute',
	    method : 'POST',
	    headers : headers
	};

	logger.info('Starting Job: '+job.id+' on '+agent.user+'@'+agent.host+':'+agent.port);

	// do the POST call
	var reqPost = http.request(options, function(res) {
		logger.debug("statusCode: ", res.statusCode);
	    // uncomment it for header details
		//logger.debug("headers: ", res.headers);

		 

	    res.on('data', function(d) {
	    	logger.debug('result:\n');
	        process.stdout.write(d+'\n');
	        if (res.statusCode != 200) {
			 	logger.error("Unable to execute Job. Response code:"+res.statusCode);
			 	callback(new Error(d));
			 	return;
			 }
	        logger.debug('\n\nJob request sent. Listening for events and uploading files');
	        job.progress=1;
	        job.status="initializing job"
	        job.progress=1;
	        eventEmitter.emit('job-update',job);
	        
			
		    //do the work
//		    try {
				
				if (currentJobs[agentId] == undefined) {
					currentJobs[agentId] = {};
				}
				
		    	
		    	cancelJob(agentId, jobId, function() {//cancel the existing job if it is running
		    		currentJobs[agentId][jobId] = job;
		    		currentJobs[agentId].agent=agent;
		    		//listenForJobEvents(agent, jobId, function() {
			    		uploadFiles(agent,job,function(err) {
			    			if (err) {
			    				callback(new Error("Problem starting upload for job id: "+jobId));
			    				return;
			    			}
			    			setJobTimer(agent, job);
			    		});
			    		
			    	//});
		    	});
		    	
		    	
//		    } catch (err) {
//		      currentJobs[agentId][jobId].eventSocket.emit('job-cancel',jobId);
//		    	logger.error(err);
//		    	logger.error("problem uploading files");
//		    	cancelJob(agentId, jobId);
//		    	callback(new Error("Unable to start job id: "+jobId));
//		    	return;
//		    }
		    callback(null,jobId+' execution started');
	    });
	});


	reqPost.write(JSON.stringify(job));
	reqPost.end();
	reqPost.on('error', function(e) {
	    logger.error(e);
	    
	});
}

function listenForJobEvents(agent, jobId, callback) {
	var agentId = agent._id;
	logger.debug("agent_id="+agentId+" job="+jobId);
	logger.debug(currentJobs[agentId][jobId]);
	currentJobs[agentId][jobId].eventSocket = require('socket.io-client')('http://'+agent.host+':'+agent.port+'/job-events');
    var listening = false;
    currentJobs[agentId][jobId].eventSocket.on('connect', function() { 
    
    	currentJobs[agentId][jobId].eventSocket.on('job-update', function(job){
			logger.debug("job update");
			//logger.debug(job.progress+" "+job.status);
			eventEmitter.emit('job-update',agent, job);
		});
		currentJobs[agentId][jobId].eventSocket.on('job-complete', function(job){
			logger.info('Completed Job: '+job.id);
			completeJob(agent, job);
			eventEmitter.emit('job-complete',agent, job);
		});
		currentJobs[agentId][jobId].eventSocket.on('job-error', function(job){
			logger.info('Stopping Job: '+job.id+ ' due to error.');
			currentJobs[agentId][jobId].eventSocket.emit('job-cancel',jobId);
		});
		currentJobs[agentId][jobId].eventSocket.on('job-cancel', function(jobId){
			logger.info('job: '+jobId+ ' cancelled.');
			cancelJob(agentId, jobId);
		});
    	if (listening == false) {
    	 	logger.info('listening for events from job: '+jobId);
    	 	currentJobs[agentId][jobId].eventSocket.emit('job-listen', jobId);
    	 	job = {
    	 		id: jobId,
    	 		progress: 1,
    	 		status: 'starting: '+jobId
  
    	 	};
    	 	eventEmitter.emit('job-update',agent, job);
    	 	listening=true;
    	 	callback();
    	}
    	 
    });
   
	

}
	
function uploadFiles(agent,job, callback) {
 	var agentId = agent._id;
	jobId=job.id;
	files=job.files;
	var socket;
	try {
		currentJobs[agentId][jobId].fileSocket = require('socket.io-client')('http://'+agent.host+':'+agent.port+'/upload');
	} catch(err) {
		throw err
		return;
	} 
	currentJobs[agentId][jobId].fileSocket.on('connect' ,function () {
		currentJobs[agentId][jobId].fileSocket.on('End' ,function (data) {
		
	      logger.info("done uploading: "+data.fileName+" for job: "+data.jobId);
	      logger.info(data.message);
	      currentJobs[agentId][jobId].fileProgress[data.fileName].uploadComplete=true;
		      
	    });
		currentJobs[agentId][jobId].fileSocket.on ('Error', function(data) {
	    	logger.error("socket error: "+data);
	        currentJobs[agentId][jobId].socket.emit('client-upload-error', {name: data.fileName, jobId: data.jobId} );
	        currentJobs[agentId][jobId].eventSocket.emit('job-cancel',jobId);
		});
		currentJobs[agentId][jobId].fileProgress = {};
		for (uploadFile in files) {
		    
		    
			var file = files[uploadFile];
			var filepath= fileControl.getFilePath(file.source);
			var fileName = pathlib.basename(filepath);
			currentJobs[agentId][jobId].fileProgress[fileName] = {}
		    currentJobs[agentId][jobId].fileProgress[fileName].fileName=fileName;
			
			var name = filepath.split(pathlib.sep).pop();
			
			
			
			var total = 0;
//			try {
				var stats = fs.statSync(filepath);
				var fileSizeInBytes = stats["size"];	
			    logger.info("uploading "+filepath);
				var stream = ss.createStream();
				currentJobs[agentId][jobId].fileProgress[fileName].readStream = fs.createReadStream(filepath,{autoClose: true, highWaterMark: 32 * 1024});
				ss(currentJobs[agentId][jobId].fileSocket).emit('agent-upload', stream, {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination });
				currentJobs[agentId][jobId].fileProgress[fileName].readStream.pipe(stream );
			    
//			} catch(err) {
//				logger.error(err);
//				currentJobs[agentId][jobId].fileSocket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
//	            currentJobs[agentId][jobId].fileProgress.error=true;
//	            logger.error('requesting cancel of: '+jobId);
//				currentJobs[agentId][jobId].eventSocket.emit('job-cancel',jobId);
//				cancelJob(agentId, jobId);
//				callback(new Error("Problem starting file upload"));
//				return;
//				break;
//			}
			
		}
		callback();
	});    
	
}

function setJobTimer(agent, job) {
	var jobId = job.id;
	var agentId = agent._id;
	//wait and make sure all files get uploaded
	//close all sockets when done.
	timeoutms=300000;//default timeout of 5 minutes
    if (job.options != undefined && job.options.timeoutms != undefined) {
    	timeoutms=job.options.timeoutms;
    }
    
   currentJobs[agentId][jobId].timeout = setTimeout(function() {
    	clearInterval(currentJobs[agentId][jobId].fileCheck);
    	currentJobs[agentId][jobId].status=("Timeout - job cancelled");
    	logger.error("job timed out for: "+jobId);
        //currentJobs[agentId][jobId].eventSocket.emit('job-cancel',jobId);
    }, timeoutms);
    
    var checkInterval = 10000; //10 seconds
    //wait until all files are received
    
    var missedHeartbeats =0;
    currentJobs[agentId][jobId].fileCheck = setInterval(function() {
    	
    	maxMissedHeartbeats =10;
    	agentControl.heartbeat(agent, function(err) {
	    	if (err) {
	    		missedHeartbeats++;
	    		if (missedHeartbeats>= maxMissedHeartbeats) {
			    	logger.info(jobId+" lost contact with agent.");
	    			for (index in currentJobs[agentId][jobId].fileProgress) {
			    		currentJobs[agentId][jobId].fileProgress[index].readStream.close();
			        }
			        currentJobs[agentId][jobId].fileSocket.close();
			        currentJobs[agentId][jobId].error=true;
			       	clearTimeout(currentJobs[agentId][jobId].timeout);
	    			clearInterval(currentJobs[agentId][jobId].fileCheck);
	    			eventEmitter.emit("job-error",job);
	    			cancelJob(agentId, jobId);
	    		}
	    		return;
	    	}
	    	missedHeartbeats=0;
	    	
	    	if (currentJobs[agentId][jobId].uploadComplete != true) {
	    		numFilesUploaded=0;
		    	for (index in currentJobs[agentId][jobId].fileProgress) {
		    		var uploadFile = currentJobs[agentId][jobId].fileProgress[index];
		    		if (uploadFile.uploadComplete == true) {
		    		    numFilesUploaded++;
		    		    if (numFilesUploaded >= job.files.length) {
		    		    	logger.info("all files are uploaded.");
		    		    	logger.info(jobId+" all files sent...");
			    			for (index in currentJobs[agentId][jobId].fileProgress) {
					    		currentJobs[agentId][jobId].fileProgress[index].readStream.close();
					        }
					        currentJobs[agentId][jobId].fileSocket.close();
					        currentJobs[agentId][jobId].uploadComplete=true;
					       	clearTimeout(currentJobs[agentId][jobId].timeout);
			    			clearInterval(currentJobs[agentId][jobId].fileCheck);
			    		}  		
		    		} else if (uploadFile.error == true) {
		    			logger.error(jobId+" error aborting upload.");
		    			uploadFile.socket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );	
		        		for (index in currentJobs[agentId][jobId].fileProgress) {
				    		fileProgress[index].readStream.close();
				    		socket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
				        }
				        currentJobs[agentId][jobId].eventSocket.emit('job-cancel',jobId);
		    		}
		    	}
		    	if (currentJobs[agentId][jobId].files != undefined) {
		    		logger.debug(numFilesUploaded+ " of "+job.files.length+" files sent.");
		    	} else {
		    		logger.info("no files defined so none sent.");
		    		currentJobs[agentId][jobId].fileSocket.close();
					currentJobs[agentId][jobId].uploadComplete=true;
	    		}
		    }
    	});
    }, checkInterval);
	
}

exports.getRunningJobsList = function(callback) {
	var runningJobs = {}
	for (agentId in currentJobs) {
		for (job in currentJobs[agentId]) {
			if (currentJobs[agentId][jobId].progress >0) {
				runningJobs[agentId] = {};
				runningJobs[agentId][jobId] = {};
				runningJobs[agentId][jobId].progress = currentJobs[agentId][jobId].progress;
				runningJobs[agentId][jobId].status = currentJobs[agentId][jobId].status;
				runningJobs[agentId].agent = currentJobs[agentId].agent;
			}
		}
	}
	callback(runningJobs);
}