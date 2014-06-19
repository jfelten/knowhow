var agentControl = require('./agent-control');

function publishMessage(req, res, message, agent) {
	messageCount++; // Increment our message count
	 
		res.write('id: ' + agent.id + '\n');
		res.write("data: " + message + '\n\n'); // Note the extra newline
};
	 

exports.agentUpdateStream = function(req, res)  {
	// let request last as long as possible
	req.socket.setTimeout(Infinity);
	 
	agentControl.on('package-complete', function(agent) {
		publishMessage(req, res, message, agent);
	});
	agentControl.on('transfer-complete', function(agent) {
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