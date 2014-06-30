
var agentControl = require('./agent-control');
var io;

//My module
function AgentEventHandler(io) {
	console.log('setting event io to:'+io);
	this.io = io;
	
	agentControl.eventEmitter.on('agent-update', function(agent) {
		agentControl.updateAgent(agent);
		io.emit('agent-update',agent);
	});

	agentControl.eventEmitter.on('agent-error', function(agent) {
		
		console.log('agent error detected.')
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
}

AgentEventHandler.prototype.registerAgent = function registerAgent(agent) {
  console.log(agent);
};

module.exports = AgentEventHandler;
