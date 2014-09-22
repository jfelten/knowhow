var logger=require('./log-control').logger;
var fs = require('fs');
var os = require("os")
var filepath = require('path');
var url = require('url') ;
var mkdirp = require('mkdirp');

repos = {
	"quickstart:": filepath.normalize(__dirname+".."+filepath.sep+".."+filepath.sep+"repo"),
	"leapfrog:": filepath.normalize("/repo/leapfrog"),
	"rawpackages:": filepath.normalize("/repo/rawpackages")
};

exports.repos = repos;


exports.getFilePath = function(repofilename) {
	fileURL =url.parse(repofilename);
	logger.debug("repo="+fileURL.protocol);
	logger.debug("file="+fileURL.pathname);
	repoDir = repos[fileURL.protocol];
	return repoDir+fileURL.path;
};

getDirTreeForRepo = function(repo, dir, callback) {
	var filename = repos[repo];
	
	if (!dir) {
		logger.info("retrieving tree for : "+filename);
	} else {
		logger.info("retrieving tree for : "+filename+filepath.sep+dir);
		filename = filename+filepath.sep+dir;
	}
	logger.info("repo file loc="+filename);
	
	var tree=  dirTree(filename);
	callback(undefined, tree);
	
	
};

exports.getDirTreeForRepo = getDirTreeForRepo;

dirTree = function (filename) {

	logger.debug("basename="+filepath.basename(filename)+" filename="+filename);
    var stats = fs.lstatSync(filename),
    info = {
        path: filename,
        label: filepath.basename(filename),
        ext:  filepath.extname(filename)
    };
    

    if (stats.isDirectory()) {
        info.type = "folder";
        info.children = fs.readdirSync(filename).map(function(child) {
        	return dirTree(filename + '/' + child);
        });
        
    } else {
        // Assuming it's a file. In real life it could be a symlink or
        // something else!
        info.type = "file";
    	//return path.basename(filename);
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

exports.deleteFile = function(repo, filename, callback) {
	repoDir = repos[repo];
	var filePath=repoDir+filepath.sep+filename;
	logger.debug("deleting: "+filename);
	stat = fs.statSync(filename);
	
	if (stat.isDirectory()) {
		logger.debug("recursively deleting directory");
		rmdir = require('rimraf');
		rmdir(filename, function(err){
			if (err) {
				callback(new Error("unable to delete: "+filename));
				return;
			}
			callback();
		});
	} else {

		fs.unlink(filename, function(err) {
			if (err) {
				callback(new Error("unable to delete: "+filename));
				return;
			}
			callback();
		});
	}
}

exports.addFile = function(addPath, fileName, isDirectory, callback) {
	
	
	//create the directory if it does not exist
	var isNewDirectory = (isDirectory === 'true' || isDirectory === true );
	var newPath = addPath;
	var absolutePath = filepath.resolve(addPath+filepath.sep+fileName);
	var fileType = 'file'
	if (isNewDirectory == true) {
		newPath = absolutePath;
		fileType='folder';
	}
	var fileInfo = {
        path: absolutePath,
        label: filepath.basename(absolutePath),
        ext:  filepath.extname(absolutePath)
    };
	//logger.debug('isNewDirectory='+isNewDirectory+' path='+newPath);
	fs.stat(newPath, function (err, stat) {
	   //logger.debug(stat);
       if (err) {
         logger.error(err);
          // file does not exist
          if (err.errno == 2 || err.errno == 34) {
        		logger.info("download dir does not exist - creating dir: "+newPath);
	        	mkdirp.sync(newPath, function (err) {
            	  if (err) {
        		    logger.error(err);
        		     callback(new Error("unable to create: "+newPath),fileInfo);
        		     return;
        		  } else {
        		    logger.info('Directory ' + newPath + ' created.');
        		  }
	            
	            });
          } else {
          	logger.error("unable to create dir: "+newPath);
          	callback(new Error("unable to create dir: "+newPath),fileInfo);
          	return;
          }
        } else if (isNewDirectory == true) {
        	logger.error("unable to create dir: "+newPath);
          	callback(new Error("unable to create dir: "+newPath),fileInfo);
          	return;
        }
        if (isNewDirectory != true && fileName != undefined) {
		
		
		if (fs.existsSync(absolutePath)) {
		    logger.error(absolutePath+" already exists");
		    callback(new Error(absolutePath+" already exists"),fileInfo);
		    return;
		} else {
			logger.info("creating file: "+absolutePath);
			try {
				fs.writeFileSync(absolutePath,"{}");
			} catch (err) {
				callback(err,fileInfo);
				return;
			}
			
		}
	}
	
	callback(undefined, fileInfo);	
	});

};

exports.dirTree = dirTree;
exports.saveFile = saveFile;
