var commandShell = require('./commandShell');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
exports.eventEmitter = eventEmitter;
var jobQueue = [];
var agentInfo;
var logger=require('./log-control').logger;
var pathlib=require("path");
var ss = require('socket.io-stream');
var mkdirp = require('mkdirp');

//constants
var WORKING_DIR_VAR = "working_dir"

exports.jobQueue=jobQueue;
var jobInProgress = undefined;

completeJob = function(job) {
	if (job != undefined) {
		logger.info('completed job: '+job.id);
		delete jobQueue[job.id];
		jobInProgress = undefined;
		eventEmitter.emit('upload-complete',job);
	}

}

updateJob = function(job) {
	eventEmitter.emit('job-update',job);
	jobQueue[job.id] = job;
	//logger.debug('updated:');
};

initiateJob = function(job, callback) {
		

	if (jobInProgress) {
		logger.debug("job already in progress");
		callback(new Error("job already exists"));
		return;
	}
	try {
		logger.info("initializing: "+job.id);
		jobInProgress = job.id;
		job.fileProgress = {};
		jobQueue[job.id] =job;
		job.progress=0;
		job.totalFileSize=0;
		//check for relative paths and substitute working directory path
		var downloadDir = job.download_dir;
		if (downloadDir == undefined) {
			downloadDir = ".";
		};
		var workingDir = job.working_dir;
		var workingDirVar="${"+WORKING_DIR_VAR+"}";
		if (downloadDir.indexOf(workingDirVar) > -1){
			downloadDir=downloadDir.replace( workingDirVar,workingDir);
		}
		workingDirVar="$"+WORKING_DIR_VAR;
		if (downloadDir.indexOf(workingDirVar) > -1){
			downloadDir=downloadDir.replace( workingDirVar,workingDir);
		}
	    fs.stat(downloadDir, function (err, stat) {
	        if (err) {
	          // file does not exist
	          if (err.errno == 2) {
	            fs.mkdir(downloadDir);
	          }
	        }
	    });
	    job.working_dir = pathlib.resolve(workingDir);
		job.download_dir = pathlib.resolve(downloadDir);
		job.status="initialized";
		jobQueue[job.id]=job;
		logger.debug("job id:"+job.id+" initialized using working directory: "+job.working_dir);
		eventEmitter.emit('job-update',job);
		callback(undefined, job);
	} catch (err) {
		logger.error("unable to initialize job: "+job.id);
		logger.error(err);
		callback(err, job)
		
	}
};

cancelJob = function(job) {
	if (jobInProgress) {
		delete jobQueue[jobInProgress];
	}
	jobInProgress = undefined;
	logger.debug("starting cancel for: "+job.id);
	if (job != undefined) {
		if (job.fileProgress != undefined) {
			for (fileUpload in job.fileProgress) {
				fileProgress = job.fileProgress[fileUpload];
				if (fileProgress != undefined) {
					fileProgress.error = true;
				}
			}	
		}
		job.error = true;
		job.progress=0;
		updateJob(job);
		commandShell.cancelRunningJob();
		logger.info('canceling job: '+job.id);
		eventEmitter.emit('job-cancel', job);
		eventEmitter.emit('upload-complete',job);
		jobQueue[job.id] = undefined;
		jobInProgress = undefined;
	}
	
}

exports.cancelJob=cancelJob;

execute = function(job,callback) {
	logger.info("executing: "+job.id);
	initiateJob(job, function(err,job) {
		if (err) {
			logger.error(err);
		    if (job) {
				job.status="Error Initializing job";
				cancelJob(job);
				callback(err,job);
			} else {
				callback(err,{});
			}
						
			return;
		}
		callback(undefined,job);
		waitForFiles(job, function(err, job) {
			if (err) {
				job.status="Error receiving required files";
				cancelJob(job);	
				return;
			}
			logger.info("all files received - executing job");
			job.status="All files Received.";
			eventEmitter.emit('job-update',job);
			try {
				commandShell.executeSync(job, eventEmitter);
			}
			catch (err) {
				job.status="Error "+err;
				cancelJob(job);	
			}
		});
	
	});
	
	
	
};

