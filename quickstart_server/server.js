var logger=require('./routes/log-control').logger;
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//var express = require('express'),
bodyParser = require('body-parser'),
methodOverride = require('method-override'),
errorHandler = require('error-handler'),
morgan = require('morgan'),
stylus = require('stylus'),
nib = require('nib'),
routes = require('./routes'),
api = require('./routes/api'),
fileControl = require('./routes/file-control'),
AgentEventHandler = require('./routes/agent-events'),
//http = require('http'),
path = require('path');
var agentControl = require('./routes/agent-control');

//for stylus style sheets
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

var agentEventHandler = new AgentEventHandler(io);
var dl = require('delivery');
fs = require('fs');


//New call to compress content
var compress = require('compression')();
app.use(compress);

//app.use(express.static(__dirname+'/html' ));
app.use('/repo', express.static(__dirname+'/repo'));

var port = 3001;
exports.port = port;
/**
* Configuration
*/

//all environments
//app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(morgan('dev'));
app.use(bodyParser());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/repo', express.static(path.join(__dirname, 'repo')));
var env = process.env.NODE_ENV || 'development';

//development only
if (env === 'development') {
 app.use(errorHandler);
}

//production only
if (env === 'production') {
 // TODO
}


/**
* Routes
*/

//events

app.get('/agent-updates',function(req,res) {
	io.emit('agent-update', 'test');
	res.json({
	    name: 'Master01'
	  });
});


//serve index and view partials
app.get('/', routes.index);
app.get('/partials/:name', routes.partials);
app.get('/modals/:name', routes.modals);

//JSON API
app.get('/api/serverInfo', api.serverInfo);
app.get('/api/connectedAgents', api.listAgents);
app.get('/api/jobList', api.jobList);
app.get('/api/jobContent', api.jobContent);
app.get('/api/saveFile', api.saveFile);
app.get('/api/repoList', api.repoList);
app.get('/api/addFile', api.addFile);
app.get('/api/deleteFile', api.deleteFile);


//agent routes
app.post('/api/addAgent', api.addAgent);
app.post('/api/deleteAgent', api.deleteAgent);
app.post('/api/logs',api.logs);
app.post('/api/agentEvent', api.agentEvent);
app.get('/api/agentEvent', api.agentEvent);
app.post('/api/execute', api.execute);
app.post('/api/cancel', api.cancel);
app.get('/api/runningJobsList', api.runningJobList);

//redirect all others to the index (HTML5 history)
app.get('*', routes.index);

//start listening for events on active agents
agentControl.listAgents(function (err, agents) {
	for (agentIndex in agents) {
		var agent = agents[agentIndex]; 
		agentControl.heartbeat(agent, function (err) {
			if (err) {
				logger.error("unable to contact agent: "+agent.user+"@"+agent.host+":"+agent.port);
				return;
			}
			console.log("contacted");
			agentEventHandler.listenForAgentEvents(agent, function(err) {
				if(err) {
					logger.error("unable to receive events for: "+agent.user+"@"+agent.host+":"+agent.port);
					return;
				}
				logger.info("receiving events from: "+agent.user+"@"+agent.host+":"+agent.port);
			});
		});
	
	}
});


/**
* Start Server
*/

http.listen(port, function(){
	  logger.info('listening on *:'+port);
	  
	});
