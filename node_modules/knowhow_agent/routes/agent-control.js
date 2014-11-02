var commandShell = require('./commandShell');
var rimraf = require('rimraf');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
exports.eventEmitter = eventEmitter;


var jobQueue = []



var status = 'READY';
var io;

var logger=require('./log-control').logger;
var serverInfo;
var logger=require('./log-control').logger;

initAgent = function(agent) {

	var logger=require('./log-control').logger;
	logger.info(JSON.stringify(agent));
	logger.info(process.env);
	var os = require("os");
	var _ = require('underscore'); 
	var ip = _.chain(os.networkInterfaces()).flatten().filter(function(val){ return (val.family == 'IPv4' && val.internal == false); }).pluck('address').first().value(); 
	logger.info('initializing agent with ip: '+ip) ;  
	agentData = {
		host: os.hostname(),
		ip: ip,
		port: agent.port,
		login: agent.login,
		user: agent.user,
		password: agent.password,
		type: os.type(),
		startTime: new Date(),
		status: "READY",
		mode: agent.mode,
		_id: agent._id
	};

	return agentData;

};



execute = function(job, agentInfo, serverInfo) {
	status='EXECUTING';
    logger.info("execute");
    logger.debug(job);
    commandShell.executeSync(job, agentInfo, serverInfo, eventEmitter);
    socket.emit('execute-complete', { exec: 'done' });
    status = 'READY';
};

AgentControl = function(io) {

	//logger.info('setting event io to:'+io);
	this.io = io;
	this.eventEmitter=new EventEmitter();

	
	var agentSocket = io.of('/agent');
	agentSocket.on('connection', function (socket) {
		logger.debug("connected from: ");
		logger.debug(socket.handshake.headers['x-forwarded-for']);
		//always require identity
		socket.on('identify', function (data) {
			logger.info('received request from: '+data.server);
			
			//agent commands
		    socket.on('execute', function (data) {
		    	execute(data);
		    });
		    
		    socket.on('register', function(data) {
		    	logger.info('register requested');
		    });
		});
		socket.on('error', function(err) {
			status="ERROR";
			socket.emit('error', { exec: 'done' });
		});
	});


};

//var io = require('socket.io').listen(server)
AgentControl.prototype.initAgent = initAgent;
AgentControl.prototype.execute = execute;
AgentControl.prototype.eventEmitter = eventEmitter;
AgentControl.prototype.registerServer = function (server) {
	  logger.info(server);
	  this.serverInfo=server;
	};

AgentControl.prototype.serverInfo = serverInfo;

module.exports = AgentControl;






