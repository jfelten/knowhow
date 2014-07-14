var async = require('async');
require('shelljs/global');

var logger=require('./log-control').logger;

var output = '';
var file_dest = 'files';	


function downloadFiles(server, script) {
//	logger.info("getting script install files:");
	
//	var file = fs.createWriteStream(dest);
//	  var request = http.get(url, function(response) {
//	    response.pipe(file);
//	    file.on('finish', function() {
//	      file.close(cb);
//	    });
//	  });
	
}	

module.exports = { 

executeSync: function(script) {
	logger.info('executeSync executing:');
    logger.debug(script);
	var workingDir = script.script.working_dir;
	var envVars=script.script.env;
	
	
	//execute the commands syncronously
	var commands = script.script.install_commands;
	logger.debug(commands);
	
	for (envVar in envVars) {
		logger.info(envVar+'='+envVars[envVar]);
		env[envVar] = envVars[envVar];
		
	}
	
	//change to the correct dir
	cd(workingDir);
	

	var execCommands = new Array(commands.length);
	for (index in commands) {
		logger.info("queueing "+commands[index]);
		var command = commands[index];
	    execCommands[index] = function(callback) {
	    	logger.info(this.index+".) "+this.command);
			exec(this.command, {silent:false},function(code, output) {
				  logger.info('Exit code:', code);
				  logger.info('Program output:', output);
				  callback();
				});
		}.bind( {command: command, index: index});
	}
	async.series(execCommands,function(err) {
        logger.info("done");
    });
	 
	 
}
};
