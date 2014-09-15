
var fileControl = require('../routes/file-control');

fileControl.addFile('/Users/johnfelten/git/node/quickstart_server/repo/jobs/endeca/ExperienceManager/10.2','sdsd.json',undefined, function(err,createdFile){
	console.log(createdFile);
});
var newDir= '10.30';

fileControl.addFile('/Users/johnfelten/git/node/quickstart_server/repo/jobs/endeca/ExperienceManager',newDir,'true', function(err,createdFile){
	console.log(createdFile);
	fileControl.addFile('/Users/johnfelten/git/node/quickstart_server/repo/jobs/endeca/ExperienceManager/'+newDir,'sdsd.json',undefined, function(err,anotherFile){
		console.log(anotherFile);
	});
	fileControl.addFile('/Users/johnfelten/git/node/quickstart_server/repo/jobs/endeca/ExperienceManager/'+newDir,'test/sdsd.json',undefined, function(err,anotherFile){
		console.log(anotherFile);
	});
});

