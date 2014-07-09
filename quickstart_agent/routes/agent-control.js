var commandShell = require('./commandShell');
var rimraf = require('rimraf');
var moment = require('moment');

var status = 'READY';
var io;


initAgent = function(agent) {
	var os = require("os");
	var _ = require('underscore'); 
	var ip = _.chain(os.networkInterfaces()).flatten().filter(function(val){ return (val.family == 'IPv4' && val.internal == false); }).pluck('address').first().value(); 
	console.log('initializing agent with ip: '+ip) ;  
	agentData = {
		host: os.hostname(),
		ip: ip,
		port: agent.port,
		login: agent.login,
		user: agent.user,
		password: agent.password,
		type: os.type(),
		startTime: moment().format('MMMM Do YYYY, h:mm:ss a'),
		status: "READY"
	};

	return agentData;

};


AgentControl = function(io) {
	console.log('setting event io to:'+io);
	this.io = io;
	
	var agentSocket = io.of('/agent');
	agentSocket.on('connection', function (socket) {
		console.log("connected from: ");
		console.log(socket.handshake.headers['x-forwarded-for']);
		//always require identity
		socket.on('identify', function (data) {
			console.log('received request from: '+data.server);
			
			//agent commands
		    socket.on('execute', function (data) {
		    	execute(data);
		    });
		    
		    socket.on('register', function(data) {
		    	console.log('register requested');
		    });
		});
		socket.on('error', function(err) {
			status="ERROR";
			socket.emit('error', { exec: 'done' });
		});
	});

	var up = io.of('/upload');

	up.on('connection', function (socket) {
		console.log('upload request');
		var delivery = dl.listen(socket);
		delivery = dl.listen(socket);
		delivery.on('receive.start',function(fileUID){
		      console.log('receiving a file!');
		    });
		delivery.on('receive.success',function(file){

		    fs.writeFile(file.name,file.buffer, function(err){
		      if(err){
		        console.log('File could not be saved.');
		      }else{
		        console.log('File saved.');
		      };
		    });
		  });
	});
};

//var io = require('socket.io').listen(server)
AgentControl.prototype.initAgent = initAgent;

module.exports = AgentControl;

execute = function(data) {
	status='EXECUTING';
    console.log("execute");
    console.log(data);
    commandShell.executeSync(data);
    socket.emit('execute-complete', { exec: 'done' });
    status = 'READY';
};
AgentControl.prototype.execute = execute;



