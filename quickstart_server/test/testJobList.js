var http = require('http');
var async = require('async');

agent = {
		host: "tb105",
		port: "3000",
		user: "builder",
		password: "builder",
		status: "unknown",
		type: "linux"
	};
status = "";

getStatus = function(callback) {
	console.log('checking status for: '+agent.host);
	var options = {
		    host : agent.host,
		    port : agent.port,
		    path : '/status',
		    method : 'GET',
		    headers: {
		        'Content-Type': 'application/json'
		    }
		};
	var request = http.request(options, function(res) {
		console.log("processing status response: ");
		
		var output = '';
        console.log(options.host + ' ' + res.statusCode);
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
        	console.log("done.")
            var obj = JSON.parse(output);
        	console.log(obj.status);
            status = obj.status;
        });
	});
	request.on('error', function(er) {
		console.log('no agent running on agent: '+agent.host,er);
	});
	request.end();
	return "UNKNOWN";
}

var exec = [getStatus];
async.series(exec,function(err) {
    console.log("done");
    console.log("status="+status);
});

