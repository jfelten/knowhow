<<<<<<< HEAD
var ss = require('socket.io-stream');
=======
var dl = require('delivery')
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b

var http = require('http')
  , fs = require('fs');
var path = require('path');

var io =  require('socket.io-client');
var socket = io.connect('http://localhost:3000/upload');
<<<<<<< HEAD
var fReader;

var uploadFileName = __dirname + '/../repo/rawpackages/weblogic/wls1036_dev.zip';
fileName = path.basename(uploadFileName);


function uploadFile(agent,file) {
	
	fileName = path.basename(file);
	var name = file.split(path.sep).pop();
	var stats = fs.statSync(file);
	var fileSizeInBytes = stats["size"];
	
	var socket = io.connect('http://'+agent.host+':'+agent.port+'/upload');
	var stream = ss.createStream();
	var total = 0;
	
	
	ss(socket).emit('agent-upload', stream, {name: fileName});
	var readStream = fs.createReadStream(file);
	readStream.pipe(stream);
	readStream.on('data', function (chunk) {
	  	total+=chunk.length;
	  	console.log('uploading: '+total+"/"+fileSizeInBytes);
	      //hash.update(chunk);
	  	//socket.emit('Upload', { 'Name' : fileName, Data : chunk });
    }).on('end', function () {
      console.log("done");
      socket.close();
      readStream.close();
      
    });
	
}

function startUpload(agent,file){
	var socket = io.connect('http://'+agent.host+':'+agent.port+'/upload');
	fileName = path.basename(file);
	var name = file.split(path.sep).pop();
	var stats = fs.statSync(file);
	var fileSizeInBytes = stats["size"];
	var total=0;
//    FReader.onload = function(evnt){
//        socket.emit('Upload', { 'Name' : Name, Data : evnt.target.result });
//    };
    socket.emit('Start', { 'Name' : name, 'Size' : fileSizeInBytes });
    
    var readStream = fs.createReadStream(file);
    //var hash = crypto.createHash('sha1');
    readStream
      .on('data', function (chunk) {
    	total+=chunk.length;
    	console.log('uploading: '+total+"/"+fileSizeInBytes);
        //hash.update(chunk);
    	socket.emit('Upload', { 'Name' : fileName, Data : chunk });
      })
      .on('end', function () {
        console.log("done");
        socket.close();
        readStream.close();
        
      });

}

agent ={
		host: 'localhost',
		port: 3000
};


files = [{"name": uploadFileName}
         
         ];

uploadFile(agent,uploadFileName);
=======

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
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
