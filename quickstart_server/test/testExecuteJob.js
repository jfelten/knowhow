fs = require("fs");
var http = require('http');
var querystring = require('querystring');
var logger = require('winston');
var io =  require('socket.io-client');
var path = require('path');
var ss = require('socket.io-stream');
var fileControl = require('../routes/file-control');

console.log("starting...");


agent = {
		"host": "tb101",
		"port": 3000
};

job = {
		  "id": "weblogic 10.3.6 install",
		  "user": "weblogic",
		  "working_dir": "/tmp/weblogic",
		  "options": {
		  	"dontUploadIfFileExists": false,
		  	"timeoutms": 300000
		  },
		  "files": [
		            {
		            	"source": "leapfrog:///files/weblogic/wls1036_generic.jar",
		            	"destination": "${working_dir}"
		            },
		            {
		            	"source": "leapfrog:///files/weblogic/install/scripts/createDomain.py",
		            	"destination": "${working_dir}/scripts"
		            },
		            {
		            	"source": "leapfrog:///files/weblogic/install/wls_silent.xml",
		            	"destination": "${working_dir}"
		            },
		            {
		            	"source": "leapfrog:///files/weblogic/install/protocol.jar",
		            	"destination": "${working_dir}"
		            },
		            {
		            	"source": "leapfrog:///files/weblogic/install/TEST/leapfrog.properties",
		            	"destination": "${working_dir}"
		            },
		            {
		            	"source": "leapfrog:///files/weblogic/install/TEST/jmxremote.password",
		            	"destination": "${working_dir}"
		            },
		            {
		            	"source": "leapfrog:///files/weblogic/install/TEST/jmxremote.access",
		            	"destination": "${working_dir}"
		            }        
		            
		          ],
		  "script": {
		    "env": {
		      "MW_HOME": "/opt/weblogic2",
		      "WL_HOME": "${MW_HOME}/wlserver_10.3",
		      "DOMAIN_DIR": "${MW_HOME}/user_projects/domains",
		      "DOMAIN_NAME": "leapfrog",
		      "NM_HOME": "${DOMAIN_DIR}/${DOMAIN_NAME}",
		      "JAVA_HOME": "/usr/java/default/",
		      "WL_ADMIN_USER": "weblogic",
		      "WL_ADMIN_PASSWORD": "welcome1",
		      "BOOT_PROPS": "${DOMAIN_DIR}/${DOMAIN_NAME}/servers/AdminServer/security/boot.properties",
		      "TFILE": "out.tmp"
		    },
		    "commands": [
              "rm -rf $MW_HOME/*",
              "echo $TFILE",
              "sed \"s~/opt/weblogic~$MW_HOME~g\" ${working_dir}/wls_silent.xml > $TFILE",
              "mv $TFILE ${working_dir}/wls_silent.xml",                 
		      "java -Xmx1024M -Dspace.detection=false -jar ${working_dir}/wls1036_generic.jar -mode=silent -silent_xml=wls_silent.xml",
		      "rm -f wls_silent.xml",
		      "$MW_HOME/wlserver_10.3/common/bin/wlst.sh ${working_dir}/scripts/createDomain.py $MW_HOME ${WL_HOME} ${DOMAIN_NAME} ${JAVA_HOME} ${WL_ADMIN_USER} ${WL_ADMIN_PASSWORD}",
		      "rm -f scripts/createDomain.py",
		      "sed \"s/umask 037/umask 022\\n\\nUSER_MEM_ARGS=\\\"-Xms2056m -Xmx2056m -XX:PermSize=384m\\\"/g\" ${DOMAIN_DIR}/${DOMAIN_NAME}/bin/startWebLogic.sh > ${TFILE}",
		      "mv ${TFILE} ${DOMAIN_DIR}/${DOMAIN_NAME}/bin/startWebLogic.sh",
		      "chmod +x $MW_HOME/user_projects/domains/leapfrog/bin/startWebLogic.sh",
		      "sed \"s/umask 027/umask 022/g\" $MW_HOME/user_projects/domains/leapfrog/startNodeManager.sh > ${TFILE}",
		      "mv $TFILE $MW_HOME/user_projects/domains/leapfrog/startNodeManager.sh",
		      "chmod +x $MW_HOME/user_projects/domains/leapfrog/startNodeManager.sh",
		      "sed \"s/NODEMGR_HOME=\\\"\\\${WL_HOME}\\\/common\\\/nodemanager\\\"/NODEMGR_HOME=\\\"\\\/opt\\\/weblogic\\\/user_projects\\\/domains\\\/leapfrog\\\"/g\" $MW_HOME/user_projects/domains/leapfrog/startNodeManager.sh > ${TFILE}",
		      "mv $TFILE ${DOMAIN_DIR}/${DOMAIN_NAME}/startNodeManager.sh",
		      "chmod +x ${DOMAIN_DIR}/${DOMAIN_NAME}/startNodeManager.sh",
		      "echo \"export CLASSPATH=\\\"${DOMAIN_DIR}/${DOMAIN_NAME}/lib/protocol.jar:\\\${CLASSPATH}\\\"\" >> ${DOMAIN_DIR}/${DOMAIN_NAME}/bin/setDomainEnv.sh",
		      "echo username=${WL_ADMIN_US} > /tmp/boot.properties",
		      "echo password=${WL_ADMIN_PASSWORD} >> /tmp/boot.properties",
		      "cp -r /tmp/boot.properties ${BOOT_PROPS}",
		      "mkdir -p ${DOMAIN_DIR}/${DOMAIN_NAME}/servers/AdminServer/data/nodemanager",
		      "cp /tmp/boot.properties ${DOMAIN_DIR}/${DOMAIN_NAME}/servers/AdminServer/data/nodemanager",
		      "rm /tmp/boot.properties",
		      "chmod 400 ${working_dir}/jmxremote.password",
		      "chmod 400 ${working_dir}/jmxremote.access"
		      
		    ]
		  }
		}


