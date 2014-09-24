
var logger=require('./log-control').logger;
var async = require('async');
var agentControl = require('./agent-control');
var agentEvents = require('./agent-events');
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

setFileSocket = function(agent, socket) {
	if (agent && agent._id) {
		agentId=agent._id;
		if(!currentJobs[agentId]) {
			currentJobs[agentId] = {};
			currentJobs[agentId].fileSocket=socket;
		} 
	}

};
exports.setFileSocket = setFileSocket;

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

initiateJob = function(agentId, jobId, callback ) {
	if (currentJobs[agentId] != undefined && currentJobs[agentId][jobId] != undefined) {
		//if (currentJobs[agentId].fileSocket != undefined) {
		//	currentJobs[agentId].fileSocket.close();
		//}
		//if (currentJobs[agentId][jobId].eventSocket != undefined) {
		//	currentJobs[agentId][jobId].eventSocket.close();
		//}
		//for (uploadFile in currentJobs[agentId][jobId].fileProgress) {
		//	if (currentJobs[agentId][jobId].fileProgress[uploadFile].readStream != null) {
		//		currentJobs[agentId][jobId].fileProgress[uploadFile].readStream.close();
		//	}
	    //}
		clearTimeout(currentJobs[agentId][jobId].timeout);
	    clearInterval(currentJobs[agentId][jobId].fileCheck);
	    delete currentJobs[agentId][jobId];
	}
	 
    if (callback) {
    	callback();
    }
}

exports.initiateJob = initiateJob;

cancelJob = function(agentId, jobId, callback ) {
	if (currentJobs[agentId] != undefined && currentJobs[agentId][jobId] != undefined) {
		//if (currentJobs[agentId].fileSocket != undefined) {
		//	currentJobs[agentId].fileSocket.close();
		//}
		//if (currentJobs[agentId][jobId].eventSocket != undefined) {
		//	currentJlobs[agentId][jobId].eventSocket.close();
		//}
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
		//if (currentJobs[agentId].fileSocket) {
		//	logger.debug("closing file socket.");
		//	currentJobs[agentId].fileSocket.disconnect();
		//}
		//if (currentJobs[agentId][jobId].eventSocket) {
		//	logger.debug("closing event socket.");
		//	currentJobs[agentId][jobId].eventSocket.close();
		//}
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
	
	agent.eventSocket.emit("job-cancel",job);

	//cancelJob(agentId, jobId)
	
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
			 	callback(new Error(d.message));
			 	return;
			 }
	        logger.debug('\n\nJob request sent. Listening for events and uploading files');
	        job.progress=1;
	        job.status="initializing job"
	        job.progress=1;
	        eventEmitter.emit('job-update',agent,job);
	        
			
		    //do the work
//		    try {
				
				if (currentJobs[agentId] == undefined) {
					currentJobs[agentId] = {};
				}
				
		    	
		    	initiateJob(agentId, jobId, function() {//cancel the existing job if it is running
		    		currentJobs[agentId][jobId] = job;
		    		currentJobs[agentId].agent=agent;
			    		uploadFiles(agent,job,function(err) {
			    			if (err) {
			    				callback(err);
			    				return;
			    			} else {
			    				setJobTimer(agent, job);
			    				callback(null,jobId+' execution started');
			    			}
			    		});

		    	});
		    	
		    	
//		    } catch (err) {
//		      currentJobs[agentId][jobId].eventSocket.emit('job-cancel',jobId);
//		    	logger.error(err);
//		    	logger.error("problem uploading files");
//		    	cancelJob(agentId, jobId);
//		    	callback(new Error("Unable to start job id: "+jobId));
//		    	return;
//		    }
		    
	    });
	});


	reqPost.write(JSON.stringify(job));
	reqPost.end();
	reqPost.on('error', function(e) {
	    logger.error(e);
	    callback(e);
	});
}

	
function uploadFiles(agent,job, callback) {
 	var agentId = agent._id;
	var jobId=job.id;
	files=job.files;
	
	currentJobs[agentId][jobId].fileProgress = {};
	for (uploadFile in files) {
	    
	    
		var file = files[uploadFile];
		var filepath= fileControl.getFilePath(file.source);
		var fileName = pathlib.basename(filepath);
		currentJobs[agentId][jobId].fileProgress[fileName] = {}
	    currentJobs[agentId][jobId].fileProgress[fileName].fileName=fileName;
		
		var name = filepath.split(pathlib.sep).pop();
		
		
		
		var total = 0;
		try {
			var stats = fs.statSync(filepath);
			var fileSizeInBytes = stats["size"];	
		    logger.info("uploading "+filepath);
			var stream = ss.createStream();
			currentJobs[agentId][jobId].fileProgress[fileName].readStream = fs.createReadStream(filepath,{autoClose: true, highWaterMark: 32 * 1024});
			ss(currentJobs[agentId].fileSocket).emit('agent-upload', stream, {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination });
			currentJobs[agentId][jobId].fileProgress[fileName].readStream.pipe(stream );
		    
		} catch(err) {
			logger.error("unable to start upload for: "+files[uploadFile])
			logger.error(err);
			if (currentJobs[agentId].fileSocket) {
				currentJobs[agentId].fileSocket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
			} else {
				logger.error("unable to notify server of upload failure");
			}
			
        //    currentJobs[agentId][jobId].fileProgress.error=true;
        //    logger.error('requesting cancel of: '+jobId);
		//	currentJobs[agentId].eventSocket.emit('job-cancel',jobId);
		//	cancelJob(agent, job);
		//	callback(new Error("Problem starting file upload"));
		    var badFile = fileControl.getFilePath(files[uploadFile].source);
			callback(new Error("unable to start upload for: "+badFile));
			return;
			break;
		}
		
	}
	callback();
	   
	
}

