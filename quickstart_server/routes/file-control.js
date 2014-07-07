var fs = require('fs');
path = require('path');

dirTree = function (filename) {
    var stats = fs.lstatSync(filename),
        info = {
            path: filename,
            label: path.basename(filename),
            ext:  path.extname(filename)
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
}

if (module.parent == undefined) {
    // node dirTree.js ~/foo/bar
    var util = require('util');
    console.log(util.inspect(dirTree(process.argv[2]), false, null));
}

exports.dirTree = dirTree;