var async = require('async');
require('shelljs/global');
<<<<<<< HEAD
var http = require("http");


=======
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b

var logger=require('./log-control').logger;

var output = '';
var file_dest = 'files';
<<<<<<< HEAD
url = require("url");


module.exports = { 

executeSync: function(job, eventEmitter) {
	logger.info('executeSync executing:');
    logger.debug(job);
	var workingDir = job.script.working_dir;
	var envVars=job.script.env;
=======


function downloadFiles(server, script) {
	logger.info("getting script install files:");
	
	var file = fs.createWriteStream(dest);
	  var request = http.get(url, function(response) {
	    response.pipe(file);
	    file.on('finish', function() {
	      file.close(cb);
	    });
	    
	  });
	  request.close();
	
};

module.exports = { 

executeSync: function(script,agent,serverInfo, eventEmitter) {
	logger.info('executeSync executing:');
    logger.debug(script);
	var workingDir = script.script.working_dir;
	var envVars=script.script.env;
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
	
	
	
	//execute the commands syncronously
<<<<<<< HEAD
	var commands = job.script.install_commands;
	logger.debug(commands);
	var downloads = job.files;
	
	var numProgressSteps =  commands.length+1;
	var progresStepSize = Math.floor(100/numProgressSteps);
	
	env["working_dir"]=job.working_dir;
	env["download_dir"]=job.download_dir;
	
=======
	var commands = script.script.install_commands;
	logger.debug(commands);
	var downloads = script.script.downloads;
	
	var numProgressSteps =  commands.length+((downloads!=undefined)?downloads.length:0) +1;
	var progresStepSize = Math.floor(100/numProgressSteps);
	
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
	for (envVar in envVars) {
		logger.info(envVar+'='+envVars[envVar]);
		env[envVar] = envVars[envVar];
		
	}
<<<<<<< HEAD
	job.progress+=2;
	job.status="Environment Set";
	eventEmitter.emit('job-update',job);
	
	
	//change to the correct dir
	cd(job.working_dir);

=======
	agent.progress=10;
	agent.message="Environment Set";
	eventEmitter.emit("agent-update",agent);
	
	
	//change to the correct dir
	cd(workingDir);
	agent.progress=10;
	agent.message="Environment Set";
	eventEmitter.emit("agent-update",agent);

	//download the files asynchronously
	// 1st parameter in async.each() is the array of items
	
    if (downloads != undefined && downloads.length >0) {
    	var downloadDir = script.script.download_dir;
		if (downloadDir == undefined) {
			downloadDir = ".";
		};
	    fs.stat(downloadDir, function (err, stat) {
	        if (err) {
	          // file does not exist
	          if (err.errno == 2) {
	            fs.mkdir(downloadDir);
	          }
	        }
	    });
		async.each(downloads,
	
			  // 2nd parameter is the function that each item is passed into
			  function(download, callback) {
				//logger.info("getting script install files:");
				var downloadURL = download;
			    if (download.indexOf("/") === 0 ) {
					downloadURL = "http://"+serverInfo.ip+":"+serverInfo.port+download;
				} 	    
			    var file_name = downloadDir+"/"+url.parse(download).pathname.split('/').pop();
			    logger.info("downloading: "+file_name+" from: "+downloadURL);
				var file = fs.createWriteStream(file_name);
				  var request = http.get(downloadURL, function(response) {
				    response.pipe(file);
				    file.on('finish', function() {
				      file.close();
				      agent.progress+=progresStepSize;
				      agent.message="downloaded "+file_name;
				      eventEmitter.emit("agent-update", agent);
				      callback();
				    });
				    
				  });
				  
				  request.on("error", function(err){
					  logger.error("unable to download: "+download);
				  });
	
				
			
			  },
			  // 3rd parameter is the function call when everything is done
			  function(err){
			    // All tasks are done now
			    logger.info("All files downloaded");
			  }
			);
    }
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
	
	//execute the commands in series
	var execCommands = new Array(commands.length);
	for (index in commands) {
		logger.info("queueing "+commands[index]);
		var command = commands[index];
	    execCommands[index] = function(callback) {
<<<<<<< HEAD
	    	job.progress+=progresStepSize;
		    job.status=command;
		    eventEmitter.emit('job-update',job);
=======
	    	agent.progress+=progresStepSize;
		    agent.message=command;
		    eventEmitter.emit("agent-update", agent);
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
	    	logger.info(this.index+".) "+this.command);
			exec(this.command, {silent:false},function(code, output) {
				  logger.info('Exit code:', code);
				  logger.info('Program output:', output);
				  if (code > 0) {
					  callback(new Error(output));
<<<<<<< HEAD
					  return;
=======
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
				  }
				  
				  callback();
				});
		}.bind( {command: command, index: index});
	}
	async.series(execCommands,function(err) {
		if (err) {
<<<<<<< HEAD
			logger.error('job error' + err);
			job.progress=0;
			job.status=err.syscall+" "+err.code;
			eventEmitter.emit('job-error',job,err.syscall+" "+err.code);
			return;
		}
		job.progress=0;
		job.status=job.id+" complete";
		eventEmitter.emit("job-update", job);
=======
			logger.error('agent error' + err);
			agent.progress=0;
			agent.message=err.syscall+" "+err.code;
			eventEmitter.emit('agent-error',agent,err.syscall+" "+err.code);
			return;
		}
		agent.progress=0;
		agent.message=job.id+" complete";
		eventEmitter.emit("agent-update", agent);
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
        logger.info("done");
    });
	 
	 
}
};
