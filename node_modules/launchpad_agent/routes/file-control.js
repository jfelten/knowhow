var logger=require('./log-control').logger;
var mkdirp = require('mkdirp');
var zlib = require('zlib');
var tar = require('tar');
var rimraf = require('rimraf');
var pathlib=require("path");

exports.forkStream = function(stream, destinations, callback) {
	
	if (Array.isArray(destinations) ) {
		var passThrough = require('stream').PassThrough;
		var streams = new Array(destinations.length);
	
	
		for (var i=0; i< destinations.length; i++) {
			var pass = new passThrough();
			stream.pipe(pass);
			streams[i] = {
				stream: pass,
				destination: destinations[i]
			}
		}
		callback(undefined, streams);
	} else {
		callback(undefined, [{stream: stream, destination: destinations}]);
	}
	
};

exports.saveFile = function(stream, name, size, destination, socket, overwrite,isDirectory,job) {
	if (!fs.existsSync(destination)) {
		logger.info("download dir does not exist - creating dir: "+destination);
    	mkdirp.sync(destination, function (err) {
    	  if (err) {
		    logger.error(err);
		    socket.emit('End', {message: err.message,  fileName: data.name} );
		  } else {
		    logger.info('Directory ' + directory + ' created.');
		  }
        
        });
	}
	var filename = pathlib.resolve(destination+pathlib.sep+name);
	if (!job.fileProgress[filename]) {
		job.fileProgress[filename] = {
			Uploaded: false
			
		}
	}
	if (fs.existsSync(filename)) {
		logger.debug(filename+' already exists overwrite='+overwrite);
		if (overwrite == false) {
			job.fileProgress[filename].uploadComplete=true;
			socket.emit('End', {message: 'Filename '+filename+' already exists and dontUploadIfFileExists is true for: '+job.id, jobId: job.id,  fileName: filename} );
			return;
		} else {
			stat = fs.statSync(filename);
			if (stat && stat.isDirectory()) {
				rimraf.sync(filename);
			} else if (stat) {
				fs.unlinkSync(filename);
			}
	    }
	}
	
	//var filename = pathlib.resolve(destination+pathlib.sep+data.name);
	logger.debug("saving "+filename);
	job.totalFileSize+=size
	job.totalReceived=0;
	job.fileProgress[filename] = {  //Create a new Entry in The files Variable
        FileSize : size,
        Data     : "",
        Uploaded : 0,
        uploadComplete: false,
        name: name
    };
			
   try {
    	logger.info("saving file: "+filename);

    	options ={
	  		path: destination,
	  		strip: 0, // how many path segments to strip from the root when extracting
		}
		if (isDirectory == true) {
			stream.pipe(zlib.createGunzip()).pipe(tar.Extract(options))
		} else {
    		stream.pipe(zlib.createGunzip()).pipe(fs.createWriteStream(filename).on('error', function(err) {
    			logger.error("cannot save: "+filename );
    			logger.error(err.message);
    			logger.error(err.stack);
    			socket.emit('Error', {message: 'Invalid file: '+filename, jobId: job.id, name: filename} );
    			return;
    		}));
    	}
	            

    } catch(err) {
    	logger.error("cannot save: "+filename );
    	logger.error(err.message);
    	socket.emit('Error', {message: 'Invalid file: '+filename, jobId: job.id, name: filename} );
    }
       

};

exports.replaceVars = function(input, envVars, callback) {
	var output = input;
	if (envVars) {
		logger.debug("input="+input);
	    replaceVar = function(inputString, regEx,varName) {
		    var iteration=0;
			while( res = regEx.exec( inputString) ){
				 for (i=0; i < res.length; i++) {
			        var replaceVal = res[i];
			    	var value = envVars[replaceVal.replace('\${','').replace('}','')];
			    	inputString=inputString.replace(replaceVal,value);
			      }
			      if (regEx.exec(inputString) ) {
			      	inputString = replaceVar(inputString, regEx,varName);
			      }
			}
			//logger.debug(inputString);
			return inputString;
		}
		
		var dollarRE = /\$\w+/g
		var dollarBracketRE = /\${\w*}/g
		for (variable in envVars) {
			//¬48logger.debug("replacing: "+variable);
			output = replaceVar(output, dollarRE,variable);
			output =  replaceVar(output, dollarBracketRE,variable);
		}
		logger.debug("output="+output);
	}	
	return output;
};


