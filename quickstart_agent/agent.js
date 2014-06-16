var commandShell = require('./commandShell');



var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var dl = require('delivery');
fs = require('fs');

//var io = require('socket.io').listen(server)
var ns = io.of('/agent');
ns.on('connection', function (socket) {
	console.log("connected from: ");
	console.log(socket.handshake.headers['x-forwarded-for']);
	socket.on('identify', function (data) {
		console.log('received request from: '+data.server);
	    socket.on('execute', function (data) {
	        // do something useful
	        console.log("execute");
	        console.log(data);
	        commandShell.executeSync(data);
	        socket.emit('execute-complete', { exec: 'done' });
	    });
	});
});


var up = io.of('/upload');

up.on('connection', function (socket) {
	console.log('upload request');
	var delivery = dl.listen(socket);
	delivery = dl.listen(socket);
	delivery.on('receive.start',function(fileUID){
	      console.log('receiving a file!');
	    });
	delivery.on('receive.success',function(file){

	    fs.writeFile(file.name,file.buffer, function(err){
	      if(err){
	        console.log('File could not be saved.');
	      }else{
	        console.log('File saved.');
	      };
	    });
	  });
});


socket = http.listen(3000, function(){
	  console.log('listening on *:3000');
	  
	});


