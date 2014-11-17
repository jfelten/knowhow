#!/usr/bin/env node

var path = require('path')
, fs = require('fs')
,server  = path.join(path.dirname(fs.realpathSync(__filename)), '../node_modules/knowhow-server/server.js')
,agent  = path.join(path.dirname(fs.realpathSync(__filename)), '../node_modules/knowhow-server/node_modules/knowhow-agent/agent.js');

console.log("executing: "+server);
require(server);
require(agent);
