var agentControl = require('./agent-control');
var events = require('./events');

/*
 * Serve JSON to our AngularJS client
 */

exports.agentControl = agentControl;

var connectedAgents = [
                       {
                    	id: "0",   
               			host: "test",
               			port: "3000",
               			user: "test",
               			password: "test",
               			status: "running",
               			type: "linux"
               		},
               	 {
                    	id: "99",   
               			host: "test2",
               			port: "3000",
               			user: "test",
               			password: "test",
               			status: "installing",
               			type: "linux"
               		}
];

exports.listAgents = function(req, res) {
	agentControl.listAgents(req, res);
};

exports.name = function (req, res) {
  res.json({
    name: 'Master01'
  });
};

exports.addAgent = function (req, res) {
  console.log('add agent: '+req.body.host);
  for (i in req.params) {
	  console.log(params[i]);
  }
  var agent = req.body;
  agentControl.initAgent(agent);
  agentControl.addAgent(agent);
  
  agentControl.listAgents(req,res);

};

exports.deleteAgent = function (req, res) {
	  console.log('delete agent: '+req.body._id);

	  var agent = req.body;
	  agentControl.deleteAgent(req,res,agent);
	  
	  //agentControl.listAgents(req,res);

	};