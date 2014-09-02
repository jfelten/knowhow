
var logger=require('./log-control').logger;
var async = require('async');

var http = require('http');
var io =  require('socket.io-client');
var fileControl = require('../routes/file-control');
var ss = require('socket.io-stream');
//deliver the agent files

var pathlib = require('path');

var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();

var currentJobs = {};


cancelJob = function(jobId) {
	if (currentJobs[jobId] != undefined) {
		if (currentJobs[jobId].fileSocket != undefined) {
			currentJobs[jobId].fileSocket.close();
		}
		if (currentJobs[jobId].eventSocket != undefined) {
			currentJobs[jobId].eventSocket.close();
		}
		for (uploadFile in currentJobs[job.id].fileProgress) {
			if (currentJobs[job.id].fileProgress[uploadFile].readStream != null) {
				currentJobs[job.id].fileProgress[uploadFile].readStream.close();
			}
	    }
		clearTimeout(currentJobs[jobId].timeout);
	    clearInterval(currentJobs[jobId].fileCheck);
	    delete currentJobs[jobId];
	}
	 
    eventEmitter.emit('job-cancel',jobId);
}

exports.cancelJob = cancelJob;

completeJob = function(jobId) {
	currentJobs[jobId].fileSocket.close();
	currentJobs[jobId].eventSocket.close();
	for (uploadFile in currentJobs[job.id].fileProgress) {
		currentJobs[job.id].fileProgress[uploadFile].readStream.close();
    }
	clearTimeout(currentJobs[jobId].timeout);
    clearInterval(currentJobs[jobId].fileCheck);
    delete currentJobs[jobId];
    eventEmitter.emit('job-complete',job);
}


exports.executeJob = function(agent,job,callback) {

	var jobId = job.id;
	if (currentJobs[job.id] != undefined && currentJobs[job.id].progress >0)  {
		logger.error(job.id+" is already running");
		return;
	}

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
		logger.debug("headers: ", res.headers);

		 

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
	        eventEmitter.emit('job-update',job);
	        
			
		    //do the work
		    try {
		    	currentJobs[jobId] = job;
		    	listenForJobEvents(jobId, function() {
		    		uploadFiles(agent,job,function(err) {
		    			if (err) {
		    				callback(new Error("Problem starting upload for job id: "+jobId));
		    				return;
		    			}
		    			setJobTimer(jobId);
		    		});
		    		
		    	});
		    	
		    } catch (err) {
		    //  currentJobs[jobId].eventSocket.emit('job-cancel',jobId);
		    //	logger.error(err);
		    //	logger.error("problem uploading files");
		    //	cancelJob(jobId);
		    	callback(new Error("Unable to start job id: "+jobId));
		    	return;
		    }
		    callback(null,jobId+' execution started');
	    });
	});


	reqPost.write(JSON.stringify(job));
	reqPost.end();
	reqPost.on('error', function(e) {
	    logger.error(e);
	    
	});
}

function listenForJobEvents(jobId, callback) {
	currentJobs[jobId].eventSocket = require('socket.io-client')('http://'+agent.host+':'+agent.port+'/job-events');
    var listening = false;
    currentJobs[jobId].eventSocket.on('connect', function() { 
    
    	currentJobs[jobId].eventSocket.on('job-update', function(job){
			//logger.debug("job update");
			logger.debug(job.progress+" "+job.status);
			eventEmitter.emit('job-update',job);
		});
		currentJobs[jobId].eventSocket.on('job-complete', function(job){
			logger.info('Completed Job: '+job.id);
			completeJob(jobId);
			eventEmitter.emit('job-complete',job);
		});
		currentJobs[jobId].eventSocket.on('job-error', function(job){
			logger.info('Stopping Job: '+job.id+ ' due to error.');
			currentJobs[jobId].eventSocket.emit('job-cancel',jobId);
		});
		currentJobs[jobId].eventSocket.on('job-cancel', function(jobId){
			logger.info('job: '+jobId+ ' cancelled.');
			cancelJob(jobId);
		});
    	if (listening == false) {
    	 	logger.info('listening for events from job: '+job.id);
    	 	currentJobs[jobId].eventSocket.emit('job-listen', job.id);
    	 	listening=true;
    	 	callback();
    	}
    	 
    });
   
	

}
	
