var async = require('async');
require('shelljs/global');


var logger=require('./log-control').logger;

var output = '';
var file_dest = 'files';
url = require("url");


module.exports = { 

executeSync: function(job, eventEmitter) {
	logger.info('executeSync executing:');
    logger.debug(job);
	var workingDir = job.script.working_dir;
	var envVars=job.script.env;

	
	
	
	//execute the commands syncronously

	var commands = job.script.install_commands;
	logger.debug(commands);
	var downloads = job.files;
	
	var numProgressSteps =  commands.length+1;
	var progresStepSize = Math.floor(100/numProgressSteps);
	
	env["working_dir"]=job.working_dir;
	env["download_dir"]=job.download_dir;
	

	for (envVar in envVars) {
		logger.info(envVar+'='+envVars[envVar]);
		env[envVar] = envVars[envVar];
		
	}

	job.progress+=2;
	job.status="Environment Set";
	eventEmitter.emit('job-update',job);
	
	
	//change to the correct dir
	cd(job.working_dir);

	
	//execute the commands in series
	var execCommands = new Array(commands.length);
	for (index in commands) {
		logger.info("queueing "+commands[index]);
		var command = commands[index];
	    execCommands[index] = function(callback) {

	    	job.progress+=progresStepSize;
		    job.status=command;
		    eventEmitter.emit('job-update',job);

	    	logger.info(this.index+".) "+this.command);
			exec(this.command, {silent:false},function(code, output) {
				  logger.info('Exit code:', code);
				  logger.info('Program output:', output);
				  if (code > 0) {
					  callback(new Error(output));
					  return;
				  }
				  
				  callback();
				});
		}.bind( {command: command, index: index});
	}
	async.series(execCommands,function(err) {
		if (err) {

			logger.error('job error' + err);
			job.progress=0;
			job.status=err.syscall+" "+err.code;
			eventEmitter.emit('job-error',job,err.syscall+" "+err.code);
			return;
		}
		job.progress=0;
		job.status=job.id+" complete";
		eventEmitter.emit("job-update", job);
        logger.info("done");
    });
	 
	 
}
};
