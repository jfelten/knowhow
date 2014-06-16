var async = require('async');
var client = require('scp2')
var zlib = require('zlib');
var fstream = require('fstream');
var tar = require('tar');
var Connection = require('ssh2');
//deliver the agent files
var deliveryHost = '10.10.10.14';
var username = 'weblogic';
var password= 'weblogic';

function install(commands) {
	var execCommands = new Array(commands.length);
	for (index in commands) {
		console.log("queueing "+index+":"+commands[index]);
		var command = commands[index];
	    execCommands[index] = function(callback) {
	    	var comm = ''+this.cmd;
	    	console.log(this.idx+" - "+comm);
	    	var conn = new Connection();
	    	conn.on('ready', function() {
	    		
	    		conn.exec(comm, function(err, stream) {
		    	    if (err) throw err;
		    	    stream.on('exit', function(code, signal) {
		    	      console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
		    	    });
		    	    stream.on('close', function() {
		    	      console.log('Stream :: close');
		    	      conn.end();
		    	    });
		    	    stream.on('data', function(data, extended) {
		    	          console.log((extended === 'stderr' ? 'STDERR: ' : '')
		    	                     + data);
		    	    });
		    	    stream.on('exit', function(code, signal) {
		    	          conn.end();
		    	          
		    	    });
		    	    conn.on('error', function(err) {
		    	    	console.log('Connection :: error :: ' + err);
		    	    });
		    	    conn.on('end', function() {
		    	      console.log('Connection :: end');
		    	      
		    	    });
		    	    conn.on('close', function(had_error) {
		    	      console.log('Connection :: close');
		    	      callback();
		    	    }); 
		    	    //.stderr.on('data', function(data) {
		    	    //  console.log('STDERR: ' + data);
		    	 });
			}).connect({
			  host: deliveryHost,
			  port: 22,
			  username: username,
			  password: password
			});
	    	
	    	
		}.bind( {'cmd': command, 'idx': index});
	}
	async.series(execCommands,function(err) {
        console.log("done");
    });
	
}

var agent_dir = __dirname+"/../../quickstart_agent";
var nodejs_dir = __dirname+"/../repo/rawpackages/node/node*";
var agent_archive_name = 'quickstart_agent.tar.gz';


//create agent archive
console.log('packaging agent');
fstream.Reader({ 'path': agent_dir, 'type': 'Directory' }) /* Read the source directory */
.pipe(tar.Pack()) /* Convert the directory to a .tar file */
.pipe(zlib.Gzip()) /* Compress the .tar file */
.pipe(fstream.Writer({ 'path': agent_archive_name }).on("close", function () {
	console.log('delivering agent files to: '+deliveryHost);
	client.scp(__dirname+"/"+agent_archive_name, {
	    host: deliveryHost,
	    username: username,
	    password: password,
	    path: '/home/weblogic/'
	}, function(err) {console.log(err);})

	client.on('close',function () {
		console.log('transfer complete');
		
		//start the agent
		console.log('starting agent on: '+deliveryHost);
		  commands=['tar xzf '+agent_archive_name,
		            'tar xzf quickstart_agent/node*.tar.gz',
		            'nohup node*/bin/node quickstart_agent/agent.js > quickstart_agent.log'
		  ];
         install(commands);
		
	    });
}
		
));



