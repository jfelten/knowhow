async = require("async");
fs = require("fs");
url = require("url");
<<<<<<< HEAD
var http = require("http");
=======
var http = require("http")
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b

script = {
	"id" : "atg 10.2 install",
	"script" : {
		"working_dir" : "/opt/atg",
		"download_dir": ".",
<<<<<<< HEAD
		"files" : [ "/repo/node/node-v0.10.28-linux-x64.tar.gz", 
=======
		"downloads" : [ "/repo/node/node-v0.10.28-linux-x64.tar.gz", 
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
		                "http://localhost:3001/repo/node/node-v0.10.28-linux-x64.tar.gz"
		              ],
		"env" : {
			"ATG_VERSION" : "10.2",
			"ATG_HOME" : "/opt/atg/${ATG_VERSION}/home",
			"DYNAMO_ROOT" : "/opt/atg/${ATG_VERSION}",
			"DYNAMO_HOME" : "${ATG_ROOT}/home",
			"JAVA_HOME" : "/usr/java/jdk1.7.0_45",
			"JAVA_VM" : "/usr/java/jdk1.7.0_45/bin/java",
			"ANT_HOME" : "/opt/ant/1.9.0",
			"ECOM_INSTALL_PROPS" : "ecom_install.props",
			"ACC_INSTALL_PROPS" : "acc_install.props",
			"CSC_INSTALL_PROPS" : "csc_install.props",
			"SEARCH_INSTALL_PROPS" : "srch_install.props",
			"ECOM_PATCH_PROPS" : "ecom_patch.props",
			"ACC_PATCH_PROPS" : "acc_patch.props",
			"CSC_PATCH_PROPS" : "csc_patch.props",
			"SEARCH_PATCH_PROPS" : "srch_patch.props"
		},
		"install_commands" : [ "yum -y install qs_ATG_10.2", "unzip V377*",
				"chmod +x ATG*.bin", "./ATG*.bin -f ${ECOM_INSTALL_PROPS}",
				"echo \"installing patch\"",
				"yum -y install qs_ATG_PATCH_10.2.0.3", "unzip V3779*",
				"chmod +x ATG*.bin", "./ATGv79*.bin -f ${ECOM_PATCH_PROPS}" ]
	}
};

serverInfo = {
		host: "localhost",
		ip: "127.0.0.1",
		port: 3001
};

download = function(script,serverInfo) {
	commands = script.script.install_commands;
<<<<<<< HEAD
	downloads = script.script.files;
=======
	downloads = script.script.downloads;
>>>>>>> 75c5a8c97f75efbc50a66bb4b813b4857deacc1b
	downloadslength = (downloads!=undefined)?downloads.length:0;
	var numProgressSteps =  commands.length+((downloads!=undefined)?downloads.length:0) +1;
	console.log(numProgressSteps+"="+commands.length+"+"+downloadslength+"+1");
	async.each(downloads,

		  // 2nd parameter is the function that each item is passed into
		  function(download, callback) {
			//logger.info("getting script install files:");
			var downloadDir = script.script.download_dir;
			if (downloadDir == undefined) {
				downloadDir = "."
			};
		    fs.stat(downloadDir, function (err, stat) {
		        if (err) {
		          // file does not exist
		          if (err.errno == 2) {
		            fs.mkdir(downloadDir);
		          }
		        }
		    });
			console.log(download.indexOf("/"));
		    if (download.indexOf("/") === 0 ) {
				downloadURL = "http://"+serverInfo.ip+":"+serverInfo.port+download;
			}
		    
		    var file_name = downloadDir+"/"+url.parse(download).pathname.split('/').pop();
		    console.log("downloading: "+file_name+" from: "+downloadURL);
			var file = fs.createWriteStream(file_name);
			  var request = http.get(downloadURL, function(response) {
			    response.pipe(file);
			    file.on('finish', function() {
			      file.close();
			      callback();
			    });
			    
			  });
			  
			  request.on("error", function(err){
				  console.log("unable to download: "+download);
			  });

			
		
		  },
		  // 3rd parameter is the function call when everything is done
		  function(err){
		    // All tasks are done now
		    console.log("All files downloaded");
		  }
		);
};

download(script, serverInfo);