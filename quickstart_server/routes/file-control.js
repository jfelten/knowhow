var logger=require('./log-control').logger;
var fs = require('fs');
var os = require("os")
var filepath = require('path');
var url = require('url') ;

repos = {
	"quickstart:": filepath.normalize(__dirname+".."+filepath.sep+".."+filepath.sep+"repo"),
	"leapfrog:": filepath.normalize("/repo/leapfrog"),
	"rawpackages": filepath.normalize("/repo/rawpackages")
};

exports.repos = repos;


exports.getFilePath = function(repofilename) {
	fileURL =url.parse(repofilename);
	logger.debug("repo="+fileURL.protocol);
	logger.debug("file="+fileURL.pathname);
	repoDir = repos[fileURL.protocol];
	return repoDir+fileURL.path;
};

dirTree = function (filename) {
	filepath = require('path');
	logger.info("retrieving tree for : "+filename);
	logger.debug("basename="+filepath.basename(filename));
    var stats = fs.lstatSync(filename),
        info = {
            path: filename,
            label: filepath.basename(filename),
            ext:  filepath.extname(filename)
        };
    

    if (stats.isDirectory()) {
//        info.type = "folder";
        info.children = fs.readdirSync(filename).map(function(child) {
            return dirTree(filename + '/' + child);
        });
        return info;
    } else {
        // Assuming it's a file. In real life it could be a symlink or
        // something else!
        info.type = "file";
 //   	return path.basename(filename);
    }

    return info;
};

if (module.parent == undefined) {
    // node dirTree.js ~/foo/bar
    var util = require('util');
    logger.info(util.inspect(dirTree(process.argv[2]), false, null));
}

saveFile = function(file, data, res) {

	fs.writeFile(file, data, function(err) {
	    if(err) {
	        res.json({
	        	message: err.msg
	        });
	    } else {
	    	res.json({
	        	message: 'File Saved.'
	        });
	    }
	}); 
};

exports.dirTree = dirTree;
exports.saveFile = saveFile;
