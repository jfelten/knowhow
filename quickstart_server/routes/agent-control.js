var logger=require('./log-control').logger;
var async = require('async');
var zlib = require('zlib');
var fstream = require('fstream');
var tar = require('tar');
var Connection = require('ssh2');
var Datastore = require('nedb'), 
db = new Datastore({ filename: './agents.db', autoload: true });
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
var nextAgentId =1;
var http = require('http');
var io =  require('socket.io-client');
var fileControl = require('../routes/file-control');
var ss = require('socket.io-stream');
//deliver the agent files

var agent_dir = __dirname+"/../../quickstart_agent";
var nodejs_dir = __dirname+"/../repo/rawpackages/node/node*";
var agent_archive_name = 'quickstart_agent.tar.gz';
var pathlib = require('path');


eventEmitter.on('package-complete',function(agent){
	logger.info("agent contol packaged agent: "+agent);
});

exports.eventEmitter = eventEmitter;

updateAgent = function(agent) {
	db.update({ '_id': agent._id}, agent, function(err,docs) {
		
	});
};

exports.updateAgent = updateAgent;

heartbeat = function(agent, callback) {

	logger.debug('heartbeat checking status for: '+agent.host);
	
	var options = {
		    host : agent.host,
		    port : agent.port,
		    path : '/api/agentInfo',
		    method : 'GET',
		    headers: {
		        'Content-Type': 'application/json'
		    }
		};
	
	var request = http.request(options, function(res) {
		//logger.debug("processing status response: ");
		
		var output = '';
        logger.debug(options.host + ' ' + res.statusCode);
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
        	logger.info("done.");
            //obj = JSON.parse(output);
        	//logger.debug("agent status check: "+obj.status);        
        	callback();
            
        });
        //res.end();
	});
	request.on('error', function(er) {
		logger.error('heartbeat could not connect to agent: '+agent.host,er);
		callback(new Error("unable to connect"));
	});
	request.end();

};


function listAgents(req,res) {
	db.find({}, function(err, docs) {
		logger.debug('found '+docs.length+' agents');
		logger.debug(docs);
//		docs.forEach(function(agent) {
//			console.log(agent);
//		});
		res.json(docs);
	  });
};

exports.listAgents = listAgents;

initAgent = function(agent) {
	agent_prototype = {
		host: "",
		port: "3000",
		login: "",
		password: "",
		user: "",
		status: "unknown",
		type: "linux",
		status: "INSTALLING",
		progress: 1
	};
	var props = Object.getOwnPropertyNames(agent_prototype);
	props.forEach(function(prop){
		 if (Object.getOwnPropertyNames(agent).indexOf(prop) < 0) {
			 agent[prop]=agent_prototype[prop];
			 logger.debug('initAgent: adding property: '+agent[prop]);
		 }
	});
	
	if (agent.login != undefined && agent.user == "") {
		agent.user = agent.login;
	}
	logger.info("initialized agent: "+agent.user+"@"+agent.host+":"+agent.port);
	return agent;
};

exports.deleteAgent = function(req,res, agent) {
	logger.info("deleting agent: "+agent._id);
	var options = {
		    host : agent.host,
		    port : agent.port,
		    path : '/delete',
		    method : 'GET',
		    headers: {
		        'Content-Type': 'application/json'
		    }
		};
	var request = http.request(options, function(response) {
		logger.debug("processing delete response: ");
		
		var output = '';
		logger.debug(options.host + ' ' + response.statusCode);
        response.setEncoding('utf8');

        response.on('data', function (chunk) {
            output += chunk;
        });

        response.on('end', function() {
        	logger.info("request to delete done.");
            //var obj = JSON.parse(output);
        	//logger.info(obj.status);
        	db.remove({ _id: agent._id }, {}, function (err, numRemoved) {
        		listAgents(req,res);
          	});
        	eventEmitter.emit('agent-delete',agent);
        });
	});
	request.on('error', function(er) {
		logger.error('no agent running on agent: '+agent.host,er);
		db.remove({ _id: agent._id }, {}, function (err, numRemoved) {
    		listAgents(req,res);
      	});
	});
	request.end();

};

