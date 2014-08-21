require('./agent-control');
<<<<<<< HEAD
require('./job-control');
var agent = require('../agent');
var agentControl = new AgentControl(agent.io);
var jobControl = new JobControl(agent.io);
=======
var agent = require('../agent');
var agentControl = new AgentControl(agent.io);
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
var loggerControl = new LoggerControl(agent.io);
var agentInfo = agentControl.initAgent(agent.agentData);
var serverInfo;
var rimraf = require('rimraf');

var logger=require('./log-control').logger;
require('./agent-events');
<<<<<<< HEAD
var agentEventHandler = new AgentEventHandler(agent.io,agentControl);
=======
var agentEventHandler = new AgentEventHandler(agent.io,agentControl.eventEmitter);
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
require('shelljs/global');

exports.deleteAgent = function(req,res) {
	if (agentInfo.mode != "production") {
		logger.info("deleting agent disabled in dev mode");
		res.json({error:"delete agent disabled in development mode"});
		return;
	} else {
		process.exit();

	}
};


exports.registerAgent = function(req,res) {
	logger.info("register agent");
	var agent = req.data;
	agentControl.registerAgent(agent);
	res.json({ok:true});
	
};

exports.registerServer = function(req,res) {
<<<<<<< HEAD
	logger.info("register server from: "+req.connection.remoteAddress);
=======
	logger.info("register server");
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
	
	serverInfo = req.body;
	serverInfo.ip = req.connection.remoteAddress;
	logger.info("server requesting registration from: "+serverInfo.ip);
	agentEventHandler.registerServer(serverInfo);
	agentControl.registerServer(serverInfo);
	logger.info(agentEventHandler.serverInfo);
	res.json({registered:true});
	
};

exports.execute = function(req,res) {
	logger.info("execute");
<<<<<<< HEAD
	var job = req.body;
	jobControl.execute(job,agentInfo,serverInfo);
	res.json({'ok': true});

=======
	var executable = req.data;
	agentControl.execute(executable);
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
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
    require('./log-control').getLastXLogs(numLogs,res);


};

exports.serverInfo = exports.agentInfo = function(req,res) {
	res.json(agentEventHandler.serverInfo);
};

exports.agentInfo = function(req,res) {
	res.json(agentInfo);
};

