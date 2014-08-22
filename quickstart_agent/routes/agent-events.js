var logger=require('./log-control').logger;
var io;
var eventEmitter;
var serverInfo;

//My module

AgentEventHandler = function(io, agentControl) {
	logger.info('setting event io to:'+io);
	this.io = io;
	this.eventEmitter = agentControl.eventEmitter;
	logger.info("eventEmitter="+this.eventEmitter);
	
	this.eventEmitter.on('agent-update', function(agent) {

		agentControl.updateAgent(agent);
		io.emit('agent-update',agent);
		emitEventToServer('agent-update',agent);
		
	});

	this.eventEmitter.on('agent-error', function(agent) {

		
		logger.info('agent error detected.');
		agent.progress = 0;
		agentControl.updateAgent(agent);
		agent.status='ERROR';
		io.emit('agent-error',agent);
		emitEventToServer('agent-error',agent);
		
	});

	this.eventEmitter.on('agent-delete', function(agent) {
		agent.status='DELETED';
		io.emit('agent-delete',agent);
	});
	this.eventEmitter.on('agent-add', function(agent) {

		agent.status='INSTALLING';
		io.emit('agent-add',agent);
	});
}

emitEventToServer = function(message, agent) {
	if (serverInfo != undefined) {
		logger.info('publishing agent event to: '+serverInfo.ip);
		// prepare the header
		var headers = {
		    'Content-Type' : 'application/json',
		    'Content-Length' : Buffer.byteLength(JSON.stringify(agent) , 'utf8'),
		    'Content-Disposition' : 'form-data; name="script"'
		};

		// the post options
		var options = {
		    host : serverInfo.ip,
		    port : serverInfo.port,
		    path : '/api/agentEvent',
		    method : 'POST',
		    headers : headers
		};

		var request = http.request(options, function(res) {
			logger.debug("processing status response: ");
			
			var output = '';
	        logger.debug(options.host + ' ' + res.statusCode);
	        res.setEncoding('utf8');

	        res.on('data', function (chunk) {
	            output += chunk;
	        });

	        res.on('end', function() {
	        	logger.info("done.");
	            obj = JSON.parse(output);
	        	logger.debug(obj);
	            
	        });
	        //res.end();
		});
		request.on('error', function(er) {
			logger.error('no agent running on agent: '+agent.host,er);
			
			callback();
		});
		request.end();
	}
	
};


AgentEventHandler.prototype.registerServer = function registerAgent(server) {
  logger.info(server);
  	this.serverInfo=server;
};

AgentEventHandler.prototype.serverInfo = serverInfo;
AgentEventHandler.prototype.eventEmitter = eventEmitter;


module.exports = AgentEventHandler;