install = function(main_callback) {
	var agent = this.agent;
	var commands = this.commands;
	var execCommands = new Array(commands.length);
	for (index in commands) {
		logger.info("queueing "+index+":"+commands[index]);
		var command = commands[index];
	    execCommands[index] = function(callback) {
	    	var comm = ''+this.cmd;
	    	logger.debug(this.idx+" - "+comm);
	    	var conn = new Connection();
	    	conn.on('ready', function() {
	    		
	    		conn.exec(comm, function(err, stream) {
		    	    if (err) throw err;
		    	    stream.on('exit', function(code, signal) {
		    	      logger.info('Stream :: exit :: code: ' + code + ', signal: ' + signal);
		    	    });
		    	    stream.on('close', function() {
		    	    	logger.info('Stream :: close');
		    	      conn.end();
		    	    });
		    	    stream.on('data', function(data, extended) {
		    	          logger.debug((extended === 'stderr' ? 'STDERR: ' : '')
		    	                     + data);
		    	    });
		    	    stream.on('exit', function(code, signal) {
		    	          conn.end();
		    	          
		    	    });
		    	    conn.on('error', function(err) {
		    	    	logger.error('Connection :: error :: ' + err);
		    	    	callback(new Error("unable to connect to: "+agent.host));
		    	    });
		    	    conn.on('end', function() {
		    	      logger.debug('Connection :: end');
		    	      
		    	    });
		    	    conn.on('close', function(had_error) {
		    	      console.log('Connection :: close');
		    	      agent.message=comm;
		    	      agent.progress+=1;
		    	      eventEmitter.emit('agent-update',agent);
		    	      callback();
		    	    }); 
		    	    //.stderr.on('data', function(data) {
		    	    //  console.log('STDERR: ' + data);
		    	 });
			}).connect({
			  host: agent.host,
			  port: 22,
			  username: agent.login,
			  password: agent.password
			});
	    	conn.on('error', function(er) {
	    		logger.error('unable to connect to: '+agent.host,er.message);
	    		callback('stop');
	    	});
	    	
	    	
		}.bind( {'cmd': command, 'idx': index});
	};
	async.series(execCommands,function(err) {
		if (err) {
			agent.progress=0;
			agent.status="ERROR";
			eventEmitter.emit('agent-update', agent);
		}
        logger.info("done");
        main_callback();
    });
	
};

getStatus = function(callback) {
	var agent = this.agent;
	logger.info('checking status for: '+agent.host);
	var options = {
		    host : agent.host,
		    port : agent.port,
		    path : '/api/agentInfo',
		    method : 'GET',
		    headers: {
		        'Content-Type': 'application/json'
		    }
		};
	var request = http.request(options, function(res) {
		logger.info("processing status response: ");
		
		var output = '';
        logger.debug(options.host + ' ' + res.statusCode);
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
        	logger.info("done.");
            obj = JSON.parse(output);
        	logger.debug("agent status check: "+obj.status);
        	if (obj.status != undefined) {
        		obj._id=agent._id;
        		updateAgent(obj);
        	}            
            callback();
            
        });
        //res.end();
	});
	request.on('error', function(er) {
		logger.error('no agent running on agent: '+agent.host,er);
		
		callback();
	});
	request.end();

};

registerServer = function(callback) {
	var agent = this.agent;
	var serverInfo = this.serverInfo
	logger.info('registering this server to listen for events on: '+agent.host+':'+agent.port);
	// prepare the header
	var headers = {
	    'Content-Type' : 'application/json',
	    'Content-Length' : Buffer.byteLength(JSON.stringify(serverInfo) , 'utf8'),
	    'Content-Disposition' : 'form-data; name="serverInfo"'
	};

	// the post options
	var options = {
	    host : agent.host,
	    port : agent.port,
	    path : '/api/registerServer',
	    method : 'POST',
	    headers : headers
	};

	// do the POST call
	var reqPost = http.request(options, function(res) {
	    console.log("statusCode: ", res.statusCode);
	    // uncomment it for header details
	  console.log("headers: ", res.headers);

	    res.on('data', function(data) {
	    	if (JSON.parse(data).registered) {
	    		logger.info('server registration complete');
	    		callback();
	    	} else {
	    		agent.message = 'Unable to register server';
	    		eventEmitter.emit('agent-error',agent);
	    		callback(new Error('Unable to register server'));
	    	}
	        logger.info('server registration complete');
	    });
	});

	// write the json data
	reqPost.write(JSON.stringify(serverInfo));
	reqPost.end();
	reqPost.on('error', function(e) {
	    logger.error("Unable to register server - connection error");
	    agent.message = 'Unable to register server';
		eventEmitter.emit('agent-error',agent);
		callback(e);
	});

};

