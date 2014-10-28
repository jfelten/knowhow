var logger=require('./log-control').logger;
var jobControl=require('./job-control');

var io;
var eventEmitter;
var serverInfo;

var connectedSockets = [];

var broadcastEvents = function(agentControl, io) {
	var eventListener = io.of('/agent-events');
	var nextIndex = connectedSockets.length;
	
	eventListener.on('connection', function (socket) {
		logger.info('new event listener connected');
		connectedSockets.push(socket);
		
		var closeListener = function() {
			logger.info("removing listener");
		}
		
		socket.on('disconnect',function(err) {
			logger.info("removing listeners");
			delete connectedSockets[nextIndex];
		});
		

		socket.on('job-cancel', function(job) {
			logger.info("cancel requested by server for: "+job.id);
			jobControl.cancelJob(job);
			//socket.emit('job-cancel', job);
		});
		

		

	});
	};
	
function sendJobEventToServer(eventType, job) {
	if (job) {
		for (var i=0; i<connectedSockets.length; i++) {
			var socket = connectedSockets[i];
			if (socket) {
				socket.emit(eventType, {id: job.id, progress: job.progress, status: job.status});
			}
		}
	}
}	

function sendAgentEventToServer(eventType, agent) {
	if (agent) {
		for (var i=0; i<connectedSockets.length; i++) {
			var socket = connectedSockets[i];
			if (socket) {
				socket.emit(eventType, agent);
			}
		}
	}
}
	

AgentEventHandler = function(io, agentControl) {
	logger.info('setting event io to:'+io);
	this.io = io;
	this.eventEmitter = agentControl.eventEmitter;
	logger.info("eventEmitter="+this.eventEmitter);
	
		jobControl.eventEmitter.on('job-update', function(job) {
			if (job) {
				logger.debug("emit job-update");
				//socket.emit('job-update', job);
				sendJobEventToServer('job-update',  job);
			}
		});
		
		jobControl.eventEmitter.on('job-error', function(job) {
			if (job) {
				logger.debug("job error: "+job.id);
				//socket.emit('job-error', job);
				jobControl.cancelJob(job);
				sendJobEventToServer('job-error', job);
			}
		});
		
		jobControl.eventEmitter.on('job-complete', function(job) {
			if (job) {
				logger.debug("job complete event: "+job.id);
				completeJob(job);
				//socket.emit('job-complete', job);
				sendJobEventToServer('job-complete', job);
			}
		});
		
		jobControl.eventEmitter.on('job-cancel', function(jobId) {
			logger.info("sending cancel message to server for: "+jobId);
			//socket.emit('job-cancel', jobId);
			sendJobEventToServer('job-cancel', jobId);
		});
		
		agentControl.eventEmitter.on('agent-update', function(agent) {
			if (agent) {
				agentControl.updateAgent(agent);
				//socket.emit('agent-update',agent);
				sendAgentEventToServer('agent-update', agent);
			}
			
		});

		agentControl.eventEmitter.on('agent-error', function(agent) {

			if (agent) {
				logger.info('agent error detected.');
				agent.progress = 0;
				agentControl.updateAgent(agent);
				agent.status='ERROR';
				//socket.emit('agent-error',agent);
				sendAgentEventToServer('agent-error', agent);
			}
			
		});

	   	agentControl.eventEmitter.on('agent-delete', function(agent) {
	   		if (agent) {
				agent.status='DELETED';
				//socket.emit('agent-delete',agent);
				sendAgentEventToServer('agent-delete', agent);
			
			}
		});
		agentControl.eventEmitter.on('agent-add', function(agent) {
			if (agent) {
				agent.status='INSTALLING';
				//socket.emit('agent-add',agent);
				sendAgentEventToServer('agent-add', agent);
			}
		});
	
	broadcastEvents(agentControl, io);
	
}



AgentEventHandler.prototype.registerServer = function registerAgent(server) {
  logger.info(server);
  	this.serverInfo=server;
};

AgentEventHandler.prototype.serverInfo = serverInfo;
AgentEventHandler.prototype.eventEmitter = eventEmitter;


module.exports = AgentEventHandler;
