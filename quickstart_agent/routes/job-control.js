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

updateJob = function(job) {
	eventEmitter.emit('job-update',job);
	jobQueue[job.id] = job;
	//logger.debug('updated:');
};

initiateJob = function(job, callback) {
	try {
		logger.info("initializing: "+job.id);
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
		job.status="starting..";
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
	for (fileUpload in job.fileProgress) {
		fileProgress = job.fileProgress[fileUpload];
		if (fileProgress != undefined) {
			fileProgress.error = true;
		}
		
	}
	job.error = true;
	updateJob(job);
	commandShell.cancelRunningJob();
	logger.info('canceling job: '+job.id);
	eventEmitter.emit('job-cancel', job);
	jobQueue[job.id]=undefined;
	
}

execute = function(job) {
	logger.info("executing: "+job.id);
	initiateJob(job, function(err,job) {
		if (err) {
		
			job.status="Error Initializing job";
			cancelJob(job);			
			return;
		}
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
	    var fileCheck = setInterval(function() {
	    
	        var updatedJob = jobQueue[job.id];
	    	if (updatedJob != undefined && (updatedJob.error == true || updatedJob.cancelled == true)) {
	    		logger.error(job.id+" has an error. Aborting...");
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
    		}  
	    	
	    	job.progress=Math.floor((totalUploaded/job.totalFileSize)*100)
            if (job.progress > lastProgress ) {
            	lastProgress=job.progress;
            	updateJob(job);
            	logger.debug("progress: "+totalUploaded+" of "+job.totalFileSize+"  %done:"+job.progress);
            	
            }
    	//logger.debug(numFilesUploaded+ " of "+job.files.length+" files received.");
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
		
		eventEmitter.on('upload-complete', function(job) {
			socket.disconnect();
		});
		eventEmitter.on('file-uploaded', function(jobId, filename) {
			socket.emit('End', {message: 'Filename '+filename+' upload complete for: '+jobId, jobId: jobId,  fileName: filename} );
			
		});
		
		ss(socket).on('agent-upload', {highWaterMark: 32 * 1024}, function(stream, data) {
		    
		    var jobId = data['jobId'];
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
		
	});
	var eventListener = io.of('/job-events');

		eventListener.on('connection', function (socket) {
			logger.info('event listen request');
			
			eventEmitter.on('job-update', function(job) {
				socket.emit('job-update', job);
			});
			
			eventEmitter.on('job-error', function(job) {
				socket.emit('job-error', job);
			});
			
			eventEmitter.on('job-complete', function(job) {
				socket.emit('job-complete', job);
			});
			
			eventEmitter.on('job-cancel', function(job) {
				socket.emit('job-cancel', job.id);
			});
			
			socket.on('job-cancel', function(job) {
				logger.info("cancel requested by server.");
				cancelJob(job);
			});
			
			socket.on('job-listen', function(jobId) {
				logger.debug("job event listen request");
				var job = jobQueue[jobId];
				if (job == undefined || job.error==true || job.cancelled==true) {
					logger.debug("invalid job: "+jobId+" stopping listener");
					socket.emit('job-cancel', jobId);
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