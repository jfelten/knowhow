var async = require('async');
var getPackageVersion = function(packageName, callback) {
	
	var versionJob = {
	  "id": "get package version",
	  "working_dir": "/tmp/KHAgent",
	  "options": {
	    "timeoutms": 40000,
	    "noEcho": true
	  },
	  "files": [],
	  "script": {
	    "env": {
	      "PATH": '/opt/local/bin:/opt/local/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
	      "PACKAGE_NAME": packageName
	    },
	    "commands": [
	      {
	        "command": "npm show ${PACKAGE_NAME} version"
	      }
	    ]
	  }
	}
	var KnowhowShell = require('../knowhow-shell');
	var knowhowShell = new KnowhowShell();
	knowhowShell.executeJobAsSubProcess(versionJob, function(err, jobRuntime) {
		if(err) {
			console.error("unable to get version for packaage: "+packageName+" "+err.message);
			callback(err);	
			
		} else {
			console.log(jobRuntime);
			callback(undefined, jobRuntime.scriptRuntime.completedCommands[0].output);
		}
	});
};

var getInstalledVersions = function() {
	var knowhow = require('./package.json');
	var knowhowShell = require('knowhow-shell/package.json');
	var knowhowApi = require('knowhow-api/package.json');
	var knowhowServer = require('knowhow-server/package.json');
	var knowhowAgent = require('knowhow-agent/package.json');
	
	var versions = {
		'knowhow': knowhow.version,
		'knowhow-shell': knowhowShell.version,
		'knowhow-api': knowhowApi.version,
		'knowhow-server': knowhowServer.version,
		'knowhow-agent': knowhowAgent.version
	};
	
	return versions;

}

var getNewestVersions = function(callback) {

	var packages = ['knowhow', 'knowhow-shell', 'knowhow-api', 'knowhow-server', 'knowhow-agent'];
	var versions = {};
	
	async.each(packages, function(package, cb) {
		getPackageVersion(package, function(err, version) {
			if (err) {
				cb(err);
			} else {
				versions[package] = version;
				cb();
			}
		});
	}, function(err) {
		callback(versions);
	});

}

exports.getNewestVersions = getNewestVersions;
exports.installedVersions = getInstalledVersions();

/*
getNewestVersions(function(newestVersions) {
	exports.newestVersions = newestVersions;
	console.log(exports.newestVersions);
	console.log(exports.installedVersions);
});*/


