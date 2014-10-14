var https = require('http');
var querystring = require('querystring');
var fs = require('fs');
var crypto = require('crypto');


console.log("starting...");

agent = {
		"host": "localhost",
		"port": 3000,
		"password": "8cd78d98844b33f6dd44d7ffde0e893a"
}

var serverInfo = {
		name: "test",
		host: 'localhost',
		port: 3001,
		cryptoKey: 	'd6F3Efea'
};

function encrypt(text){
	if (serverInfo.cryptoKey) {
		var cipher = crypto.createCipher('aes-256-cbc',serverInfo.cryptoKey)
		var crypted = cipher.update(text,'utf8','hex')
		crypted += cipher.final('hex');
		return crypted;
	} else {
		return text;
	}
}

var registerServer = function() {
	// prepare the header
	var headers = {
	    'Content-Type' : 'application/json',
	    'Content-Length' : Buffer.byteLength(JSON.stringify(serverInfo) , 'utf8'),
	    'Content-Disposition' : 'form-data; name="serverInfo"'
	};
	
	// the post options
	var options = {
	    host : 'localhost',
	    port : 3000,
	    path : '/api/registerServer',
	    method : 'POST',
	    headers : headers
	};
	
	console.info('Options prepared:');
	//console.info(options);
	console.info('Do the call');
	
	// do the POST call
	var reqPost = https.request(options, function(res) {
	    console.log("statusCode: ", res.statusCode);
	    // uncomment it for header details
	  //console.log("headers: ", res.headers);
	
	    res.on('data', function(d) {
	    	console.log("registered="+d.registered);
	    	if (JSON.parse(d).registered) {
	    		console.log('server registration complete');
	    	} else {
	    		console.log("registration failed.");
	    	}
	        console.info('result:\n');
	        process.stdout.write(d);
	        console.info('\n\nPOST completed');
	    });
	});
	
	// write the json data
	var post_data = querystring.stringify(serverInfo);
	
	reqPost.write(JSON.stringify(serverInfo));
	reqPost.end();
	reqPost.on('error', function(e) {
	    console.error(e);
	});
}

var updateAgentInfoOnAgent = function(agentInfo) {
	console.log('updating agentInfo');
	// prepare the header
	var headers = {
	    'Content-Type' : 'application/json',
	    'Content-Length' : Buffer.byteLength(JSON.stringify(agentInfo) , 'utf8'),
	    'Content-Disposition' : 'form-data; name="agent"'
	};
	
	// the post options
	var options = {
	    host : agentInfo.host,
	    port : agentInfo.port,
	    path : '/api/updateAgentInfo',
	    method : 'POST',
	    headers : headers
	};
	
	console.info('Options prepared:');
	//console.info(options);
	console.info('Do the call');
	
	// do the POST call
	var reqPost = https.request(options, function(res) {
	    console.log("statusCode: ", res.statusCode);
	    // uncomment it for header details
	  //console.log("headers: ", res.headers);
	
	    res.on('data', function(d) {
	    	console.log(d);
	        console.info('result:\n');
	        process.stdout.write(d);
	        console.info('\n\nPOST completed');
	    });
	});
	
	// write the json data
	var post_data = querystring.stringify(agentInfo);
	
	reqPost.write(JSON.stringify(agentInfo));
	reqPost.end();
	reqPost.on('error', function(e) {
	    console.error(e);
	});
}

registerServer();
updateAgentInfoOnAgent(agent);