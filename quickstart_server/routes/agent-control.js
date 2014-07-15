var logger=require('./log-control').logger;
var async = require('async');
var client = require('scp2');
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

exports.updateAgent = function(agent) {
	db.update({ '_id': agent._id}, agent, function(err,docs) {
		
	});
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

exports.initAgent = function(agent) {
	agent_prototype = {
		host: "",
		port: "3000",
		user: "",
		password: "",
		status: "unknown",
		type: "linux",
		status: "INSTALLING"
	};
	var props = Object.getOwnPropertyNames(agent_prototype);
	props.forEach(function(prop){
		 if (Object.getOwnPropertyNames(agent).indexOf(prop) < 0) {
			 agent[prop]=agent_prototype[prop];
			 logger.debug('initAgent: adding property: '+agent[prop]);
		 }
	});
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
            var obj = JSON.parse(output);
        	logger.info(obj.status);
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
		    	    	callback('stop')
		    	    });
		    	    conn.on('end', function() {
		    	      logger.debug('Connection :: end');
		    	      
		    	    });
		    	    conn.on('close', function(had_error) {
		    	      console.log('Connection :: close');
		    	      agent.message=comm
		    	      eventEmitter.emit('agent-update',agent);
		    	      callback();
		    	    }); 
		    	    //.stderr.on('data', function(data) {
		    	    //  console.log('STDERR: ' + data);
		    	 });
			}).connect({
			  host: agent.host,
			  port: 22,
			  username: agent.user,
			  password: agent.password
			});
	    	conn.on('error', function(er) {
	    		logger.error('unable to connect to: '+agent.host,er.message);
	    		callback('stop');
	    	});
	    	
	    	
		}.bind( {'cmd': command, 'idx': index});
	};
	async.series(execCommands,function(err) {
        logger.info("done");
        main_callback();
    });
	
}

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
		logger.ingo("processing status response: ");
		
		var output = '';
        logger.debug(options.host + ' ' + res.statusCode);
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
        	logger.info("done.")
            var obj = JSON.parse(output);
        	console.log(obj.status);
            status = obj.status;
            callback();
        });
	});
	request.on('error', function(er) {
		logger.error('no agent running on agent: '+agent.host,er);
		callback();
	});
	request.end();
	return "UNKNOWN";
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
		eventEmitter.emit('agent-update', agent);
		logger.info('agent packaged.')
		callback();
	}));
};

deliverAgent = function(callback) {
    var agent = this.agent;
	client.scp(__dirname+"/../"+agent_archive_name, {
	    host: agent.host,
	    username: agent.user,
	    password: agent.password,
	    path: '/home/'+agent.user
	}, function(err) {
		if (err) {
			logger.info(err);
		}
		agent.message = 'transfer complete';
		eventEmitter.emit('agent-update', agent);
		logger.info('transfer complete');
		
		//start the agent
		logger.info('starting agent on: '+agent.host);
		callback();
		
	});

	client.on('close',function (err) {
		
	    });
	client.on('error',function (err) {
		agent.message = 'unable to transfer agent';
		eventEmitter.emit('agent-error', agent);
		logger.error('error delivering agent: ', err);
		callback('stop');
	});

};
exports.addAgent = function(agent) {
	
	logger.info("adding agent: "+agent);
	db.insert(agent, function (err, newDoc) {   
		    logger.debug("added agent: "+newDoc);
			eventEmitter.emit('agent-add',agent);
		});
	
	install_commands=['rm -rf quickstart_agent',
	          	'tar xzf '+agent_archive_name,
	            'tar xzf quickstart_agent/node*.tar.gz -C quickstart_agent',
	            'nohup quickstart_agent/node*/bin/node quickstart_agent/agent.js -port'+agent.port+' -user '+agent.user+' -login '+agent.login+' > quickstart_agent.log & 2>&1',
	            'rm quickstart_agent.tar.gz'
	];
	function_vars = {agent: agent, commands: install_commands};
	var exec = [getStatus.bind(function_vars),
	            packAgent.bind(function_vars), 
	            deliverAgent.bind(function_vars), 
	            install.bind(function_vars)];
	async.series(exec,function(err) {
		if (err) {
			logger.error('agent error' + err);
			eventEmitter.emit('agent-error',agent,err.syscall+" "+err.code);
		}
	    logger.info("done");
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

	// write the json data
	var post_data = querystring.stringify({
		'script' : install
	});

	reqPost.write(JSON.stringify(install));
	reqPost.end();
	reqPost.on('error', function(e) {
	    logger.error(e);
	});
}