var data = {
    	"agent": agent,
    	"job": job
    };

function uploadFiles(agent,jobId,files) {
	var fileProgress = {};
	var socket = io.connect('http://'+agent.host+':'+agent.port+'/upload');
	    
	    socket.on('End' ,function (data) {

	      logger.info("done uploading: "+data.fileName+" for job: "+data.jobId);
	      logger.info(data.message);
	      //socket.close();
	      //fileProgress[data.fileName].readStream.close();
	      fileProgress[data.fileName].uploadComplete=true;
	      
	    });
		socket.on ('Error', function(data) {
	    	logger.error("socket error: "+data.message);
	        socket.emit('client-upload-error', {name: data.fileName, jobId: data.jobId} );
	        socket.close();
	        //readStream.close();
		});
	
	for (uploadIndex in files) {
	    
	    
		var file = files[uploadIndex];
		var filepath= fileControl.getFilePath(file.source);
		var fileName = path.basename(filepath);
		fileProgress[fileName ] = {}
	    fileProgress[fileName].fileName=fileName;
		
		var name = filepath.split(path.sep).pop();
		var stats = fs.statSync(filepath);
		var fileSizeInBytes = stats["size"];
		
		
		var total = 0;
		try {	
		    
			var stream = ss.createStream();
			
			fileProgress[fileName].readStream = fs.createReadStream(filepath,{autoClose: true});
			ss(socket).emit('agent-upload', stream, {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination });
			fileProgress[fileName].readStream.pipe(stream );
			fileProgress[fileName].readStream.on('data', function (chunk) {
			  	total+=chunk.length;
			  	//console.log('uploading: '+total+"/"+fileSizeInBytes);
		
		    });
		    
		} catch(err) {
			logger.error(err);
			socket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
            fileProgress.error=true;
            fileProgress[fileName].readStream.close();
			socket.close();
		}
		
	}
	
	//wait and make sure all files get uploaded
	//close all sockets when done.
	timeoutms=300000;//default timeout of 5 minutes
    if (job.options.timeoutms != undefined) {
    	timeoutms=job.options.timeoutms;
    }
    
    var timeout = setTimeout(function() {
    	clearInterval(fileCheck);
    	job.status=("Upload timeout - required files not sent.");
    	logger.error("upload timed out for: "+jobId);
    	for (index in job.fileProgress) {
    		socket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
        	fileProgress[index].readStream.close();
        }
        socket.close();
    }, timeoutms);
    
    var checkInterval = 2000; //2 seconds
    //wait until all files are receeived
    var fileCheck = setInterval(function() {
    	
    	numFilesUploaded=0;
    	for (index in fileProgress) {
    		var uploadFile = fileProgress[index];
    		if (uploadFile.uploadComplete == true) {
    		    numFilesUploaded++;
    		    if (numFilesUploaded >= job.files.length) {
    		    	logger.info(job.id+" all files sent...");
	    			for (index in job.fileProgress) {
			    		fileProgress[index].readStream.close();
			        }
			        socket.close();
			       	clearTimeout(timeout);
	    			clearInterval(fileCheck);
	    		}  		
    		} else if (uploadFile.error == true) {
    			logger.error(job.id+" error aborting upload.");
    			uploadFile.socket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
        		
        		for (index in job.fileProgress) {
		    		fileProgress[index].readStream.close();
		    		socket.emit('client-upload-error', {name: fileName, jobId: jobId, fileSize: fileSizeInBytes, destination: file.destination } );
		        }
		        socket.close();
		        clearTimeout(timeout);
    			clearInterval(fileCheck);
    		}
    	}
    	logger.debug(numFilesUploaded+ " of "+job.files.length+" files sent.");
    }, checkInterval);
	
	
}


