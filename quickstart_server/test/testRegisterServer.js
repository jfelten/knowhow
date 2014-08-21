var https = require('http');
var querystring = require('querystring');
var fs = require('fs');


console.log("starting...");

var serverInfo = {
<<<<<<< HEAD
		name: "test",
=======
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
		host: 'localhost',
		port: 3001
};


// prepare the header
var headers = {
    'Content-Type' : 'application/json',
    'Content-Length' : Buffer.byteLength(JSON.stringify(serverInfo) , 'utf8'),
    'Content-Disposition' : 'form-data; name="serverInfo"'
};

// the post options
var options = {
<<<<<<< HEAD
    host : 'tb101',
=======
    host : 'localhost',
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
    port : 3000,
    path : '/api/registerServer',
    method : 'POST',
    headers : headers
};

console.info('Options prepared:');
console.info(options);
console.info('Do the call');

// do the POST call
var reqPost = https.request(options, function(res) {
    console.log("statusCode: ", res.statusCode);
    // uncomment it for header details
  console.log("headers: ", res.headers);

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
