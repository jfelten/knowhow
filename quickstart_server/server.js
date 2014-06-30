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
AgentEventHandler = require('./routes/agent-events'),
//http = require('http'),
path = require('path');

//for stylus style sheets
function compile(str, path) {
	  return stylus(str)
	    .set('filename', path)
	    .use(nib())
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

/**
* Configuration
*/

//all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(morgan('dev'));
app.use(bodyParser());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

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

//JSON API
app.get('/api/serverInfo', api.serverInfo);
app.get('/api/connectedAgents', api.listAgents);

//redirect all others to the index (HTML5 history)
app.get('*', routes.index);

//agent routes

app.post('/api/addAgent', api.addAgent);
app.post('/api/deleteAgent', api.deleteAgent);

/**
* Start Server
*/

//http.createServer(app).listen(app.get('port'), function () {
// console.log('Express server listening on port ' + app.get('port'));
//});
http.listen(port, function(){
	  console.log('listening on *:'+port);
	  
	});
