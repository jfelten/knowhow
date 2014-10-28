var logger=require('./routes/log-control').logger;
var path = require('path');
var os = require('os');

//create a ref to variables like port passed in through the command line
var agentData = require('yargs').argv;
var defaultPort = 3000;
if (agentData.port == undefined) {
	agentData.port = defaultPort;
}
if (agentData.mode == undefined) {
	agentData.mode = "development"
}

exports.agentData = agentData;

//set up the express app,
var path = require('path');
var express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', {
	 layout: true,
	 extended: true
	});
bodyParser = require('body-parser');

//app.use(bodyParser())

app.use(bodyParser.json());

//stylus style sheets
//for stylus style sheets
var stylus = require('stylus');
var nib = require('nib');
function compile(str, path) {
	  return stylus(str)
	    .set('filename', path)
	    .use(nib());
	};
app.use(stylus.middleware(
		  { src: __dirname + '/public'
		  , compile: compile
		  }
		));
app.use(express.static(path.join(__dirname, 'public')));
var http = require('http').Server(app);
var io = require('socket.io')(http);
exports.io = io;


fs = require('fs');

var routes = require('./routes'),
api = require('./routes/api');


app.get('/', routes.index);
app.get('/partials/:name', routes.partials);

app.get('/delete',api.deleteAgent);
		

app.post('/api/registerAgent',api.registerAgent);
app.post('/api/registerServer',api.registerServer);
app.post('/api/updateAgentInfo',api.updateAgentInfo);

app.get('/status',function(req, res) {
	logger.info("request for agent status");
	res.json({status: status});
		
});


//JSON API
app.post('/api/execute', api.execute);
app.get('/api/status', api.status);
app.post('/api/logs', api.logs);
app.get('/api/agentInfo', api.agentInfo);
app.get('/api/serverInfo', api.serverInfo);

//redirect all others to the index (HTML5 history)
app.get('*', routes.index);

socket = http.listen(agentData.port, function(){
	  logger.info('listening on *:'+ agentData.port);  
	});


process.on('exit', function() {
	exec = require('child_process').exec
	if (agentData.mode == "production") {
		var agent_dir = path.normalize( __dirname+path.sep+'..'+path.sep+'..'+path.sep+agentData._id);
		logger.info("deleting agent dir: "+agent_dir);
		if (os.platform().indexOf('win') <0) {
			exec('rm -rf '+agent_dir);
		} else {
			exec('deltree '+agent_dir);
		}
		
	}
		

});