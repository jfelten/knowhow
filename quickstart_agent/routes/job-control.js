var commandShell = require('./commandShell');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
exports.eventEmitter = eventEmitter;
var jobQueue = [];
var agentInfo;
var logger=require('./log-control').logger;
var path=require("path");
var ss = require('socket.io-stream');
var mkdirp = require('mkdirp');

//constants
var WORKING_DIR_VAR = "working_dir"

updateJob = function(job) {
	eventEmitter.emit('job-update',job);
	jobQueue[job.id] = job;
	//logger.debug('updated:');
};

initiateJob = function(job) {
	job.fileProgress = {};
	jobQueue[job.id] =job;
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
            return
          }
        }
    });
    job.working_dir = path.resolve(workingDir);
	job.download_dir = path.resolve(downloadDir);
	job.status="starting..";
	logger.debug("job id:"+job.id+" initialized in dir"+job.working_dir);
	eventEmitter.emit('job-update',job);
};

cancelJob = function(job) {
	for (fileUpload in job.files) {
		fileProgress = job.fileProgress[fileUpload];
		if (fileProgress != undefined) {
			fileProgress.error = true;
		}
		
	}
	job.error = true;
	updateJob(job);
}

execute = function(job) {
	initiateJob(job);
	waitForFiles(job, function(err, job) {
		if (err) {
			job.status="Error receiving required files";
			eventEmitter.emit('job-update',job);
			return;
		}
		logger.info("all files received - executing job");
		job.status="All files Received.";
		eventEmitter.emit('job-update',job);
		try {
			commandShell.executeSync(job, eventEmitter);
		}
		catch (err) {
			job.status="Error "+err
			;
			eventEmitter.emit('job-update',job);
		}
	});
	
	
};

waitForFiles = function(job,callback) {
	
	var agent = this.agent;
    job.status = 'receiving files';
    eventEmitter.emit('job-update',job);
    
    //timeout after x seconds
    timeoutms=300000;//default timeout of 5 minutes
    if (job.timeout != undefined) {
    	timeoutms=job.timeout;
    }
    
    var timeout = setTimeout(function() {
    	clearInterval(fileCheck);
    	job.status=(job.id+" required files not within timeout. Aborting...");
    	callback(new Error("file upload timed out."),job);
    }, timeoutms);
    
    var checkInterval = 1000; //1 second
    //wait until all files are receeived
    var fileCheck = setInterval(function() {
    	if (job.error == true) {
    		logger.error(job.id+" has an error. Aborting...");
			clearTimeout(timeout);
			clearInterval(fileCheck);
			callback(new Error("Aborting job"), job);
    	}
    	
    	numFilesUploaded=0;
    	for (index in job.fileProgress) {
    		var uploadFile = job.fileProgress[index];
    		logger.debug(uploadFile);
    		if (uploadFile.uploadComplete == true) {
    		    numFilesUploaded++;
    		    if (numFilesUploaded >= job.files.length) {
    		    	logger.info(job.id+" all files received...");
	    			clearTimeout(timeout);
	    			clearInterval(fileCheck);
	    			callback(undefined, job);
	    		}  		
    		}
    	}
    	logger.debug(numFilesUploaded+ " of "+job.files.length+" files received.");
    }, checkInterval);
};

JobControl = function(io) {

	//logger.info('setting event io to:'+io);
	this.io = io;
	this.eventEmitter=new EventEmitter();
	
	var up = io.of('/upload');

	up.on('connection', function (socket) {
		logger.info('upload request');
		ss(socket).on('agent-upload', function(stream, data) {
		    
		    var jobId = data['jobId'];
			var job = jobQueue[jobId];
				if (job == undefined) {
				socket.emit('Error', {message: 'No active Job with id: '+jobId, jobId: jobId, name: data.name} );
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
			
			var filename = path.resolve(destination+path.sep+data.name);
			
			logger.debug("saving "+filename);
			var size = data['fileSize'];
			job.fileProgress[filename] = {  //Create a new Entry in The files Variable
	            FileSize : size,
	            Data     : "",
	            Uploaded : 0,
	            uploadComplete: false
	        };
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
		        			fs.stat(filename, function (err, stat) {
						        if (!err) {
						        	fs.unlinkSync(filename);
						        }
				        	});
					    }
					}
		        	
		       }
		       try {
			    	logger.info("saving file: "+filename);
			    	stream.pipe(fs.createWriteStream(filename));
			    	fileWatcher = fs.watch(filename);
				    fileWatcher.on('change', function(){
				    	fs.stat(filename, function(err, stat) {
				    		if (err) {
				    			logger.error(err);
				    			//job.fileProgress[filename].uploadComplete=true;
					    		//socket.emit('Error',{message: filename+' error:'+err, name: data.name, jobId: jobId});
					    		//fileWatcher.close();
					    		//cancelJob(job);
					    		return;
				    		}
				    		var fileSizeInBytes = stat["size"];
					    	if(job.fileProgress[filename]['error'] == true) {
					    		job.fileProgress[filename].uploadComplete=true;
					    		socket.emit('End',{message: filename+' upload cancelled', fileName: data.name});
					    	} else if(fileSizeInBytes == job.fileProgress[filename]['FileSize']) {
					    		job.fileProgress[filename].uploadComplete=true;
					    		socket.emit('End',{message: filename+' uploaded', fileName: data.name});
					    	} else {
					    		job.fileProgress[filename]['Uploaded'] = fileSizeInBytes;
				                updateJob(job);
					    	}
					    });
				    	
				    	
				    });
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
		var eventListener = io.of('/job-events');

		eventListener.on('connection', function (socket) {
			logger.info('event listen request');
			
			socket.on('listen', function(stream, data) {
				eventEmitter.on('job-update', function(job) {
					socket.emit('job-update', job);
				});
			});
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