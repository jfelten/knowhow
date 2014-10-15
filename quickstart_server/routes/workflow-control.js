var logger=require('./log-control').logger;
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
var agentControl=require('./agent-control');
var fileControl=require('./file-control');
var executeControl = require('./execution-control')
var api = require('./api')

var runningTasks = {};

exports.initAgents = function(req, res) {
	var credentials = req.body.credentials;
	var environment = req.body.environment;
	if (environment.agents && credentials) {
		initAgents(credentials, environment.agents, function(err, agents) {
			if (err) {
				logger.error(err.message);
				res.send(500, err);
			} else {
				res.json(agents);
			}
		});
	} else {
		if (!environment) {
			logger.error("environment is not defined.")
		}
		if (!credentials) {
			logger.error("credentials is not defined.")
		}
		if (credentials && !credentials.login) {
			logger.error("no login passed")
		}
		if (credentials && !credentials.password) {
			logger.error("no password")
		}
		res.send(500, new Error("agents and credentials are required"));
	}
}

initAgents = function(credentials, agents, callback) {
	var agentInits = new Array(agents.length);
	logger.info("workflow-control init agents");
	logger.debug(agents);
	var index=0;
	for (designation in agents) {
		logger.debug("initializing: "+designation);
		agentInits[index] = function(callback) {
			var initAgent = this.agent;
			logger.debug("initAgent status="+initAgent.status);
			if (initAgent.status != 'READY') {
				logger.debug(initAgent);
				agentControl.deleteAgent(initAgent, function(err, numRemoved) {
					if (err) {
						logger.error("unable to delete agent: "+initAgent.login+"@"+initAgent.host+":"+initAgent.port);
						callback(err, agents);
						return;
					}
					newAgent = {}; //order of the attributes matters
					newAgent.login = credentials.login;
					newAgent.password = credentials.password;
					newAgent.host =  initAgent.host;
					
					if (credentials.user) {
						newAgent.user = credentials.user;
					} else {
						newAgent.user = credentials.login;
					}
					newAgent.port =  parseInt(initAgent.port);
					logger.info("initializing agent: "+newAgent.user+"@"+newAgent.host+":"+newAgent.port);
					agentControl.addAgent(newAgent, api.getServerInfo());
					callback();
				});
			} else if (callback) {
				callback();
			}
		}.bind({agent: agents[designation]}) ;
		index++;
	}
	async.parallel(agentInits,function(err) {
			if (err) {
				if (callback) {
					callback(err);
				}
			}
			else {
				if (callback) {
					callback(undefined, agents);
				}
			}
			return;
		});
	
}



exports.loadAgentsForEnvironment = function(req, res) {
	var environment = req.body.environment;
	loadAgentsForEnvironment(environment, function (err, loadedEnvironment) {
		if (err) {
			res.send(500, err);
			return;
		} else {
			logger.debug("loaded env: ");
			logger.debug(loadedEnvironment);
			res.json(loadedEnvironment);
		}
	});
};

loadAgentsForEnvironment = function(environment, callback) {

	if (environment.agents) {
		this.environment = environment;
		var queries = new Array(environment.agents.length);
		var i = 0;
		for (designation in environment.agents) {
			queries[i] = function(callback) {
				var designation = this.designation;
				logger.debug("loading agent for: "+designation);
				logger.debug(environment.agents[designation]);
				agentControl.loadAgent(environment.agents[designation], function(err, loadedAgent) {
					if (loadedAgent) {
						environment.agents[designation]=loadedAgent;
					}
					logger.debug(environment.agents[designation]);
					callback();
				});
			}.bind({designation: designation});
			i++;
		}
		async.parallel(queries,function(err) {
			if (err) {
				if (callback) {
					callback(err);
				}
			}
			else {
				if (callback) {
					logger.debug(environment);
					callback(undefined, environment);
				}
			}
			return;
		});
	} else if (callback) {
		callback(undefined,environment);
	}
}

