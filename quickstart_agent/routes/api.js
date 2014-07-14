require('./agent-control');
var agent = require('../agent');
var agentControl = new AgentControl(agent.io);
var loggerControl = new LoggerControl(agent.io);
var agentInfo = agentControl.initAgent(agent.agentData);
var rimraf = require('rimraf');

var logger=require('./log-control').logger;



exports.deleteAgent = function(req,res) {
	logger,info("deleting agent disabled");
	var agent_dir = __dirname+"/../quickstart_agent";
	rimraf(agent_dir, function(err) {
		if (err) {
			logger.error("problem removing agent dir");
			res.json(500, {error:"internal server error"}); // status 500 
		} else {
			res.json({ok:true});
			process.exit();
		}
	});
};


exports.register = function(req,res) {
	logger.info("register agent");
};

exports.execute = function(req,res) {
	logger.info("execute");
	var executable = req.data;
	agentControl.execute(executable);
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

exports.agentInfo = function(req,res) {
	res.json(agentInfo);
};

