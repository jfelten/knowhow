var async = require('async');
require('shelljs/global');

var logger=require('./log-control').logger;

var output = '';
var file_dest = 'files';


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
	
	
	
	//execute the commands syncronously
	var commands = script.script.install_commands;
	logger.debug(commands);
	var downloads = script.script.downloads;
	
	var numProgressSteps =  commands.length+((downloads!=undefined)?downloads.length:0) +1;
	var progresStepSize = Math.floor(100/numProgressSteps);
	
	for (envVar in envVars) {
		logger.info(envVar+'='+envVars[envVar]);
		env[envVar] = envVars[envVar];
		
	}
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
	
	//execute the commands in series
	var execCommands = new Array(commands.length);
	for (index in commands) {
		logger.info("queueing "+commands[index]);
		var command = commands[index];
	    execCommands[index] = function(callback) {
	    	agent.progress+=progresStepSize;
		    agent.message=command;
		    eventEmitter.emit("agent-update", agent);
	    	logger.info(this.index+".) "+this.command);
			exec(this.command, {silent:false},function(code, output) {
				  logger.info('Exit code:', code);
				  logger.info('Program output:', output);
				  if (code > 0) {
					  callback(new Error(output));
				  }
				  
				  callback();
				});
		}.bind( {command: command, index: index});
	}
	async.series(execCommands,function(err) {
		if (err) {
			logger.error('agent error' + err);
			agent.progress=0;
			agent.message=err.syscall+" "+err.code;
			eventEmitter.emit('agent-error',agent,err.syscall+" "+err.code);
			return;
		}
		agent.progress=0;
		agent.message=job.id+" complete";
		eventEmitter.emit("agent-update", agent);
        logger.info("done");
    });
	 
	 
}
};