execute = function(environment,workflow,callback) {

	var agents = workflow.agents;
	
	//verifyAgents(agents, function(err) {
	//	if (err) {
	//		logger.error("no all agents available");
	//		callback
	//	}
		
		var completedTasks = new Array( workflow.taskList.length);
		for (taskIndex in workflow.taskList) {
			var task =  workflow.taskList[taskIndex];
			logger.debug(task);
			performTask(environment, task, function(err,task){
				if(err) {
					completedTasks[task.id] = {
						status : "ERROR",
						message: err.message
					};
					callback(err, completedTasks)
					return;
				}
				completedTasks[task.id] = {
						status : "COMPLETE",
						message: "success"
					};
				
			});
		}
		callback(undefined, completedTasks);
	
	//});

};
exports.executeWorkflow = function(req, res) {
	var environment = req.body.environment;
	var workflow = req.body.workflow;
	if (environment && workflow) {
		execute(environment, workflow, function(err, runWorkflow) {
			if (err) {
				logger.error(err.message);
				res.json(500, {"message": err.message} );
				//res.send(500, err);
				return;
			} else {
				res.json(runWorkflow);
			}
		});
	} else {
		if (!environment) {
			logger.error("environment is not defined.")
		}
		if (!workflow) {
			logger.error("workflow is not defined.")
		}
		res.send(500, new Error("environment and workflow are required"));
	}
};


seriesTask = function(environment, task, callback) {
	var subtasks = task.subtasks;
	var agent = task.agent
	var executeTasks = new Array[jobs.length];
	runningTasks[task.id] = task;
	for (var agentIndex=0; agentIndex< task.agents.length; agentIndex++) {
		var agent = task.agents[agentIndex];
		for (var index=0; index< task.jobs.length; index++) {
			var job = task.jobs[index];
			executeTasks[index] = function(callback) {
				jobTask(this.agent, this.job, callback);
			}.bind({agent: agent, job: job});
		}
	}
	
	async.series(executeTasks,function(err,job) {
		if (err) {

			logger.error('job error' + err);
			task.progress=0;
			task.status=err.syscall+" "+err.code;
			eventEmitter.emit('task-error',task, agent, job);
			clearInterval(progressCheck);
			callback(err,task);
			return;
		}
		task.progress=0;
		task.status=job.id+" complete";
		eventEmitter.emit("task-complete", agent, task);
		
		clearInterval(progressCheck);
        logger.info("done");
        callback(undefined,task);
    });
};

paralellTask = function(environment, task, callback) {
	var job = task.job;
	logger.info("executing paralell task");
	logger.debug(task);
	
	initRunningTask(environment,task, function(err, initializedTask){
		if (err) {
			logger.error("unable to initialize "+task.id);
			callback(err,task);
			return;
		}
	
		logger.debug(initializedTask);
		var executeTasks = new Array(task['agents'].length);
		for (designation in initializedTask.agents) {
			var agent = task.agents[designation];
			var job = task.job;
			
			executeTasks.push(function(callback) {
				logger.debug("submitting "+this.job.id+" to: "+this.agent.designation);
				jobTask(initializedTask, this.agent, this.job, callback);
			}.bind({agent: agent, job: initializedTask.job}));
			
		}
		async.parallel(executeTasks,function(err,task) {
		if (err) {

			logger.error('job error' + err);
			task.progress=0;
			task.status=err.syscall+" "+err.code;
			eventEmitter.emit('task-error',task, agent, job);
			clearInterval(progressCheck);
			callback(err,task);
			return;
		}
		task.progress=0;
		task.status=job.id+" submitted for execution.";
		eventEmitter.emit("task-update", agent, task);
		
		clearInterval(progressCheck);
        logger.info("done");
        
        callback(undefined,task);
    });
		
	});
	
	
	
};

var initRunningTask = function(environment, task, callback) {

	if (!runningTasks[task.id]) {
		runningTasks[task.id] = {};
		runningTasks[task.id].agentJobs = {};
	}
	for (designation in environment.agents) {
		var agent = environment.agents[designation];
		if (!runningTasks[task.id][agent._id]) {
			runningTasks[task.id].agentJobs[agent._id] = {};
		}
	}
	if (task.jobref) {	
		logger.debug("loading: "+task.jobref);
		fileControl.load(task.jobref, function(err,content) {
			if (err) {
				callback(err);
				return;
			}
			job = JSON.parse(content);
			task.job = job;
			loadTaskAgents(environment, task);
			logger.info(task.id+" initialized.");
			if (callback) {
				callback(undefined, task);
			}
			return;
			
		});
	} else {
		loadTaskAgents(environment, task);
		if (callback) {
			callback(undefined, task);
		}
		
	}
	
};

var loadTaskAgents = function(environment, task) {
	for (var agentIndex=0; agentIndex < task.agents.length; agentIndex++) {
		var designation = task.agents[agentIndex];
		logger.debug("loading agent info for: "+designation);
		task.agents[agentIndex] = environment.agents[designation];
	}
};

