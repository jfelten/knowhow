var logger=require('./log-control').logger;
var agentControl = require('./agent-control');
var executionControl = require('./execution-control');
var agentSockets = {};

var io;

exports.agentSockets=agentSockets;
function listenForAgentEvents(agent, callback) {
	if (!agentSockets[agent._id]) {
		agentSockets[agent._id] = {};
	}

	agentSockets[agent._id].eventSocket = require('socket.io-client')('http://'+agent.host+':'+agent.port+'/agent-events');
	logger.info("connecting to: "+agent.host+":"+agent.port ); 
    agentSockets[agent._id].eventSocket.on('connect', function() { 
    	
    	agentSockets[agent._id].eventSocket.on('job-update', function(job){
    		if (job) {
				logger.debug("job update");
				logger.debug(job.progress+" "+job.status);
				executionControl.updateJob(agent, job, function() {
					executionControl.eventEmitter.emit('job-update',agent, job);
				});
			}
			
		});
		agentSockets[agent._id].eventSocket.on('job-complete', function(job){
			logger.info('Completed Job: '+job.id);
			executionControl.completeJob(agent, job);
			//executionControl.eventEmitter.emit('job-complete',agent, job);
		});
		agentSockets[agent._id].eventSocket.on('job-error', function(job){
			logger.info('Stopping Job: '+job.id+ ' due to error.');
			agentSockets[agent._id].eventSocket.emit('job-cancel',job);
		});
		agentSockets[agent._id].eventSocket.on('job-cancel', function(job){
			logger.info('job: '+job.id+ ' cancelled.');
			executionControl.cancelJob(agent._id, job);
		});
		
		
    	 
    }).on('error', function(err) {
    	//callback(err, agent);
    });
    callback(undefined, agent);
	
}

function openFileSocket(agent, callback) {
	if (!agentSockets[agent._id]) {
		agentSockets[agent._id] = {};
	}
	logger.info('connecting to: http://'+agent.host+':'+agent.port+'/upload');
	//try {
		agentSockets[agent._id].fileSocket = require('socket.io-client')('http://'+agent.host+':'+agent.port+'/upload');
		agentSockets[agent._id].fileSocket.open();
		executionControl.setFileSocket(agent, agentSockets[agent._id].fileSocket);
	//} catch(err) {
	//	callback(err);
	//	return;
	//} 
	
	agentSockets[agent._id].fileSocket.on('disconnect' ,function () {
		logger.info("file socket disconnected");
	});
	
	agentSockets[agent._id].fileSocket.on('reconnect' ,function () {
		logger.info("file socket reconnected");
		agentSockets[agent._id].fileSocket.on('End' ,function (data) {
		
	      logger.info("done uploading: "+data.fileName+" for job: "+data.jobId);
	      logger.info(data.message);
	      executionControl.completeUpload(agent, jobId);
		      
	    });
		agentSockets[agent._id].fileSocket.on ('Error', function(data) {
	    	logger.error("socket error: "+data);
	        agentSockets[agent._id].fileSocket.emit('client-upload-error', {name: data.fileName, jobId: data.jobId} );

		});
		//callback(undefined,agent);
	});
	
	agentSockets[agent._id].fileSocket.on('error' ,function () {
		logger.info("unable to connect to file socket.");
		//callback(new Error("unable to connect to file socket."),agent);
	});
	
	agentSockets[agent._id].fileSocket.on('connect' ,function () {
		logger.info("connected to "+agent.host+':'+agent.port+" now accepting uploads.");
		agentSockets[agent._id].fileSocket.on('End' ,function (job) {
		  logger.info(job);
	      logger.info("done uploading for job: "+job.id);
	      executionControl.uploadComplete(agent, job);
		      
	    });
		agentSockets[agent._id].fileSocket.on ('Error', function(data) {
	    	logger.error("socket error: "+data);
	        agentSockets[agent._id].fileSocket.emit('client-upload-error', {name: data.fileName, jobId: data.jobId} );

		});
		
	}); 
   	
	callback(undefined,agent);
};


exports.openFileSocket = openFileSocket;

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
		executionControl.updateJob(job);
		//logger.debug(agent);
		//logger.debug(job);
		//try {
			if(job) {
				executionControl.updateJob(job);
				io.emit('job-update',{_id: agent._id, host: agent. host, port: agent.port, user: agent.user} 
									,{id: job.id, status: job.status, progress: job.progress});
			}
		//} catch(err) {
			
		//}
	});
	executionControl.eventEmitter.on('job-cancel', function(agent, job) {
		logger.info(job.id+' cancelled.');
		try {
			io.emit('job-cancel', {_id: agent._id, host: agent. host, port: agent.port, user: agent.user} 
								, {id: job.id, status: job.status, progress: job.progress});
		} catch(err) {
		
		}
	});
	executionControl.eventEmitter.on('job-complete', function(agent, job) {
		logger.info("broadcasting "+job.id+' complete.');
		try {
			io.emit('job-complete',agent, job);
		} catch(err) {
		
		}
	});
	
}

AgentEventHandler.prototype.registerAgent = function registerAgent(agent) {
  logger.info(agent);
};
AgentEventHandler.prototype.listenForAgentEvents = listenForAgentEvents;
AgentEventHandler.prototype.openFileSocket = openFileSocket;
module.exports = AgentEventHandler;