waitForFiles = function(job,callback) {
	
	var agent = this.agent;
    job.status = 'receiving files';
    eventEmitter.emit('job-update',job);
    
    //timeout after x seconds
    timeoutms=600000;//default timeout of 10 minutes
    if (job.options.timeoutms != undefined) {
    	timeoutms=job.options.timeoutms;
    	logger.info("setting job timeout to: "+timeoutms);
    }
    
    if (job.files.length >0 ) {
	    var timeout = setTimeout(function() {
	    	logger.info("job: "+job.id+" file upload timed out.");
	    	clearInterval(fileCheck);
	    	job.status=(job.id+" required files not within timeout. Aborting...");
	    	eventEmitter.emit('upload-complete',job);
	    	callback(new Error("file upload timed out."),job);
	    }, timeoutms);
	    
	    var checkInterval = 5000; //5 second
	    //wait until all files are received
	    var lastProgress=0;
	    var numChecks = 0;
	    var fileCheck = setInterval(function() {
	    
	        var updatedJob = jobQueue[job.id];
	    	if (updatedJob != undefined && (updatedJob.error == true || updatedJob.cancelled == true)) {
	    		logger.error(job.id+" has an error. Aborting...");
				clearTimeout(timeout);
				clearInterval(fileCheck);
				callback(new Error("Aborting job"), job);
	    	}
	    	numChecks++;
	    	if ( (job.status == "initialized" || job.status =="initializing")  && numChecks > 6) {
	    		logger.error(job.id+" upload failed to start. Aborting...");
	    		clearTimeout(timeout);
				clearInterval(fileCheck);
				callback(new Error("Aborting job"), job);
	    		
	    	}
	    	
	    	var numFilesUploaded=0;
	    	
	    	var totalUploaded=0;
	    	for (filename in job.fileProgress) {
	    		if (job.fileProgress[filename].uploadComplete != true) {
	    		    var stat= fs.statSync(filename); 
		    		var fileSizeInBytes = stat["size"];
		    		//logger.debug(filename+' size='+fileSizeInBytes+' correct size='+job.fileProgress[filename]['FileSize']);
		    		totalUploaded+=fileSizeInBytes;
		    		job.fileProgress[filename]['Uploaded'] = fileSizeInBytes;
			    	if(job.fileProgress[filename]['error'] == true) {
			    		job.fileProgress[filename].uploadComplete=true;
			    		eventEmitter.emit('upload-complete',job);
			    		updateJob(job);
			    	} else if(fileSizeInBytes === job.fileProgress[filename]['FileSize']) {
			    		job.fileProgress[filename].uploadComplete=true;
			    		job.fileProgress[filename].fileWriter.close();
			    		eventEmitter.emit('file-uploaded',job.id, job.fileProgress[filename].name);
			    		updateJob(job);
			    	} 

	    		    		
	    		} else {
	    			totalUploaded+=job.fileProgress[filename]['FileSize']
	    			numFilesUploaded++;
	    		}
	    		
	    		
	    	}
	    	
	    	if (numFilesUploaded >= job.files.length) {
		    	logger.info(job.id+" all files received...");
    			clearTimeout(timeout);
    			clearInterval(fileCheck);
    			eventEmitter.emit('upload-complete',job);
    			callback(undefined, job);
    		}  else if ((jobQueue[job.id] && jobQueue[job.id].disconnected == true )|| !jobInProgress) {
    			logger.info(job.id+" did not receive all files. - Aborting...");
    			clearTimeout(timeout);
    			clearInterval(fileCheck);
    			//eventEmitter.emit('upload-complete',job);
    			callback(new Error("server disconnected before upload complete"), job);
    		}
	    	
	    	job.progress=Math.floor((totalUploaded/job.totalFileSize)*100)
            if (job.progress > lastProgress ) {
            	lastProgress=job.progress;
            	updateJob(job);
            	logger.debug("progress: "+totalUploaded+" of "+job.totalFileSize+"  %done:"+job.progress);
            	
            }
    		logger.debug(numFilesUploaded+ " of "+job.files.length+" files received.");
	    }, checkInterval);
	}
    
    
};