checkAgent = function(callback) {
	var agent = this.agent;
	
	if (agent.login != undefined && (agent.user == "" || agent.user == undefined)) {
		agent.user = agent.login;
	}
	if (agent.port == undefined || agent.port == "") {agent.port=3000;};
	logger.debug("checking agent user:"+agent.user);
	db.find({$and: [{user: agent.user}, {port: agent.port}, {host: agent.host}]}, function(err, docs) {
		logger.debug("found: "+docs.length);
		if (docs.length > 0) {
			logger.error('agent: '+agent.user+'@'+agent.host+':'+agent.port+' already exists.');
			callback(new Error("Agent already exists"));
		} else {
			heartbeat(agent, function(err) {
				if (!err) {
					callback(new Error("Agent already exists"));
				}
				callback();
			});
			
		}
		
	  });

};
packAgent = function(callback) {
	
	var agent = this.agent;
	//create agent archive
	logger.info('packaging agent');
	fstream.Reader({ 'path': agent_dir, 'type': 'Directory' }) /* Read the source directory */
	.pipe(tar.Pack()) /* Convert the directory to a .tar file */
	.pipe(zlib.Gzip()) /* Compress the .tar file */
	.pipe(fstream.Writer({ 'path': agent_archive_name }).on("close", function () {
		agent.message = 'package-complete';
		agent.progress+=10;
		eventEmitter.emit('agent-update', agent);
		logger.info('agent packaged.');
	}).on("error",function(){
		eventEmitter.emit('agent-error', agent);
		logger.error('error packing agent: ', err);
		callback(new Error("Unable to pack agent"));
	})).on("close", function () {
		callback();
	});
	
};



waitForAgentStartUp = function(callback) {
	
	
	var agent = this.agent;
    agent.message = 'starting agent';
    eventEmitter.emit('agent-update', agent);
    //timeout after 20 secs
    var timeout = setTimeout(function() {
    	clearInterval(heartbeatCheck);
    	agent.message=("agent failed to start");
    	callback(new Error("agent failed to start"));
    }, 20000);
    
    
    //wait until a heartbeat is received
    var heartbeatCheck = setInterval(function() {
    	heartbeat(agent, function (err) {
    		if (!err) {
    			clearTimeout(timeout);
    			clearInterval(heartbeatCheck);
    			callback();
    		}
    	});
    }, 1000);
};

deliverAgent = function(callback) {
    var agent = this.agent;
    agent.message = 'transferring agent';
	eventEmitter.emit('agent-update', agent);
	var Client = require('scp2').Client;

	var client = new Client({
		host: agent.host,
	    username: agent.login,
	    password: agent.password,
	    path: '/home/'+agent.login+'/'+agent._id+'/'+agent_archive_name
	});

	client.upload(__dirname+"/../"+agent_archive_name, '/home/'+agent.login+'/'+agent._id+'/'+agent_archive_name, function(err){
		if (err) {
			logger.info(err);
			callback(err);
			return;
		}
		agent.message = 'transfer complete';
		eventEmitter.emit('agent-update', agent);
		logger.info('transfer complete');
		
		//start the agent
		logger.info('starting agent on: '+agent.host);
		client.close();
		callback();
	});


	client.on('close',function (err) {
		//callback();
	    });
	client.on('error',function (err) {
		agent.progress=0;
		agent.message = 'unable to transfer agent';
		eventEmitter.emit('agent-error', agent);
		logger.error('error delivering agent: ', err);
		callback(new Error("stop"));
	});
	
	client.on('transfer', function(buffer, uploaded, total) {
		var rem = uploaded % 5;
		if (rem ==0) {
			agent.progress+=1;
			eventEmitter.emit('agent-update', agent);
		}
		//logger.debug("uploaded="+uploaded+" total="+total);
	});

};
exports.addAgent = function(agent,serverInfo) {
	

	logger.info("adding agent: "+agent);

		
	
	function_vars = {agent: agent};
	
	var exec = [checkAgent.bind(function_vars)
	            
	            ];
	async.series(exec,function(err) {
		if (err) {
			logger.error('agent error' + err);
			agent.message = ""+err;
			eventEmitter.emit('agent-error',agent,err.syscall+" "+err.code);
			return;
		}
		
        agent=initAgent(agent);
    	db.insert(agent, function (err, newDoc) {   
		    logger.debug("added agent: "+newDoc);
		    agent=newDoc;
			eventEmitter.emit('agent-add',agent);

			install_commands=['rm -rf '+agent._id+'/quickstart_agent',
			  	          	'tar xzf '+agent._id+'/'+agent_archive_name+' -C '+agent._id,
			  	            'tar xzf '+agent._id+'/quickstart_agent/node*.tar.gz -C '+agent._id,
			  	            'nohup '+agent._id+'/node*/bin/node '+agent._id+'/quickstart_agent/agent.js --port='+agent.port+' --user='+agent.user+' --login='+agent.login+' --_id='+agent._id+' --mode=production > /dev/null 2>&1 &',
			  	            'rm '+agent._id+'/'+agent_archive_name
			  	];

			  	if (agent.user != agent.login) {
			  		install_commands=['mkdir -p /tmp/agent',
			  		                'tar xzf '+agent._id+'/'+agent_archive_name+' -C /tmp/agent',
			  		  	          	'tar xzf /tmp/agent/quickstart_agent/node*.tar.gz -C /tmp/agent',
			  		  	            'sudo -u '+agent.user+' cp -R /tmp/agent /tmp/'+agent._id,
			  		  	            'rm -rf /tmp/agent',
			  		  	            'sudo -u '+agent.user+' nohup /tmp/'+agent._id+'/node*/bin/node /tmp/'+agent._id+'/quickstart_agent/agent.js --port='+agent.port+' --user='+agent.user+' --login='+agent.login+' --_id='+agent._id+' --mode=development > /dev/null 2>&1 &',
			  		  	            'rm -rf /home/'+agent.login+'/'+agent._id
			  		  	            ];
			  	}
			  	function_vars = {agent: agent, commands: install_commands, serverInfo: serverInfo};
			var exec = [
			            packAgent.bind(function_vars), 
			            deliverAgent.bind(function_vars), 
			            install.bind(function_vars),
			            waitForAgentStartUp.bind(function_vars),
			            registerServer.bind(function_vars),
			            getStatus.bind(function_vars)];
			try {
				async.series(exec,function(err) {
					if (err) {
						logger.error('agent error' + err);
						eventEmitter.emit('agent-error',agent,err.syscall+" "+err.code);
						return;
					}
					//set the progress back to 0
					db.find({_id: agent._id}, function(err, docs) {
						if (docs.length > 0) {
							agent = docs[0];
							agent.progress =0;
							eventEmitter.emit('agent-update',agent);
						}
						
					  });
				
				});
			} catch(err) {
				logger.error("agent install failed for: "+agent.host+":"+agent.port);
			}
		});
		
	});
};
	
		

