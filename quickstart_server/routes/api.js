

/*
 * Serve JSON to our AngularJS client
 */

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
	res.json(connectedAgents);
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
  var agentControl = require('./agent-control');
  agentControl.addAgent(agent);
  
  connectedAgents.push(agent);
  res.json(connectedAgents);


};