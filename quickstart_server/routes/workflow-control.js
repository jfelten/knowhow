var logger=require('./log-control').logger;
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();
var agentControl=require('./agent-control');
var executionControl = require('./execution-control')
var api = require('./api')

var runningTasks = {};

exports.initAgents = function(req, res) {
	var credentials = req.body.credentials;
	var agents = req.body.agents;
	if (agents && credentials) {
		initAgents(credentials, agents, function(err, agents) {
			if (err) {
				logger.error(err.message);
				res.send(500, err);
			} else {
				res.json(agents);
			}
		});
	} else {
		if (!agents) {
			logger.error("agents is not defined.")
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
	for (index in agents) {
		var agent = agents[index];
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
					initAgent.login = credentials.login;
					initAgent.password = credentials.password;
					logger.info("initializing agent: "+initAgent.login+"@"+initAgent.host+":"+initAgent.port);
					agentControl.addAgent(initAgent, api.getServerInfo());
					callback();
				});
			}
		}.bind({agent: agents[index]}) ;
			
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
	loadAgentsForEnvironment(environment, function (err, environment) {
		if (err) {
			res.send(500, err);
			return;
		} else {
			res.json(environment);
		}
	});
};

loadAgentsForEnvironment = function(environment, callback) {

	if (environment.agents) {
		this.environment = environment;
		var queries = new Array(environment.agents.length);
		for (var i =0; i< environment.agents.length; i++) {
			queries[i] = function(callback) {
				logger.debug("index="+this.index);
				logger.debug(environment.agents[this.index]);
				agentControl.loadAgent(environment.agents[this.index], function(err, loadedAgent) {
					if (loadedAgent) {
						environment.agents.splice(this.index, 1);
						environment.agents.push(loadedAgent);
					}
					callback();
				});
			}.bind({index: i});
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
	
	verifyAgents(agents, function(err) {
		if (err) {
			logger.error("no all agents available");
		}
		
		var completedTasks = new Array( workflow.taskList.length);
		for (task in workflow.taskList) {
			performTask(task, function(err,task){
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
	
	});

};
exports.execute = execute;


seriesTask = function(task, callback) {
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

paralellTask = function(task, callback) {
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
	
	async.paralell(executeTasks,function(err,task) {
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

jobTask = function(agent, job, callback) {

	executeControl.executeJob(agent, job, function(err) {
		if (err) {
			callback(err,agent, job);
		}
		callback(undefined, agent, job);
	});

};


var taskTypes = {
	seriesTask : seriesTask,
	paralellTask: paralellTask,
	jobTask: jobTask
};

performTask = function(task,callback) {
	
	taskTypes[task.type](task, callback);
};

var eventHandler = function() {


	agentControl.eventEmitter.on('agent-error', function(agent) {
		
		if (agent) {
			//see if the agent is part of a running task
			for (task in runningJobs) {
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
			for (task in runningJobs) {
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
			
			runningJobs[taskId].agentJobs[job.id] = job;
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
		runningJobs[taskId].agentJobs[job.id].callback(err);
		return;
	}
	runningJobs[taskId].agentJobs[job.id].callback();
		
}

var completeTask = function(taskId,err) {
	if (err) {
		runningJobs[taskId].status = "ERROR";
	} else {
		runningJobs[taskId].status = "COMPLETE";
	}
}