exports.execute = function(agent,job,callback) {

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

	logger.info('Starting Job: '+job.id+' on '+agent.user+'@'+agent.host+':'+agent.port);

	// do the POST call
	var reqPost = http.request(options, function(res) {
		logger.debug("statusCode: ", res.statusCode);
	    // uncomment it for header details
		logger.debug("headers: ", res.headers);

	    res.on('data', function(d) {
	    	logger.debug('result:\n');
	        process.stdout.write(d);
	        logger.debug('\n\nJob request sent. Listening for events and uploading files');
	        job.progress=1;
	        job.status="initializing job"
	        eventEmitter.emit('job-update',job);
	        var eventSocket = io.connect('http://'+agent.host+':'+agent.port+'/job-events');
	        var listening = false;
	        eventSocket.on('connect', function() { 
	        	 if (listening == false) {
	        	 	logger.info('listening for events fron job: '+job.id);
	        	 	eventSocket.emit('job-listen', job.id);
	        	 	listening=true;
	        	 }
	        	 
	        });
	       
			eventSocket.on('job-update', function(job){
				//logger.debug("job update");
				logger.debug(job.progress+" "+job.status);
				eventEmitter.emit('job-update',job);
			});
			eventSocket.on('job-complete', function(job){
				logger.info('Completed Job: '+job.id);
				eventSocket.close();
				clearTimeout(timeout);
				eventEmitter.emit('job-complete',job);
			});
			eventSocket.on('job-error', function(job){
				logger.info('Stopping Job: '+job.id+ ' due to error.');
				eventSocket.close();
				clearTimeout(timeout);
				eventEmitter.emit('job-error',job);
			});
			eventSocket.on('job-cancel', function(jobId){
				logger.info('job: '+jobId+ ' cancelled.');
				eventSocket.close();
				clearTimeout(timeout);
				eventEmitter.emit('job-cancel',job);
			});
			
			var timeoutms=600000; //10 minutes default timeout
			if (job.options != undefined && job.options.timeoutms != undefined) {
				timeoutms=job.options.timeoutms;
				logger.debug('setting timeout to" '+timeoutms);
			}
			var timeout = setTimeout(function() {
		    	job.status=("Job timeout");
		    	logger.error("time out for: "+job.id+' cancelling');
		    	eventSocket.emit('job-cancel',job);
		    	//eventSocket.destroy();
		    }, timeoutms);
		    
		    //upload files
		    try {
		    	uploadFiles(agent,job);
		    } catch (err) {
		    	logger.error(err);
		    	logger.error("problem uploading files");
		    	eventSocket.emit('job-cancel',job);
		    }
	    });
	});


	reqPost.write(JSON.stringify(job));
	reqPost.end();
	reqPost.on('error', function(e) {
	    logger.error(e);
	    
	});
}
	
