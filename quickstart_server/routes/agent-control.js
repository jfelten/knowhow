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
//deliver the agent files

var agent_dir = __dirname+"/../../quickstart_agent";
var nodejs_dir = __dirname+"/../repo/rawpackages/node/node*";
var agent_archive_name = 'quickstart_agent.tar.gz';


eventEmitter.on('package-complete',function(agent){
	logger.info("agent contol packaged agent: "+agent);
});

exports.eventEmitter = eventEmitter;

updateAgent = function(agent) {
	db.update({ '_id': agent._id}, agent, function(err,docs) {
		
	});
};

exports.updateAgent = updateAgent;

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
			callback();
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
			  	            'nohup '+agent._id+'/node*/bin/node '+agent._id+'/quickstart_agent/agent.js --port='+agent.port+' --user='+agent.user+' --login='+agent.login+' --_id='+agent._id+' > quickstart_agent.log & 2>&1',
			  	            'rm '+agent._id+'/'+agent_archive_name
			  	];

			  	if (agent.user != agent.login) {
			  		install_commands=['mkdir -p /tmp/agent',
			  		                'tar xzf '+agent._id+'/'+agent_archive_name+' -C /tmp/agent',
			  		  	          	'tar xzf /tmp/agent/quickstart_agent/node*.tar.gz -C /tmp/agent',
			  		  	            'sudo -u '+agent.user+' cp -R /tmp/agent /tmp/'+agent._id,
			  		  	            'rm -rf /tmp/agent',
			  		  	            'sudo -u '+agent.user+' nohup /tmp/'+agent._id+'/node*/bin/node /tmp/'+agent._id+'/quickstart_agent/agent.js --port='+agent.port+' --user='+agent.user+' --login='+agent.login+' --_id='+agent._id+' > quickstart_agent.log & 2>&1',
			  		  	            'rm -rf '+agent._id
			  		  	            ];
			  	}
			  	function_vars = {agent: agent, commands: install_commands, serverInfo: serverInfo};
			var exec = [
			            packAgent.bind(function_vars), 
			            deliverAgent.bind(function_vars), 
			            install.bind(function_vars),
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
	
		

exports.execute = function(agent,instructionSet) {
	// prepare the header
	var headers = {
	    'Content-Type' : 'application/json',
	    'Content-Length' : Buffer.byteLength(JSON.stringify(install) , 'utf8'),
	    'Content-Disposition' : 'form-data; name="script"'
	};

	// the post options
	var options = {
	    host : agent.host,
	    port : agent.port,
	    path : '/api/quickstart_agents/execute',
	    method : 'POST',
	    headers : headers
	};

	logger.debug('Options prepared:');
	logger.debug(options);
	logger.debug('Do the call');

	// do the POST call
	var reqPost = https.request(options, function(res) {
		logger.debug("statusCode: ", res.statusCode);
	    // uncomment it for header details
		logger.debug("headers: ", res.headers);

	    res.on('data', function(d) {
	    	logger.debug('result:\n');
	        process.stdout.write(d);
	        logger.debug('\n\nPOST completed');
	    });
	});


	reqPost.write(JSON.stringify(install));
	reqPost.end();
	reqPost.on('error', function(e) {
	    logger.error(e);
	});
}

