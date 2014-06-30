var https = require('http');
var querystring = require('querystring');
var fs = require('fs');
var io = require('socket.io-client');


console.log("starting...");
/**
 * make a call via http
 */
//load the JSON object
var weblogic_install_file = __dirname + '/repo/jobs/weblogic/10.2/install.json';
var environment_file = __dirname + '/JSON/tb1_environment.json';

var weblogicInstall = JSON.parse(fs.readFileSync( weblogic_install_file), 'utf8');
var environmentData = JSON.parse(fs.readFileSync( environment_file), 'utf8');

//console.log(weblogicInstall);
var io =  require('socket.io-client');
var socket = io('http://localhost:3000/agent');

socket.on('execute-complete', function () {
	console.log("execute complete.");
	socket.disconnect();
});

socket.on('connect', function(){
	console.log("connected");
	socket.emit('identify',{'server' :'localhost','port': '3001'});
	socket.emit('execute', weblogicInstall);
    socket.on('error', function(data){console.log('data');});
    socket.on('disconnect', function(){console.log('disconnect');});
    
  });


//socket.close();
//socket.disconnect();
//
//// prepare the header
//var headers = {
//    'Content-Type' : 'application/json',
//    'Content-Length' : Buffer.byteLength(JSON.stringify(weblogicInstall) , 'utf8'),
//    'Content-Disposition' : 'form-data; name="script"'
//};
//
//// the post options
//var options = {
//    host : 'localhost',
//    port : 3000,
//    path : '/execute',
//    method : 'POST',
//    headers : headers
//};
//
//console.info('Options prepared:');
//console.info(options);
//console.info('Do the call');
//
//// do the POST call
//var reqPost = https.request(options, function(res) {
//    console.log("statusCode: ", res.statusCode);
//    // uncomment it for header details
//  console.log("headers: ", res.headers);
//
//    res.on('data', function(d) {
//        console.info('result:\n');
//        process.stdout.write(d);
//        console.info('\n\nPOST completed');
//    });
//});
//
//// write the json data
//var post_data = querystring.stringify({
//	'script' : weblogicInstall
//});
//
//reqPost.write(JSON.stringify(weblogicInstall));
//reqPost.end();
//reqPost.on('error', function(e) {
//    console.error(e);
//});