JobControl = function(io) {

	//logger.info('setting event io to:'+io);
	this.io = io;
	this.eventEmitter=new EventEmitter();
	
	var up = io.of('/upload');

	up.on('connection', function (socket) {
		logger.info('upload request');
		var jobId = '';
		eventEmitter.on('upload-complete', function(job) {
			logger.debug("sending upload complete to server");
			socket.emit('End', job );
			
		});
		eventEmitter.on('file-uploaded', function(jobId, filename) {
						
		});
		
		ss(socket).on('agent-upload', {highWaterMark: 32 * 1024}, function(stream, data) {
		    
		    jobId = data['jobId'];
			var job = jobQueue[jobId];
			var lastProgress=0;
			if (job == undefined) {
				socket.emit('Error', {message: 'No active Job with id: '+jobId, jobId: jobId, name: data.name} );
				eventEmitter.emit('job-error',job);
				return;
			} else if (job.error == true || job.cancelled == true) {
				socket.emit('Error', {message: 'Invalid Job with id: '+jobId, jobId: jobId, name: data.name} );
				logger.
				eventEmitter.emit('job-error',job);
				return;
			}
			var destination = data['destination']
			var workingDirVar="${"+WORKING_DIR_VAR+"}";
			if (destination.indexOf(workingDirVar) > -1){
				destination=destination.replace( workingDirVar,job.working_dir);
			}
			workingDirVar="$"+WORKING_DIR_VAR;
			if (destination.indexOf(workingDirVar) > -1){
				destination=destination.replace( workingDirVar,job.working_dir);
			}
			
			var filename = pathlib.resolve(destination+pathlib.sep+data.name);
			
			logger.debug("saving "+filename);
			var size = data['fileSize'];
			job.totalFileSize+=size
			job.totalReceived=0;
			job.fileProgress[filename] = {  //Create a new Entry in The files Variable
	            FileSize : size,
	            Data     : "",
	            Uploaded : 0,
	            uploadComplete: false,
	            name: data.name
	        };
	        job.status="receiving files."
	        job.progress=(job.progress)+1;
	        updateJob(job);
			//remove the file if it already exists
			fs.stat(destination, function (err, stat) {
		       if (err) {
		         logger.error(err);
		          // file does not exist
		          if (err.errno == 2 || err.errno == 34) {
		        		logger.info("download dir does not exist - creating dir: "+destination);
			        	mkdirp.sync(destination, function (err) {
		            	  if (err) {
		        		    logger.error(err);
		        		  } else {
		        		    logger.info('Directory ' + directory + ' created.');
		        		  }
			            
			            });
		          } 
		        } else {
		            logger.info('path exists');
		        	if (fs.existsSync(filename)) {
		        	    logger.debug(filename+' already exists dontUpload='+job.options.dontUploadIfFileExist);
		        		if (job.options.dontUploadIfFileExists == true) {
		        			job.fileProgress[filename].uploadComplete=true;
		        			socket.emit('End', {message: 'Filename '+filename+' already exists and dontUploadIfFileExists is true for: '+jobId, jobId: jobId,  fileName: data.name} );
		        			return;
		        		} else {
		        			fs.unlinkSync(filename);
					    }
					}
		        	
		       }
		       try {
			    	logger.info("saving file: "+filename);
			    	job.fileProgress[filename].fileWriter = fs.createWriteStream(filename);
			    	stream.pipe(job.fileProgress[filename].fileWriter);

			    } catch(err) {
			    	logger.error("cannot save: "+filename );
			    	logger.error(err);
			    	socket.emit('Error', {message: 'Invalid file: '+filename, jobId: jobId, name: data.name} );
			    }
		       
			});
			
			socket.on('client-upload-error', function(data) {
			    var jobId = data['jobId'];
				logger.error('Problem uploading: '+data.name+' for job: '+jobId);
				logger.error('Cancelling job: '+jobId);
				var job = jobQueue[jobId];
				if (job == undefined) {
					socket.emit('Error', {message: 'No active Job with id: '+jobId} );
					return;
				}
				cancelJob(job);
				socket.emit('End',{message: 'job cancelled: ',jobId: jobId, fileName: data.name});
			});
		   
		  });
		socket.on('disconnect', function(err) {
			logger.debug("upload connection ended.");
			if (jobInProgress) {
				jobQueue[jobInProgress].disconnected = true;
			}
				
		});
		
	});
	
	

};

//var io = require('socket.io').listen(server)
JobControl.prototype.initiateJob  = initiateJob ;
JobControl.prototype.execute = execute;
JobControl.prototype.eventEmitter = eventEmitter;
JobControl.prototype.registerServer = function registerAgent(server) {
	  logger.info(server);
	  this.serverInfo=server;
	};
JobControl.prototype.jobQueue = jobQueue;