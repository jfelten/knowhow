var http = require('http');
var querystring = require('querystring');
var fs = require('fs');


console.log("starting...");

var agentInfo = {
		_id:"Ah4WQBMiGtS5pA7b",
		host: 'test777',
		port: 3007,
		message: 'agent event test',
		progress: 25
};


// prepare the header
var headers = {
    'Content-Type' : 'application/json',
    'Content-Length' : Buffer.byteLength(JSON.stringify(agentInfo) , 'utf8'),
    'Content-Disposition' : 'form-data; name="agentInfo"'
};

// the post options
var options = {
    host : 'localhost',
    port : 3001,
    path : '/api/agentEvent',
    method : 'POST',
    headers : headers
};

console.info('Options prepared:');
console.info(options);
console.info('Do the call');

// do the POST call
var reqPost = http.request(options, function(res) {
    console.log("statusCode: ", res.statusCode);
    // uncomment it for header details
  console.log("headers: ", res.headers);

    res.on('data', function(d) {
        console.info('result:\n');
        process.stdout.write(d);
        console.info('\n\nPOST completed');
    });
});


reqPost.write(JSON.stringify(agentInfo));
reqPost.end();
reqPost.on('error', function(e) {
    console.error(e);
});