function uploadComplete(agent, job) {
	var agentId = agent._id;
	var jobId = job.id;
//	logger.debug("closing all file uploads for: "+jobId+" on agent: "+agentId);
//	if (currentJobs[agentId] && currentJobs[agentId][jobId]) {
//	 	currentJobs[agentId][jobId].uploadComplete=true;
//	 	logger.debug("clearing file check.");
//	 	clearTimeout(currentJobs[agentId][jobId].timeout);
//		clearInterval(currentJobs[agentId][jobId].fileCheck);
//	}
	logger.info("upload completed for: "+job.id+" on agent: "+agentId);
}

exports.uploadComplete = uploadComplete;

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
    	
    	if (!currentJobs[agentId][jobId]) {
    		logger.info(jobId+ " not found.");
    		return;
    	}
    	
    	maxMissedHeartbeats =10;
    	agentControl.heartbeat(agent, function(err) {
	    	if (err) {
	    		missedHeartbeats++;
	    		if (missedHeartbeats>= maxMissedHeartbeats) {
			    	logger.info(jobId+" lost contact with agent.");
	    			for (index in currentJobs[agentId][jobId].fileProgress) {
			    		currentJobs[agentId][jobId].fileProgress[index].readStream.close();
			        }
			        //agentEvents.agentSockets[agentId].fileSocket.close();
			        currentJobs[agentId][jobId].error=true;
			       	clearTimeout(currentJobs[agentId][jobId].timeout);
	    			clearInterval(currentJobs[agentId][jobId].fileCheck);
	    			eventEmitter.emit("job-error",job);
	    			cancelJob(agentId, jobId);
	    		}
	    		return;
	    	}
	    	missedHeartbeats=0;
	    	
	    	if (currentJobs[agentId][jobId] && (
	    	!currentJobs[agentId][jobId].uploadComplete || currentJobs[agentId][jobId].uploadComplete != true)) {
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
					        //currentJobs[agentId].fileSocket.close();
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
				        //currentJobs[agentId][jobId].eventSocket.emit('job-cancel',jobId);
		    		}
		    	}
		    	if (currentJobs[agentId][jobId].files != undefined) {
		    		logger.debug(numFilesUploaded+ " of "+job.files.length+" files sent.");
		    	} else {
		    		logger.info("no files defined so none sent.");
		    		//currentJobs[agentId].fileSocket.close();
					currentJobs[agentId][jobId].uploadComplete=true;
	    		}
		    }
    	});
    }, checkInterval);
	
}

exports.getRunningJobsList = function(callback) {
	var runningJobs = {}
	for (agentId in currentJobs) {
		for (jobId in currentJobs[agentId]) {
			if (currentJobs[agentId][jobId] && currentJobs[agentId][jobId].progress >0) {
				runningJobs[agentId] = {};
				runningJobs[agentId][jobId] = {};
				runningJobs[agentId][jobId].progress = currentJobs[agentId][jobId].progress;
				runningJobs[agentId][jobId].status = currentJobs[agentId][jobId].status;
				runningJobs[agentId].agent = currentJobs[agentId].agent;
			}
		}
	}
	if (callback) {
		callback(runningJobs);
	}
}