function uploadFiles(agent,job) {
	var fileProgress = {};
	jobId=job.id;
	files=job.files;
	var socket;
	try {
		socket = io.connect('http://'+agent.host+':'+agent.port+'/upload');
	} catch(err) {
		throw err
		return;
	}    
	    socket.on('End' ,function (data) {

	      logger.info("done uploading: "+data.fileName+" for job: "+data.jobId);
	      logger.info(data.message);
	      //socket.close();
	      //fileProgress[data.fileName].readStream.close();
	      fileProgress[data.fileName].uploadComplete=true;
	      
	    });
		socket.on ('Error', function(data) {
	    	logger.error("socket error: "+data.message);
	        socket.emit('client-upload-error', {name: data.fileName, jobId: data.jobId} );
	        socket.close();
	        clearInterval(fileCheck);
	        clearTimeout(timeout);
	        //readStream.close();
		});
	
	for (uploadIndex in files) {
	    
	    
		var file = files[uploadIndex];
		var filepath= fileControl.getFilePath(file.source);
		var fileName = pathlib.basename(filepath);
		fileProgress[fileName ] = {}
	    fileProgress[fileName].fileName=fileName;
		
		var name = filepath.split(path.sep).pop();
		var stats = fs.statSync(filepath);
		var fileSizeInBytes = stats["size"];
		
		
		var total = 0;
		try {	
		    logger.info("uploading "+filepath);
			var stream = ss.createStream();
			fileProgress[fileName].readStream = fs.createReadStream(filepath,{autoClose: true, , highWaterMark: 32 * 1024});
			ss(socket).emit('agent-upload', stream, {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination });
			fileProgress[fileName].readStream.pipe(stream );
			fileProgress[fileName].readStream.on('data', function (chunk) {
			  	total+=chunk.length;
			  	//console.log('uploading: '+total+"/"+fileSizeInBytes);
		
		    });
		    
		} catch(err) {
			logger.error(err);
			socket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
            fileProgress.error=true;
            if ( fileProgress[fileName].readStream != null) {
            	fileProgress[fileName].readStream.close();
            }
			socket.close();
		}
		
	}
	
	//wait and make sure all files get uploaded
	//close all sockets when done.
	timeoutms=300000;//default timeout of 5 minutes
    if (job.options != undefined && job.options.timeoutms != undefined) {
    	timeoutms=job.options.timeoutms;
    }
    
    var timeout = setTimeout(function() {
    	clearInterval(fileCheck);
    	job.status=("Upload timeout - required files not sent.");
    	logger.error("upload timed out for: "+jobId);
    	for (index in job.fileProgress) {
    		socket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
        	fileProgress[index].readStream.close();
        }
        socket.close();
    }, timeoutms);
    
    var checkInterval = 2000; //2 seconds
    //wait until all files are receeived
    var fileCheck = setInterval(function() {
    	
    	numFilesUploaded=0;
    	for (index in fileProgress) {
    		var uploadFile = fileProgress[index];
    		if (uploadFile.uploadComplete == true) {
    		    numFilesUploaded++;
    		    if (numFilesUploaded >= job.files.length) {
    		    	logger.info(job.id+" all files sent...");
	    			for (index in job.fileProgress) {
			    		fileProgress[index].readStream.close();
			        }
			        socket.close();
			       	clearTimeout(timeout);
	    			clearInterval(fileCheck);
	    		}  		
    		} else if (uploadFile.error == true) {
    			logger.error(job.id+" error aborting upload.");
    			uploadFile.socket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
        		
        		for (index in job.fileProgress) {
		    		fileProgress[index].readStream.close();
		    		socket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
		        }
		        socket.close();
		        clearTimeout(timeout);
    			clearInterval(fileCheck);
    		}
    	}
    	if (job.files != undefined) {
    		//logger.debug(numFilesUploaded+ " of "+job.files.length+" files sent.");
    	} else {
    		logger.info("no files defined so none sent.");
    		socket.close();
		    clearTimeout(timeout);
    		clearInterval(fileCheck);
    	}
    }, checkInterval);
	
	
}
	
	