executeJobOnAgent = function( agent, job) {
	var headers = {
		    'Content-Type' : 'application/json',
		    'Content-Length' : Buffer.byteLength(JSON.stringify(job) , 'utf8'),
		    'Content-Disposition' : 'form-data; name="script"'
		};

	// the post options
	var options = {
	    host : agent.host,
	    port : agent.port,
	    path : '/api/execute',
	    method : 'POST',
	    headers : headers
	};

	logger.info('Starting Job: '+job.id);

	// do the POST call
	var reqPost = http.request(options, function(res) {
		logger.debug("statusCode: ", res.statusCode);
	    // uncomment it for header details
		logger.debug("headers: ", res.headers);

	    res.on('data', function(d) {
	    	logger.debug('result:\n');
	        process.stdout.write(d);
	        logger.debug('\n\nPOST completed. uploading files');
	        uploadFiles(agent,job.id,job.files);
	        var eventSocket = io.connect('http://'+agent.host+':'+agent.port+'/job-events');
			eventSocket.on('job-update', function(job){
				//logger.debug("job update");
				logger.debug(job.progress+" "+job.status);
			});
			eventSocket.on('job-complete', function(job){
				logger.info('Completed Job: '+job.id);
				eventSocket.close();
				clearTimeout(timeout);
			});
			eventSocket.on('job-error', function(job){
				logger.info('Stopping Job: '+job.id+ ' due to error.');
				eventSocket.close();
				clearTimeout(timeout);
			});
			eventSocket.on('job-cancel', function(job){
				logger.info('job: '+job.id+ ' cancelled.');
				eventSocket.close();
				clearTimeout(timeout);
			});
			
			var timeoutms=600000; //10 minutes default timeout
			if (job.options.timeoutms != undefined) {
				timeoutms=job.options.timeoutms;
				logger.debug('setting timeout to" '+timeoutms);
			}
			var timeout = setTimeout(function() {
		    	job.status=("Job timeout");
		    	logger.error("time out for: "+job.id+' cancelling');
		    	eventSocket.emit('job-cancel',job);
		    	//eventSocket.destroy();
		    }, timeoutms);
	    });
	});


	reqPost.write(JSON.stringify(job));
	reqPost.end();
	reqPost.on('error', function(e) {
	    logger.error(e);
	});
};




agent ={
		host: 'localhost',
		port: 3000
};

//var job_file = fileControl.getFilePath('leapfrog:///jobs/weblogic/wls1036_install.json');
//job = JSON.parse(fs.readFileSync(job_file), 'utf8');
executeJobOnAgent(agent,job);
