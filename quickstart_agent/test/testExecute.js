fs = require("fs");
var http = require('http');
var querystring = require('querystring');
var logger = require('winston');
require('./testRegisterServer');

console.log("starting...");


agent = {
		"host": "tb101",
		"port": 3000
}

job = {
		  "id": "weblogic 10.2 install",
		  "download_dir": "./downloads",
		  "user": "weblogic",
		  "files": [
		            "/repo/rawfiles/weblogic/wls1036_dev.zip"
		          ],
		  "script": {
		    "working_dir": "./",
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
		    "install_commands": [
		      "unzip downloads/wls1036.zip",              
		      "echo \"installing from: $QS_INSTALL_DIR\"",
		      "mv $QS_INSTALL_DIR/wl* $MW_HOME",
		      "chmod +x $MW_HOME/configure.sh",
		      "export JAVA_HOME=$JAVA_HOME",
		      "$MW_HOME/configure.sh -silent",
		      "$MW_HOME/wlserver/common/bin/wlst.sh $SETUP_HOME/Lib/qs_weblogic/createDomain.py"
		    ]
		  }
		};


var data = {
    	"agent": agent,
    	"job": job
    };

var headers = {
	    'Content-Type' : 'application/json',
	    'Content-Length' : Buffer.byteLength(JSON.stringify(job) , 'utf8'),
	    'Content-Disposition' : 'form-data; name="script"'
	};

	// the post options
	var options = {
	    host : agent.host,
	    port : agent.port,
	    path : '/api/execute',
	    method : 'POST',
	    headers : headers
	};

	logger.debug('Options prepared:');
	logger.debug(options);
	logger.debug('Do the call');

	// do the POST call
	var reqPost = http.request(options, function(res) {
		logger.debug("statusCode: ", res.statusCode);
	    // uncomment it for header details
		logger.debug("headers: ", res.headers);

	    res.on('data', function(d) {
	    	logger.debug('result:\n');
	        process.stdout.write(d);
	        logger.debug('\n\nPOST completed');
	    });
	});


	reqPost.write(JSON.stringify(job));
	reqPost.end();
	reqPost.on('error', function(e) {
	    logger.error(e);
	});
