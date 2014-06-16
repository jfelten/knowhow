var dl = require('delivery')

var http = require('http')
  , fs = require('fs');
var path = require('path');

var io =  require('socket.io-client');
var socket = io.connect('http://localhost:3000/upload');

var uploadFileName = __dirname + '/jobs/weblogic/files/basic_domain.jar';
fileName = path.basename(uploadFileName);
socket.on('connect', function(){
	  console.log("connected");
	  var delivery = dl.listen(socket);
	  delivery.connect();
	  delivery.on('delivery.connect',function(delivery) {
        console.log('uploading: '+fileName+' with path: '+uploadFileName);
	    delivery.send({
	      name: fileName,
	      path : uploadFileName
	    });
	  });
     delivery.on('send.success',function(file){
       console.log('File successfully sent to agent');
       socket.disconnect();
     });

});