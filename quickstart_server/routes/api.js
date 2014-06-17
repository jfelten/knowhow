

/*
 * Serve JSON to our AngularJS client
 */

exports.name = function (req, res) {
  res.json({
    name: 'Master01'
  });
};

//POST
exports.addAgent = function (req, res) {
  console.log('add agent: '+req.body.host);
  for (i in req.params) {
	  console.log(params[i]);
  }
  var agent = req.body;
  var agentControl = require('./agent-control');
  agentControl.addAgent(agent);
  
  res.json({
	    agent: req.body.host,
	    message: 'sucessfully installed'
	  });


};