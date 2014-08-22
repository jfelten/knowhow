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
    job.wworking_dir = path.resolve(workingDir);
	job.download_dir = path.resolve(downloadDir);
	job.status="starting..";
	
	eventEmitter.emit('job-update',job);
};

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
    	job.status=("required files not received.");
    	callback(new Error("file upload timed out."),job);
    }, timeoutms);
    
    var checkInterval = 1000; //1 second
    //wait until all files are receeived
    var fileCheck = setInterval(function() {
    	logger.debug("checking upload prgogress");
    	for (index in job.fileProgress) {
    		var uploadFile = job.fileProgress[index];
    		logger.debug(uploadFile);
    		if (uploadFile.uploadComplete == true) {
    			clearTimeout(timeout);
    			clearInterval(fileCheck);
    			callback(undefined, job);
    		}
    	}
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
				socket.emit('Error', {message: 'No active Job with id: '+jobId} );
				return;
			}
			var filename = path.resolve(job.download_dir+path.sep+data.name);
			logger.debug("saving "+filename);
			var size = data['fileSize'];
			job.fileProgress[filename] = {  //Create a new Entry in The files Variable
	            FileSize : size,
	            Data     : "",
	            Uploaded : 0,
	            uploadComplete: false
	        };
			//remove the file if it already exists
			fs.stat(job.download_dir, function (err, stat) {
		       if (err) {
		         logger.error(err);
		          // file does not exist
		          if (err.errno == 2 || err.errno == 34) {
		        	logger.info("download dir does not exist - creating dir: "+job.download_dir);
		        	mkdirp.sync(job.download_dir, function (err) {
	            	  if (err) {
	        		    logger.error(err);
	        		  } else {
	        		    logger.info('Directory ' + directory + ' created.');
	        		  }
		            
		            });
		        } else {
		        	fs.stat(filename, function (err, stat) {
				        if (!err) {
				        	fs.unlinkSync(filename);
				        }
		        	});
		        }
		       }
		       try {
			    	logger.info("saving file: "+filename);
			    	stream.pipe(fs.createWriteStream(filename));
			    	fileWatcher = fs.watch(filename);
				    fileWatcher.on('change', function(){
				    	var stats = fs.statSync(filename);
				    	var fileSizeInBytes = stats["size"];
				    	if(fileSizeInBytes == job.fileProgress[filename]['FileSize']) {
				    		job.fileProgress[filename].uploadComplete=true;
				    	} else {
				    		job.fileProgress[filename]['Uploaded'] = fileSizeInBytes;
			                updateJob(job);
				    	}
				    	
				    });
			    } catch(err) {
			    	logger.error(err);
			    	socket.emit('Error', {message: 'Invalid file: '+filename} );
			    }
		       
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