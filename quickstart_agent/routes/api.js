require('./agent-control');
var agent = require('../agent');
var agentControl = new AgentControl(agent.io);
var agentInfo = agentControl.initAgent(agent.agentData);
var rimraf = require('rimraf');



exports.deleteAgent = function(req,res) {
	console.log("deleting agent disabled");
	var agent_dir = __dirname+"/../quickstart_agent";
	rimraf(agent_dir, function(err) {
		if (err) {
			console.log("problem removing agent dir");
			res.json(500, {error:"internal server error"}); // status 500 
		} else {
			res.json({ok:true});
			process.exit();
		}
	});
};

exports.execute = function(req, res) {
	var job = req.data;
	agentControl.execute(job);
	res.json(data);
};

exports.register = function(req,res) {
	console.log("register agent");
};

exports.execute = function(req,res) {
	console.log("execute");
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
	console.log("agent status reqjuested");
};

exports.logs = function(req,res) {
	console.log("agent logs requested");
};

exports.agentInfo = function(req,res) {
	res.json(agentInfo);
};

