var logger=require('./routes/log-control').logger;
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var async = require('async');

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
app.get('/api/fileListForRepo', api.fileListForRepo);
app.get('/api/fileContent', api.fileContent);
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
	logger.debug(agents);
	var agentConnects = new Array(agents.length);
	for (agentIndex in agents) {
		var agent = agents[agentIndex]; 
		agentConnects[agentIndex] = function(callback) { 
			logger.info("contacting: "+this.agent.user+"@"+this.agent.host+":"+this.agent.port);
			agentControl.heartbeat(this.agent, function (err, connectedAgent) {
				if (err) {
					logger.error("unable to contact agent: "+connectedAgent.user+"@"+connectedAgent.host+":"+connectedAgent.port);
					callback(new Error("unable to contact agent: "+connectedAgent.user+"@"+connectedAgent.host+":"+connectedAgent.port));
					return;
				};
				logger.info("contacted "+connectedAgent);
				agentEventHandler.listenForAgentEvents(connectedAgent, function(err, registeredAgent) {
					if(err) {
						logger.error("unable to receive events for: "+registeredAgent.user+"@"+registeredAgent.host+":"+registeredAgent.port);
						callback(new Error("unable to receive events for: "+registeredAgent.user+"@"+registeredAgent.host+":"+registeredAgent.port));
						return;
					}
					logger.info("receiving events from: "+registeredAgent.user+"@"+registeredAgent.host+":"+registeredAgent.port);
					agentEventHandler.openFileSocket(registeredAgent, function(err, registeredAgent) {
						if(err) {
							logger.error("unable to upload files to: "+registeredAgent.user+"@"+registeredAgent.host+":"+registeredAgent.port);
							callback(new Error("unable to upload files to: "+registeredAgent.user+"@"+registeredAgent.host+":"+registeredAgent.port));
							return;
						}
						logger.info("can now upload files to: "+registeredAgent.user+"@"+registeredAgent.host+":"+registeredAgent.port);
						callback();
					});
				});
				
			});
		}.bind({agent: agent});
	
	}
	async.parallel(agentConnects,function() {
	
		logger.info("agent connections finished.");

	});
});


/**
* Start Server
*/

http.listen(port, function(){
	  logger.info('listening on *:'+port);
	  
	});
