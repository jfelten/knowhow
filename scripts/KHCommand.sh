#!/usr/bin/env node

var path = require('path')
, fs = require('fs')
,server  = path.join(path.dirname(fs.realpathSync(__filename)), '../node_modules/knowhow-api/kh-api/commandTool.js')

require(server);