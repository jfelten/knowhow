require('./agent-control');
require('./job-control');
var crypto = require('crypto');
var agent = require('../agent');
var agentControl = new AgentControl(agent.io);
var jobControl = new JobControl(agent.io);
var loggerControl = new LoggerControl(agent.io);
var agentInfo = agentControl.initAgent(agent.agentData);
var serverInfo = {
	host: undefined,
	port: undefined,
	cryptoKey: undefined
};
var rimraf = require('rimraf');

var logger=require('./log-control').logger;
require('./agent-events');

var agentEventHandler = new AgentEventHandler(agent.io,agentControl);
require('shelljs/global');

exports.deleteAgent = function(req,res) {
	
	res.json({OK:true});
	process.exit();


};


exports.registerAgent = function(req,res) {
	logger.info("register agent");
	var agent = req.data;
	agentControl.registerAgent(agent,function(err) {
		if (err) {
		
		} else {
			res.json({ok:true});
		}
	});
	
};

exports.registerServer = function(req,res) {

	logger.info("register server from: "+req.connection.remoteAddress);	
	serverInfo = req.body;
	serverInfo.ip = req.connection.remoteAddress;
	logger.info("server requesting registration from: "+serverInfo.ip);
	agentEventHandler.registerServer(serverInfo);
	agentControl.registerServer(serverInfo);
	logger.info(agentEventHandler.serverInfo);
	res.json({registered:true});
	
};

exports.updateAgentInfo = function (req,res) {
	logger.debug("updating agent info");
	var agent = req.body;
	logger.debug(agent);
	var props = Object.getOwnPropertyNames(agent);
	props.forEach(function(prop){
		 logger.debug('updateAgentInfo: updating property: agent.'+prop);
		 agentInfo[prop]=agent[prop];
	});
	res.json({registered:true});
	
}

exports.execute = function(req,res) {
	logger.info("execute");
	var job = req.body;
	if (job && job.id) {
		if (require('./job-control').jobInprogress != undefined) {
			logger.debug(require('./job-control').jobQueue[job.id]);
			logger.info("execute");
			res.json(500, {"message": "job id: '+job.id+' already running"} );
		} else {
			jobControl.execute(job, agentInfo, serverInfo, function(err, job) {
				if (err) {
					res.send(500, {"message": err.message});
				}
				res.json({'ok': true});
			});
			
		}
	} else {
		res.send(500, {"message": "invalid job."});
	}
	

};


exports.status =function(req,res) {
	var os = require("os");
	  res.json({ agent: {
		    host: os.hostname(),
		    started: startTime,
		    port: agent.port
		  }
	  });
	
};

exports.logs = function(req,res) {
    numLogs=req.body.numLogs;
    console.log("num logs requested="+numLogs);
    require('./log-control').getLastXLogs(numLogs,function(logs) {
    	res.json(logs);
    });


};

exports.serverInfo = exports.agentInfo = function(req,res) {
	res.json(agentEventHandler.serverInfo);
};

exports.agentInfo = function(req,res) {
	res.json(agentInfo);
};

 
