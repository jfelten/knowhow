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
	    var envVarValue = envVars[envVar];
	    //replace env_var references in values
	    replaceVar = function(regEx,varName) {
		    var iteration=0;
			while( res = regEx.exec(env[variable]) ){
				 for (i=0; i < res.length; i++) {
			        var replaceVal = res[i];
			    	var value = env[replaceVal.replace('\${','').replace('}','')];
			    	env[varName]=env[varName].replace(replaceVal,value);
			      }
			      if (regEx.exec(env[variable])) {
			      	replaceVar(regEx,varName);
			      }
			}
		}
		
		var dollarRE = /\$\w+/g
		var dollarBracketRE = /\${\w*}/g
		for (variable in env) {
			replaceVar(dollarRE,variable);
			replaceVar(dollarBracketRE,variable);
			console.log(variable+'='+env[variable])
		}
//		var workingDirVar="${"+WORKING_DIR_VAR+"}";
//		if (downloadDir.indexOf(workingDirVar) > -1){
//			downloadDir=downloadDir.replace( workingDirVar,workingDir);
//		}
//		workingDirVar="$"+WORKING_DIR_VAR;
//		if (downloadDir.indexOf(workingDirVar) > -1){
//			downloadDir=downloadDir.replace( workingDirVar,workingDir);
//		}
//	    fs.stat(downloadDir, function (err, stat) {
//	        if (err) {
	          // file does not exist
//	          if (err.errno == 2) {
//	            fs.mkdir(downloadDir);
//	            return
//	          }
//	        }
//	    });
	
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
			if (job.error == true) {
				callback(new Error("job error"));
				return;
			}
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
