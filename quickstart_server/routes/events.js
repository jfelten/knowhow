
var agentControl = require('./agent-control');

//agentControl.eventEmitter.on('package-complete', function(agent) {
//	console.log('agent packaged event');
//	publishMessage(req, res, 'agent packed', agent);
//});

function publishMessage(req, res, message, agent) {
	
//	res.writeHead(200, {
//		'Content-Type': 'text/event-stream',
//		'Cache-Control': 'no-cache',
//		'Connection': 'keep-alive'
//	});
	res.write('\n');
	res.write('id: ' + agent._id + '\n');
	res.write("data: " + message + '\n\n'); // Note the extra newline
};
	 

exports.agentUpdateStream = function(req, res)  {
	// let request last as long as possible
	req.socket.setTimeout(Infinity);
	 
	agentControl.eventEmitter.on('package-complete', function(agent) {
		console.log('agent packaged event');
		publishMessage(req, res, 'agent packed', agent);
	});
	agentControl.eventEmitter.on('transfer-complete', function(agent) {
		publishMessage(req, res, 'agent files transferred', agent);
	});
	agentControl.eventEmitter.on('agent-error', function(agent, message) {
		publishMessage(req, res, message, agent);
	});
	agentControl.eventEmitter.on('added-agent', function(agent) {
		publishMessage(req, res,'sucessfully installed.', agent);
	});
	agentControl.eventEmitter.on('agent-executed', function(agent, message) {
		publishMessage(req, res, message, agent);
	});
	
	
	//send headers for event-stream connection
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive'
	});
	res.write('\n');
	 
	
	 
//	app.get('/fire-event/:event_name', function(req, res) {
//	publisherClient.publish( 'updates', ('"' + req.params.event_name + '" page visited') );
//	res.writeHead(200, {'Content-Type': 'text/html'});
//	res.write('All clients have received "' + req.params.event_name + '"');
//	res.end();
//	});
};
	
exports.fireEvents =  function(req, res) {
	publisherClient.publish( 'updates', ('"' + req.params.event_name + '" page visited') );
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.write('All clients have received "' + req.params.event_name + '"');
	res.end();
};