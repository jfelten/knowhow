var async = require('async');
require('shelljs/global');

var output = ''
var file_dest = 'files';	


function downloadFiles(server, script) {
//	console.log("getting script install files:");
	
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
	console.log('executeSync executing:');
	//console.log(script);
	var workingDir = script.script.working_dir;
	var envVars=script.script.env;
	
	
	//execute the commands syncronously
	var commands = script.script.install_commands;
	//console.log(commands);
	
	for (envVar in envVars) {
		console.log(envVar+'='+envVars[envVar]);
		env[envVar] = envVars[envVar];
		
	}
	
	//change to the correct dir
	cd(workingDir);
	

	var execCommands = new Array(commands.length);
	for (index in commands) {
		console.log("queueing "+commands[index]);
		var command = commands[index];
	    execCommands[index] = function(callback) {
	    	console.log(this.index+".) "+this.command);
			exec(this.command, {silent:false},function(code, output) {
				  console.log('Exit code:', code);
				  console.log('Program output:', output);
				  callback();
				});
		}.bind( {command: command, index: index});
	}
	async.series(execCommands,function(err) {
        console.log("done");
    });
	 
	 
}
}