jobTask = function(task, agent, job, callback) {
	if (task && agent && job) {
		logger.info("executing: "+job.id+" of "+task.id+" on "+agent.host);
		logger.debug(task);
		logger.debug(job);
		logger.debug(agent);
		
		runningTasks[task.id].agentJobs[agent._id][job.id]=job;
		executeControl.executeJob(agent, job, function(err) {
			if (err) {
				logger.error("unable to start task");
				eventEmitter.emit('task-error',task,agent,job);
			}
			logger.info(job.id+" submitted for execution to "+agent.host);
			runningTasks[task.id].agentJobs[agent._id][job.id] = job;
			runningTasks[task.id].agentJobs[agent._id][job.id].callback = callback;
			runningTasks[task.id].agentJobs[agent._id][job.id].taskId = task.id;
		});
		
	} 
	else {
		logger.error("Unable execute: ");
		var taskOutput = (!task ? "task is defined" : task.id )
		logger.error(taskOutput);
		var agentOutput = (!agent ? "agent is undefined" : "on "+agent.designation+" "+agent.user+"@"+agent.host+":"+agent.port);
		logger.error(agentOutput);
		var jobOutput = (!job ? "job is undefined" : job.id);
		logger.error(jobOutput);
	}

};


var taskTypes = {
	series : seriesTask,
	paralell: paralellTask,
	job: jobTask
};

performTask = function(environment, task,callback) {
	
	taskTypes[task.type](environment,task, callback);
};

var eventHandler = function() {

	agentControl.eventEmitter.on('agent-error', function(agent) {
		
		if (agent) {
			//see if the agent is part of a running task
			for (task in runningTasks) {
				var index = task.agentJobs.map(function(e) { return e.agentId; }).indexOf(agent._id);
				if (index > -1) {
					completeTask(task.id,new Error("Agent: "+agent.designation+"("+agent.user+"@"+agent.host+":"+agent.host+") errored out before task"));
				
				}
			}
		}
		
	});

	agentControl.eventEmitter.on('agent-delete', function(agent) {
		if (agent) {
			//see if the agent is part of a running task
			for (task in runningTasks) {
				var index = task.agentJobs.map(function(e) { return e.agentId; }).indexOf(agent._id);
				if (index > -1) {
					completeTask(task.id,new Error("Agent: "+agent.designation+"("+agent.user+"@"+agent.host+":"+agent.host+") was deleted before task completion"));
				
				}
			}
		}
	});

	executionControl.eventEmitter.on('job-update', function(agent, job) {
		logger.info('broadcasting job update.');
		
		if (agent && job) {
			 var taskId = job.taskId;
			
			runningTasks[taskId].agentJobs[job.id] = job;
		}

	});
	executionControl.eventEmitter.on('job-cancel', function(agent, job) {
		
		if (agent && job) {
			 var taskId = job.taskId;
			 completeTaskJob(taskId, agent, job, new Error(job.id+" cancelled."));
		}
	});
	executionControl.eventEmitter.on('job-complete', function(agent, job) {
		
		if (agent && job) {
			 var taskId = job.taskId;
			 completeTaskJob(taskId, agent, job);
		}

	});
	executionControl.eventEmitter.on('job-error', function(agent, job) {
		if (agent && job) {
			 var taskId = job.taskId;
			 completeTaskJob(taskId, agent, job, new Error(job.status));
		}
	});

}

var completeTaskJob = function(taskId, agent, job, err) {

	if (err) {
		runningTasks[taskId].agentJobs[agent._id][job.id].callback(err);
		return;
	}
	runningTasks[taskId].agentJobs[agent._id][job.id].status="COMPLETE";
	runningTasks[taskId].agentJobs[agent._id][job.id].callback();
	
	for (agentJob in runningTasks[taskId].agentJobs) {
		for (job in agentJob) {
			if (job.status != "COMPLETE")  {
				return;
			}
		}
	}
	
	completeTask(taskId);
	
		
}

var completeTask = function(taskId, err) {
	if (err) {
		runningTasks[taskId].status = "ERROR";
		eventEmitter.emit("task-error", runningTasks[taskId]);
		returnl
	} else {
		runningTasks[taskId].status = "COMPLETE";
		eventEmitter.emit("task-complete", runningTasks[taskId]);
	}
}

