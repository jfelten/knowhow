var async = require('async');
var net = require('net');
var $s = require('./jsString.js');
var fs = require('fs');
var weblogic_install_file = __dirname + '/JSON/qs_weblogic_10.2_install.json';
var environment_file = __dirname + '/JSON/tb1_environment.json';

var weblogicInstall = JSON.parse(fs.readFileSync( weblogic_install_file), 'utf8');
var environmentData = JSON.parse(fs.readFileSync( environment_file), 'utf8');


function executeOnMachine(server, port, command) {
	var client = net.connect({port: port, host: server},
    	function() { //'connect' listener
  		console.log('client connected');

  		client.write(command);
	});
	client.on('data', function(data) {
  		console.log(data.toString());
  		client.end();
	});
	client.on('end', function() {
  		console.log('client disconnected');
	});
}
	

var agentPort = 8124


var ENV_VARS = new Array();
ENV_VARS[0] = "MW_HOME: /opt/weblogic";
ENV_VARS[1] = "JAVA_HOME: /usr/java/jdk1.7.0_45";
ENV_VARS[2] = "QS_INSTALL_DIR: /home/weblogic";

var ENV_JSON = "";//"{env:";
for (var i=0; i < ENV_VARS.lengh; i++) {
	if (i <ENV_VARS.length-1) {
		ENV_JSON = ENV_JSON+ENV_VARS[i]+",";
	} else {
		ENV_JSON = ENV_JSON+ENV_VARS[i];
	}
	
}
//ENV_JSON = ENV_JSON+"}";

var host = "tb104"
	
//console.log(stringTools.$s('installing weblogic using: JAVA_HOME: $JAVA_HOME MW_HOME:$MW_HOME'))


//rm -f ${QS_WEBLOGIC_ENV_FILE}

//move the install files to MW_HOME
var commands = new Array()
commands[0] = "mv $QS_INSTALL_DIR/wl* $MW_HOME";

//execute the installer
commands[1] = "chmod +x $MW_HOME/configure.sh";
commands[2] = "export JAVA_HOME=$JAVA_HOME";	
commands[3] = "$MW_HOME/configure.sh -silent";

var workingDir = "/opt/weblogic";

//var ev = new evaluator();
for(var i =0; i<commands.length; i++) {
	
	console.log("command:"+commands[i]);
	executeOnMachine(host,agentPort,commands[i]+"^"+ENV_JSON+"^"+workingDir);
}

