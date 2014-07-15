var agentControl = require('./agent-control');
var fileControl = require('./file-control');
var moment = require('moment');
var server = require('../server');
/*
 * Serve JSON to our AngularJS client
 */

exports.agentControl = agentControl;
var startTime = moment().format('MMMM Do YYYY, h:mm:ss a');


var connectedAgents = [
                       {
                    	id: "0",   
               			host: "test",
               			port: "3000",
               			user: "test",
               			password: "test",
               			status: "running",
               			type: "linux"
               		},
               	 {
                    	id: "99",   
               			host: "test2",
               			port: "3000",
               			user: "test",
               			password: "test",
               			status: "installing",
               			type: "linux"
               		}
];

exports.listAgents = function(req, res) {
	agentControl.listAgents(req, res);
};

exports.serverInfo = function (req, res) {
  var os = require("os");
  res.json({ serverInfo: {
	    name: os.hostname(),
	    started: startTime,
	    port: server.port
	  }
  });
};

exports.jobList = function (req,res) {
	var file = req.query.file;
	console.log('request for files in: '+file);
	var dirTree = fileControl.dirTree(file);
	 res.json( {files : dirTree});
};

exports.saveFile = function(req,res) {
	var fileName = req.query.fileName;
	var data = req.query.data;
	fileControl.saveFile(fileName,data,res);
};

exports.addAgent = function (req, res) {
  console.log('add agent: '+req.body.host);
  for (i in req.params) {
	  console.log(params[i]);
  }
  var agent = req.body;
  agentControl.initAgent(agent);
  agentControl.addAgent(agent);
  
  agentControl.listAgents(req,res);

};

exports.deleteAgent = function (req, res) {
	  console.log('delete agent: '+req.body._id);

	  var agent = req.body;
	  agentControl.deleteAgent(req,res,agent);
	  
	  //agentControl.listAgents(req,res);

	};