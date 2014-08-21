fs = require("fs");
var http = require('http');
var querystring = require('querystring');
var logger = require('winston');
var io =  require('socket.io-client');
var path = require('path');
var ss = require('socket.io-stream');
var fileControl = require('../routes/file-control');

console.log("starting...");


agent = {
		"host": "tb101",
		"port": 3000
};

job = {
		  "id": "weblogic 10.2 install",
		  "working_dir": "/opt/weblogic/install",
		  "download_dir": "${working_dir}/downloads",
		  "files": [
		            "quickstart://repo/rawpackages/weblogic/wls1036_dev.zip"
		          ],
		  "script": {
		    "env": {
		      "MW_HOME": "/opt/weblogic2",
		      "WL_HOME": "/opt/weblogic2/wlserver",
		      "NM_HOME": "/opt/weblogic2/wlserver/common/nodemanager",
		      "JAVA_HOME": "/usr/java/jdk1.7.0_45",
		      "QS_UNZIP_DIR": "unzipped",
		      "SETUP_HOME": "/home/weblogic/setup",
		      "QS_LIB_DIR": "/home/weblogic/setup/lib",
		      "QS_CONFIG_DIR": "/home/weblogic/setup/config",
		      "JAVA_HOME": "/Library/Java/JavaVirtualMachines/jdk1.7.0_55.jdk/Contents/Home"
		    },
		    "install_commands": [
              "rm -rf unzipped",                   
		      "mkdir -p unzipped",
		      "unzip ${download_dir}/wls1036_dev.zip -d unzipped",
		      "rm -rf $MW_HOME",
		      "mkdir -p $MW_HOME",
		      "mv unzipped/* $MW_HOME",
		      "rm -rf unzipped",
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

function uploadFile(agent,jobId,file) {
	
	filepath= fileControl.getFilePath(file);
	
	fileName = path.basename(filepath);
	var name = filepath.split(path.sep).pop();
	var stats = fs.statSync(filepath);
	var fileSizeInBytes = stats["size"];
	
	var socket = io.connect('http://'+agent.host+':'+agent.port+'/upload');
	var stream = ss.createStream();
	var total = 0;
	
	
	ss(socket).emit('agent-upload', stream, {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, });
	var readStream = fs.createReadStream(filepath);
	readStream.pipe(stream);
	readStream.on('data', function (chunk) {
	  	total+=chunk.length;
	  	//console.log('uploading: '+total+"/"+fileSizeInBytes);

    }).on('end', function () {
      console.log("done");
      socket.close();
      readStream.close();
      
    });
	socket.on ('Error', function(message) {
    	logger.error(message);
        socket.close();
        readStream.close();
	});
	
}
function startFileUpload(agent,jobId, file){
	var socket = io.connect('http://'+agent.host+':'+agent.port+'/upload');
	
	//file baseDir = path.basename('..'+path.sep+file);
	fileName = path.resolve('..',file);
	logger.info("uploading file: "+fileName);
	var name = file.split(path.sep).pop();
	var stats = fs.statSync(fileName);
	var fileSizeInBytes = stats["size"];
	var total=0;
//    FReader.onload = function(evnt){
//        socket.emit('Upload', { 'Name' : Name, Data : evnt.target.result });
//    };
    socket.emit('Start', { 'name' : fileName, 'size' : fileSizeInBytes, 'jobId': jobId });
    
    var readStream = fs.createReadStream(fileName);
    //var hash = crypto.createHash('sha1');
    readStream
      .on('data', function (chunk) {
    	total+=chunk.length;
    	//console.log('uploading: '+total+"/"+fileSizeInBytes);
        //hash.update(chunk);
    	socket.emit('Upload', { 'name' : fileName, 'jobId': jobId, 'fileSize': fileSizeInBytes, data : chunk });
      })
      .on('end', function () {
        logger.info("upload complete for: "+file);
        socket.close();
        readStream.close();
      });
    
    socket.on ('Error', function(message) {
    	logger.error(message);
        socket.close();
        readStream.close();
        io.close();
	});

}

executeJobOnAgent = function( agent, job) {
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
	        logger.debug('\n\nPOST completed. uploading files');
	        
	        for (uploadIndex in job.files) {
	        	file = job.files[uploadIndex];
	        	uploadFile(agent,job.id,file);
	        }
	    });
	});


	reqPost.write(JSON.stringify(job));
	reqPost.end();
	reqPost.on('error', function(e) {
	    logger.error(e);
	});
};





agent ={
		host: 'localhost',
		port: 3000
};


executeJobOnAgent(agent,job);
