fs = require("fs");
var http = require('http');
var querystring = require('querystring');
var logger = require('winston');
var io =  require('socket.io-client');
var pathlib = require('path');
var ss = require('socket.io-stream');
var fileControl = require('../routes/file-control');
var executionControl = require('../routes/execution-control');
var agentControl = require('../routes/agent-control');
var AgentEventHandler = require('../routes/agent-events');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var ioServer = require('socket.io')(http);
http.listen(3333);
var agentEventHandler = new AgentEventHandler(ioServer);
console.log("starting...");


job = {
  "id": "weblogic 10.3.6 install",
  "user": "weblogic",
  "working_dir": "/tmp/weblogic",
  "options": {
    "dontUploadIfFileExists": true,
    "timeoutms": 3600000
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
      "MW_HOME": "/opt/weblogic",
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
      "sed \"s~MW_HOME~$MW_HOME~g\" ${working_dir}/wls_silent.xml > $TFILE",
      "mv $TFILE ${working_dir}/wls_silent.xml",
      "java -Xmx1024M -Dspace.detection=false -jar ${working_dir}/wls1036_generic.jar -mode=silent -silent_xml=wls_silent.xml",
      "rm ${working_dir}/wls_silent.xml",
      "$MW_HOME/wlserver_10.3/common/bin/wlst.sh ${working_dir}/scripts/createDomain.py $MW_HOME ${WL_HOME} ${DOMAIN_NAME} ${JAVA_HOME} ${WL_ADMIN_USER} ${WL_ADMIN_PASSWORD}",
      "rm -f scripts/createDomain.py",
      "sed \"s/umask 037/umask 022\\n\\nUSER_MEM_ARGS=\\\"-Xms2056m -Xmx2056m -XX:PermSize=384m\\\"/g\" ${DOMAIN_DIR}/${DOMAIN_NAME}/bin/startWebLogic.sh > ${TFILE}",
      "mv ${TFILE} ${DOMAIN_DIR}/${DOMAIN_NAME}/bin/startWebLogic.sh",
      "chmod +x $MW_HOME/user_projects/domains/leapfrog/bin/startWebLogic.sh",
      "sed \"s/umask 027/umask 022/g\" $MW_HOME/user_projects/domains/leapfrog/startNodeManager.sh > ${TFILE}",
      "mv $TFILE $MW_HOME/user_projects/domains/leapfrog/startNodeManager.sh",
      "chmod +x $MW_HOME/user_projects/domains/leapfrog/startNodeManager.sh",
      "sed \"s/NODEMGR_HOME=\\\"\\${WL_HOME}\\/common\\/nodemanager\\\"/NODEMGR_HOME=\\\"\\/opt\\/weblogic\\/user_projects\\/domains\\/leapfrog\\\"/g\" $MW_HOME/user_projects/domains/leapfrog/startNodeManager.sh > ${TFILE}",
      "mv $TFILE ${DOMAIN_DIR}/${DOMAIN_NAME}/startNodeManager.sh",
      "chmod +x ${DOMAIN_DIR}/${DOMAIN_NAME}/startNodeManager.sh",
      "echo \"export CLASSPATH=\\\"${DOMAIN_DIR}/${DOMAIN_NAME}/lib/protocol.jar:\\${CLASSPATH}\\\"\" >> ${DOMAIN_DIR}/${DOMAIN_NAME}/bin/setDomainEnv.sh",
      "echo username=${WL_ADMIN_USER} > /tmp/boot.properties",
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




agent ={
		_id:"Ah4WQBMiGtS5pA7b",
//		host: '23.92.65.207',
		host: 'tb101',
//		host: 'localhost',
		port: 3000
};



agentControl.heartbeat(agent, function (err) {
	if (err) {
		logger.error("unable to contact agent: "+agent.user+"@"+agent.host+":"+agent.port);
		return;
	}
	console.log("contacted");
	agentEventHandler.listenForAgentEvents(agent, function(err) {
		if(err) {
			logger.error("unable to receive events for: "+agent.user+"@"+agent.host+":"+agent.port);
			return;
		}
		logger.info("receiving events from: "+agent.user+"@"+agent.host+":"+agent.port);
	});
});

ioServer.on('job-cancel', function(agent,job) {
	logger.error("job cancelled");
});
	

//var job_file = fileControl.getFilePath('leapfrog:///jobs/weblogic/wls1036_install.json');
//job = JSON.parse(fs.readFileSync(job_file), 'utf8');
executionControl.executeJob(agent,job, function(err, message) {

	executionControl.updateJob(agent, job, function() {
				//executionControl.eventEmitter.emit('job-update',agent, job);
			});
	if (err) {
		logger.error(err);
	} else {
		logger.info(message);
	}
});
