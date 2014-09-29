var logger=require('./log-control').logger;
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var eventEmitter = new EventEmitter();

var executionControl = require('./execution-control')

var runningTasks = {};


verifyAgents = function(agents, callback) {

	callback(undefined);
}

execute = function(workflow,callback) {

	var agents = workflow.agents;
	
	verifyAgents(agents, function(err) {
		if (err) {
			logger.error("no all agents available");
		}
		
		performTask(workflow.task, function(err,task){
			if(err) {
				callback(err, task)
				return;
			}
			callback(undefined,task);
			
		});
		
	
	});

};
exports.execute = execute;


seriesTask = function(task, callback) {
	var subtasks = task.subtasks;
	var agent = task.agent
	var executeTasks = new Array[jobs.length];
	runningTasks[task.id] = task;
	for (var index=0; index< subtasks.length; index++;) {
		executeTasks[index] = function(callback,agent, task) {
			performTask(this.task);
		}.bind({task: subtasks[index]}, agent: agent);
	}
	
	async.series(executeTasks,function(err,job) {
		if (err) {

			logger.error('job error' + err);
			task.progress=0;
			task.status=err.syscall+" "+err.code;
			eventEmitter.emit('task-error',task, agent, job));
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
	for (var index=0; index< subtasks.length; index++;) {
		executeTasks[index] = function(callback,agent, task) {
			performTask(this.task);
		}.bind({task: subtasks[index]}, agent: agent);
	}
	
	async.paralell(executeTasks,function(err,task) {
		if (err) {

			logger.error('job error' + err);
			task.progress=0;
			task.status=err.syscall+" "+err.code;
			eventEmitter.emit('task-error',task, agent, job));
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

jobTask = function(job, callback) {

	executeControl.executeJob(this. agent, this.job, function(err) {
		if (err) {
			callback(err,agent, job);
		}
		callback(undefined, agent, job);
	});

};


var taskTypes = {
	seriesTask : seriesTask,
	paralellTask: paralellTask
	jobTask: jobTask;
}

performTask = function(task) {
	
	taskTypes[task.type](task);
};

