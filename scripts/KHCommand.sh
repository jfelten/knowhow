#!/usr/bin/env node

var path = require('path')
, fs = require('fs')
,server  = path.join(path.dirname(fs.realpathSync(__filename)), '../kh-api/commandTool.js')

require(server);