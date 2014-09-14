var logger=require('./log-control').logger;
var agentControl = require('./agent-control');
var executionControl = require('./execution-control');

var io;

function listenForAgentEvents(agent, callback) {

	agent.eventSocket = require('socket.io-client')('http://'+agent.host+':'+agent.port+'/agent-events');
	logger.info("connecting to: "+agent.host+":"+agent.port ); 
    agent.eventSocket.on('connect', function() { 
    	
    	agent.eventSocket.on('job-update', function(job){
			logger.debug("job update");
			logger.debug(job.progress+" "+job.status);
			executionControl.updateJob(agent, job, function() {
				executionControl.eventEmitter.emit('job-update',agent, job);
			});
			
		});
		agent.eventSocket.on('job-complete', function(job){
			logger.info('Completed Job: '+job.id);
			executionControl.completeJob(agent._id, job.id);
			executionControl.eventEmitter.emit('job-complete',agent, job);
		});
		agent.eventSocket.on('job-error', function(job){
			logger.info('Stopping Job: '+job.id+ ' due to error.');
			agent.eventSocket.emit('job-cancel',jobId);
		});
		agent.eventSocket.on('job-cancel', function(jobId){
			logger.info('job: '+jobId+ ' cancelled.');
			executionControl.cancelJob(agent._id, jobId);
		});
		callback();
    	 
    }).on('error', function(err) {
    	callback(err);
    });
   
	

}


//My module
function AgentEventHandler(io) {
	logger.info('setting event io to:'+io);
	this.io = io;
	
	agentControl.eventEmitter.on('agent-update', function(agent) {
		agentControl.updateAgent(agent);
		try {
			io.emit('agent-update',agent);
		} catch(err) {
			logger.debug("no clients to broad cast event");
		}
	});

	agentControl.eventEmitter.on('agent-error', function(agent) {
		
		logger.info('agent error detected.');
		agent.progress = 0;
		agentControl.updateAgent(agent);
		agent.status='ERROR';
		try {
			io.emit('agent-error',agent);
		} catch(err) {
		
		}
		
	});

	agentControl.eventEmitter.on('agent-delete', function(agent) {
		agent.status='DELETED';
		try {
			io.emit('agent-delete',agent);
		} catch (err) {
		
		}
	});
	agentControl.eventEmitter.on('agent-add', function(agent) {
		agent.status='INSTALLING';
		try {
			io.emit('agent-add',agent);
		} catch (err) {
		
		}
	});
	executionControl.eventEmitter.on('job-update', function(agent, job) {
		logger.info('broadcasting job update.');
		//logger.debug(io);
		try {
			io.emit('job-update',agent, job);
		} catch(err) {
			
		}
	});
	executionControl.eventEmitter.on('job-cancel', function(agent, jobId) {
		logger.info(jobId+' cancelled.');
		try {
			io.emit('job-cancel',agent, jobId);
		} catch(err) {
		
		}
	});
	executionControl.eventEmitter.on('job-complete', function(agent, jobId) {
		logger.info(jobId+' complete.');
		try {
			io.emit('job-complete',agent, jobId);
		} catch(err) {
		
		}
	});
	
}

AgentEventHandler.prototype.registerAgent = function registerAgent(agent) {
  logger.info(agent);
};
AgentEventHandler.prototype.listenForAgentEvents = listenForAgentEvents;

module.exports = AgentEventHandler;
