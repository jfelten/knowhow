var async = require('async');
require('shelljs/global');
var crypto = require('crypto');

var logger=require('./log-control').logger;

var output = '';
var file_dest = 'files';
url = require("url");
var currentlyRunningJob;


module.exports = { 

cancelRunningJob: function() {
	if (currentlyRunningJob != undefined) {
		currentlyRunningJob.cancelled = true;
	}
}, 

executeSync: function(job, agentInfo, serverInfo, eventEmitter) {


	currentlyRunningJob = job;
	logger.info('executeSync executing: ');
    logger.debug(job);
	var workingDir = job.script.working_dir;
	var envVars=job.script.env;
	
	//change to the correct dir
	cd(job.working_dir);
	
	logger.info("agent.user="+agentInfo.user+" job.user="+job.user);
	var sudoCMD = '';
	if (job.user != agentInfo.user) {
		var decrypt = function(text){
			if (serverInfo.cryptoKey) {
				var decipher = crypto.createDecipher('aes-256-cbc',serverInfo.cryptoKey)
				var dec = decipher.update(text,'hex','utf8')
				dec += decipher.final('utf8');
				return dec;
			} else {
				return text;
			}
		};	
		logger.info("using sudo to run job as: "+job.user);
  		sudoCMD = 'echo \"'+decrypt(agentInfo.password)+'\" | sudo -S -u '+job.user+' ';
  		
  		//make sure all files are read/write executeable by other users
  		execSync('chmod -R a+rwx '+job.working_dir);
	}
	
	
	//execute the commands syncronously

	var commands = job.script.commands;
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

	var progress= progresStepSize;
	job.status="Environment Set";
	eventEmitter.emit('job-update',job);
	
	//execute the commands in series
	var currentProgress =0;
	var execCommands = new Array(commands.length);
	for (index in commands) {
		logger.info("queueing "+commands[index]);
		var command = commands[index];
	    execCommands[index] = function(callback) {
			if (job.error == true) {
				callback(new Error("job error"));
				return;
			} else if (job.cancelled == true) {
				callback(new Error("Job cancelled."));
				return;
			}
	    	var stepNum=(this.index);
	    	progress=Math.floor(stepNum/commands.length*100);
	    	if (progress > currentProgress) {
		    	this.job.status="executing";
		    
		    	eventEmitter.emit('job-update',{id: job.id, status: this.command, progress: progress});
		    	currentProgress=progress;
		    }

	    	logger.info(this.index+".) "+this.command);
			exec(sudoCMD+this.command, {silent:false},function(code, output) {
				  logger.info('Exit code:', code);
				  logger.info('Program output:', output);
				  if (code > 0) {
					  callback(new Error(this.command+": "+output));
					  return;
				  }
				  
				  callback();
				});
		}.bind( {command: command, index: index, job: job});
	}
	
	var progressCheck = setInterval(function() {
		if (job.progress <= currentProgress) {
			job.status="executing";
		    job.progress=job.progress+1;
		    eventEmitter.emit('job-update',{id: job.id, status: job.status, progress: job.progress});
		    currentProgress = job.progress;
		}
	},5000);
	async.series(execCommands,function(err) {
		if (err) {

			logger.error('job error' + err);
			job.progress=0;
			job.status=err.message;
			eventEmitter.emit('job-error',job);
			clearInterval(progressCheck);
			return;
		}
		job.progress=0;
		job.status=job.id+" complete";
		eventEmitter.emit("job-complete", job);
		delete currentlyRunningJob;
		clearInterval(progressCheck);
        logger.info("done");
    });
	 
	 
}
};
