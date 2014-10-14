//require('./testRegisterServer');
fs = require("fs");
var http = require('http');
var querystring = require('querystring');
var logger = require('winston');
var crypto = require('crypto');
require('shelljs/global');

console.log("starting...");


var serverInfo = {
		name: "test",
		host: 'localhost',
		port: 3001,
		cryptoKey: 	'd6F3Efea'
};

agent = {
		"host": "localhost",
		"port": 3000,
		"password": "8cd78d98844b33f6dd44d7ffde0e893a"
}

job = {
		  "id": "weblogic 10.2 install",
		  "user": "weblogic",
		  "download_dir": "./downloads",
		  "files": [],
		  "working_dir": "/tmp/sudotest",
		  "options": {
		    "dontUploadIfFileExists": true,
		    "timeoutms": 10000
		  },
		  "script": {
		    "env": {
		      "MW_HOME": "/opt/weblogic",
		      "WL_HOME": "/opt/weblogic/wlserver",
		      "NM_HOME": "/opt/weblogic/wlserver/common/nodemanager",
		      "JAVA_HOME": "/usr/java/jdk1.7.0_45",
		      "QS_INSTALL_DIR": "downloads",
		      "SETUP_HOME": "/home/weblogic/setup",
		      "QS_LIB_DIR": "/home/weblogic/setup/lib",
		      "QS_CONFIG_DIR": "/home/weblogic/setup/config"
		    },
		    "commands": [
      			"whoami"
		    ]
		  }
		};


var data = {
    	"agent": agent,
    	"job": job
    };
    
function decrypt(text){
	if (serverInfo.cryptoKey) {
		var decipher = crypto.createDecipher('aes-256-cbc',serverInfo.cryptoKey)
		var dec = decipher.update(text,'hex','utf8')
		dec += decipher.final('utf8');
		return dec;
	} else {
		return text;
	}	
}

var desiredUser = "weblogic";
var sudoCMD = 'echo \"'+decrypt(agent.password)+'\" | sudo -S -u '+desiredUser+' ';
exec(sudoCMD+'whoami',{silent:false}); 

var headers = {
    'Content-Type' : 'application/json',
    'Content-Length' : Buffer.byteLength(JSON.stringify(job), 'utf8'),
    'Content-Disposition' : 'form-data; name="script"'
};

console.log('prepared headers');
// the post options
var options = {
    host : 'localhost',
    port : 3000,
    path : '/api/execute',
    method : 'POST',
    headers : headers
};

console.log('Options prepared:');
console.log(options);
console.log('Do the call');

// do the POST call
var reqPost = http.request(options, function(res) {
	console.log("statusCode: ", res.statusCode);
    // uncomment it for header details
	console.log("headers: ", res.headers);

    res.on('data', function(d) {
    	console.log('result:\n');
        console.log(data);
        console.log('\n\nPOST completed');
    });
});


reqPost.write(JSON.stringify(job));
reqPost.end();
reqPost.on('error', function(e) {
    console.log(e);
});	