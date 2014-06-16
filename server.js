var net = require('net');

function executeOnMachine(server, port, command) {
	var client = net.connect({port: port, host: server},
    	function() { //'connect' listener
  		console.log('client connected');

  		client.write(command);
	});
	client.on('data', function(data) {
  		console.log(data.toString());
  		client.end();
	});
	client.on('end', function() {
  		console.log('client disconnected');
	});
}


executeOnMachine('localhost',8124,'pwd')


