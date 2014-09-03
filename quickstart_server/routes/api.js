var logger=require('./log-control').logger;
var agentControl = require('./agent-control');
var fileControl = require('./file-control');
var executionControl = require('./execution-control');
var moment = require('moment');
var server = require('../server');
var fs = require('fs');
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


function getServerInfo() {
    var os = require("os");
	serverInfo = {
			name: os.hostname(),
		    started: startTime,
		    port: server.port	
	};
	return serverInfo;
};

exports.serverInfo = function (req, res) {
  var os = require("os");
  logger.info(req.connection.remoteAddress);
  res.json(getServerInfo());
};

exports.jobList = function (req,res) {
	var file = req.query.file;
	logger.info('request for files in: '+file);
	var dirTree = fileControl.dirTree(file);
	 res.json( {files : dirTree});
};

exports.jobContent = function (req,res) {
	var filePath = req.query.file;
	var repo = req.query.repo;
	 
	var stat = fs.statSync(filePath);

    res.writeHead(200, {
        'Content-Type': 'text/json',
        'Content-Length': stat.size
    });

    var readStream = fs.createReadStream(filePath);
    // We replaced all the event handlers with a simple call to readStream.pipe()
    readStream.pipe(res);
};

exports.saveFile = function(req,res) {
	var fileName = req.query.fileName;
	var data = req.query.data;
	fileControl.saveFile(fileName,data,res);
};

exports.addAgent = function (req, res) {
  logger.info('add agent: '+req.body.host);
  for (i in req.params) {
	  logger.debug(params[i]);
  }
  var agent = req.body;
  agentControl.addAgent(agent, getServerInfo());
  agentControl.listAgents(req,res);

};

exports.agentEvent = function (req, res) {
	  logger.info('agent event: '+req.body.host);
	  for (i in req.params) {
		  logger.debug(params[i]);
	  }
	  var agent = req.body;
	  agentControl.eventEmitter.emit('agent-update',agent);
	  
	  res.json({ok:true});

};

exports.deleteAgent = function (req, res) {
	  logger.info('delete agent: '+req.body._id);

	  var agent = req.body;
	  agentControl.deleteAgent(req,res,agent);
	  
	  //agentControl.listAgents(req,res);

	};
	
exports.logs = function(req,res) {
    numLogs=req.body.numLogs;
    console.log("num logs requested="+numLogs);
    require('./log-control').getLastXLogs(numLogs,res);

};

exports.execute = function(req,res) {
	var agent = req.body.agent;
	var job =  req.body.job;
	
	executionControl.executeJob(agent, job, function(err){
		if (err) {
			logger.error(job.id+" failed to start.");
			logger.error(err);
			res.send(500, err);
			return;
		}
		logger.info(job.id+" launched.");
		res.json({ok:true});
	});
};

exports.repoList = function(req, res) {
	res.json(fileControl.repos);
};