function uploadFiles(agent,job, callback) {

	jobId=job.id;
	files=job.files;
	var socket;
	try {
		currentJobs[job.id].fileSocket = require('socket.io-client')('http://'+agent.host+':'+agent.port+'/upload');
	} catch(err) {
		throw err
		return;
	} 
	currentJobs[job.id].fileSocket.on('connect' ,function () {
		currentJobs[job.id].fileSocket.on('End' ,function (data) {

	      logger.info("done uploading: "+data.fileName+" for job: "+data.jobId);
	      logger.info(data.message);
	      currentJobs[jobId].fileProgress[data.fileName].uploadComplete=true;
		      
	    });
		currentJobs[job.id].fileSocket.on ('Error', function(data) {
	    	logger.error("socket error: "+data.message);
	        currentJobs[job.id].socket.emit('client-upload-error', {name: data.fileName, jobId: data.jobId} );
	        currentJobs[jobId].eventSocket.emit('job-cancel',jobId);
		});
		currentJobs[job.id].fileProgress = {};
		for (uploadFile in files) {
		    
		    
			var file = files[uploadFile];
			var filepath= fileControl.getFilePath(file.source);
			var fileName = pathlib.basename(filepath);
			currentJobs[job.id].fileProgress[fileName] = {}
		    currentJobs[job.id].fileProgress[fileName].fileName=fileName;
			
			var name = filepath.split(pathlib.sep).pop();
			
			
			
			var total = 0;
			try {
				var stats = fs.statSync(filepath);
				var fileSizeInBytes = stats["size"];	
			    logger.info("uploading "+filepath);
				var stream = ss.createStream();
				currentJobs[job.id].fileProgress[fileName].readStream = fs.createReadStream(filepath,{autoClose: true, highWaterMark: 32 * 1024});
				ss(currentJobs[job.id].fileSocket).emit('agent-upload', stream, {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination });
				currentJobs[job.id].fileProgress[fileName].readStream.pipe(stream );
			    
			} catch(err) {
				logger.error(err);
				currentJobs[job.id].fileSocket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
	            currentJobs[job.id].fileProgress.error=true;
	            logger.error('requesting cancel of: '+jobId);
				currentJobs[jobId].eventSocket.emit('job-cancel',jobId);
				cancelJob(jobId);
				callback(new Error("Problem starting file upload"));
				return;
				break;
			}
			
		}
		callback();
	});    
	
}

function setJobTimer(jobId) {
	//wait and make sure all files get uploaded
	//close all sockets when done.
	timeoutms=300000;//default timeout of 5 minutes
    if (job.options != undefined && job.options.timeoutms != undefined) {
    	timeoutms=job.options.timeoutms;
    }
    
   currentJobs[jobId].timeout = setTimeout(function() {
    	clearInterval(currentJobs[jobId].fileCheck);
    	currentJobs[jobId].status=("Timeout - job cancelled");
    	logger.error("job timed out for: "+jobId);
        currentJobs[jobId].eventSocket.emit('job-cancel',jobId);
    }, timeoutms);
    
    var checkInterval = 2000; //2 seconds
    //wait until all files are receeived
    currentJobs[jobId].fileCheck = setInterval(function() {
    	
    	
    	if (currentJobs[jobId].uploadComplete != true) {
    		numFilesUploaded=0;
	    	for (index in currentJobs[jobId].fileProgress) {
	    		var uploadFile = currentJobs[jobId].fileProgress[index];
	    		if (uploadFile.uploadComplete == true) {
	    		    numFilesUploaded++;
	    		    if (numFilesUploaded >= job.files.length) {
	    		    	logger.info(jobId+" all files sent...");
		    			for (index in currentJobs[jobId].fileProgress) {
				    		currentJobs[jobId].fileProgress[index].readStream.close();
				        }
				        currentJobs[jobId].fileSocket.close();
				        currentJobs[jobId].uploadComplete=true;
				       	clearTimeout(currentJobs[jobId].timeout);
		    			clearInterval(currentJobs[jobId].fileCheck);
		    		}  		
	    		} else if (uploadFile.error == true) {
	    			logger.error(jobId+" error aborting upload.");
	    			uploadFile.socket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );	
	        		for (index in currentJobs[jobId].fileProgress) {
			    		fileProgress[index].readStream.close();
			    		socket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
			        }
			        currentJobs[jobId].eventSocket.emit('job-cancel',jobId);
	    		}
	    	}
	    	if (currentJobs[jobId].files != undefined) {
	    		//logger.debug(numFilesUploaded+ " of "+job.files.length+" files sent.");
	    	} else {
	    		logger.info("no files defined so none sent.");
	    		currentJobs[jobId].fileSocket.close();
				currentJobs[jobId].uploadComplete=true;
    		}
	    }
    	
    }, checkInterval);
	
	
}