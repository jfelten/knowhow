var logger=require('./log-control').logger;
var agentControl = require('./agent-control');
var executionControl = require('./execution-control');
var io;

//My module
function AgentEventHandler(io) {
	logger.info('setting event io to:'+io);
	this.io = io;
	
	agentControl.eventEmitter.on('agent-update', function(agent) {
		agentControl.updateAgent(agent);
		io.emit('agent-update',agent);
	});

	agentControl.eventEmitter.on('agent-error', function(agent) {
		
		logger.info('agent error detected.');
		agent.progress = 0;
		agentControl.updateAgent(agent);
		agent.status='ERROR';
		io.emit('agent-error',agent);
		
	});

	agentControl.eventEmitter.on('agent-delete', function(agent) {
		agent.status='DELETED';
		io.emit('agent-delete',agent);
	});
	agentControl.eventEmitter.on('agent-add', function(agent) {
		agent.status='INSTALLING';
		io.emit('agent-add',agent);
	});
	executionControl.eventEmitter.on('job-update', function(job) {
		io.emit('job-update',job);
	});
	executionControl.eventEmitter.on('job-cancel', function(job) {
		io.emit('job-cancel',job);
	});
	executionControl.eventEmitter.on('job-complete', function(job) {
		io.emit('job-complete',job);
	});
	
}

AgentEventHandler.prototype.registerAgent = function registerAgent(agent) {
  logger.info(agent);
};

module.exports = AgentEventHandler;
