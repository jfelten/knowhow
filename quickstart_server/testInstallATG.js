var https = require('http');
var querystring = require('querystring');
var fs = require('fs');


console.log("starting...");
/**
 * make a call via http
 */
//load the JSON object
var install_file = __dirname + '/jobs/atg/atg_commerce_install_10_2.json';

var install = JSON.parse(fs.readFileSync( install_file), 'utf8');

console.log(install);

// prepare the header
var headers = {
    'Content-Type' : 'application/json',
    'Content-Length' : Buffer.byteLength(JSON.stringify(install) , 'utf8'),
    'Content-Disposition' : 'form-data; name="script"'
};

// the post options
var options = {
    host : 'localhost',
    port : 3000,
    path : '/api/quickstart_agents/execute',
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
        console.info('result:\n');
        process.stdout.write(d);
        console.info('\n\nPOST completed');
    });
});

// write the json data
var post_data = querystring.stringify({
	'script' : install
});

reqPost.write(JSON.stringify(install));
reqPost.end();
reqPost.on('error', function(e) {
    console.error(e);
});
