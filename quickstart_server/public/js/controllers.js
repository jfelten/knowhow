'use strict';

/* Controllers */

var myModule = angular.module('myApp.controllers', []).
  controller('AppCtrl', function ($scope, $http) {

    $http({
      method: 'GET',
      url: '/api/serverInfo'
    }).
    success(function (data, status, headers, config) {
      $scope.serverInfo = data;
    }).
    error(function (data, status, headers, config) {
      $scope.name = 'Error!';
    });

  }).
  controller('AddAgentController', function ($scope, $http, $location) {
	
	console.log('starting add agent controller');  
	$scope.master = {};
	  
	    
    $scope.form = {};
    $scope.test = ['sd','sdsds','dsdsd'];

    var socket = io();

    socket.on('agent-update', function(agent){
      console.log('agent update message received');
//      var agent_status_box = document.getElementById(agent._id+'_status');
//      var agent_message_box = document.getElementById(agent._id+'_messages');
//      if (agent_message_box != undefined) {
//    	  agent_message_box.textContent = agent.message;
//      }
//      if (agent_status_box != undefined) {
//    	  agent_status_box.textContent = agent.status;
//      }
      $http.get('/api/connectedAgents').
      success(function(data) {
      	$scope.connectedAgents = data;
      });
      
    });
    
    socket.on('agent-error', function(agent){
        console.log('agent error message received');
//        var agent_status_box = document.getElementById(agent._id+'_status');
//        var agent_message_box = document.getElementById(agent._id+'_messages');
//        if (agent_message_box != undefined) {
//      	  agent_message_box.textContent = agent.message;
//        }
//        if (agent_status_box != undefined) {
//      	  agent_status_box.textContent = agent.status;
//        }
		$scope.message = agent.message;
		$http.get('/api/connectedAgents').
	      success(function(data) {
	      	$scope.connectedAgents = data;
	      });
        
      });
    socket.on('agent-add', function(agent){
    	$http.get('/api/connectedAgents').
        success(function(data) {
        	$scope.connectedAgents = data;
        });
    });
    
    $http.get('/api/connectedAgents').
    success(function(data) {
    	$scope.connectedAgents = data;
    });
    

    $scope.addAgent = function (agent) {
    	$scope.message = undefined;
    	$scope.master = angular.copy(agent);
    	$http.post('/api/addAgent', agent).
        success(function(data) {
        	$scope.connectedAgents = data;
        	//location.reload(); 
        });
    };
    
    $scope.deleteAgent = function (agent_id) {
    	$scope.message = undefined;
    	$http.post('/api/deleteAgent', agent_id).
        success(function(data) {
        	$scope.connectedAgents = data;
        	//location.reload(); 
        });
    };
	  
    $scope.tabs = [
                   { title:'Dynamic Title 1', content:'Dynamic content 1' },
                   { title:'Dynamic Title 2', content:'Dynamic content 2', disabled: true }
                 ];

     $scope.alertMe = function() {
       setTimeout(function() {
         alert('You\'ve selected the alert tab!');
       });
     };
  }).
  controller('JobsController', function ($scope, $modal, $http, $log, qs_repo) {
  
    
    $scope.runningJobs = {};
    var loadJobs = function() {
    	$http.get('/api/runningJobsList').
	    success(function(data) {
	    	$scope.runningJobs = data;
	    });
    };
    loadJobs();
    
	    
  	var socket = io();

    socket.on('job-update', function(agent,job){
      console.log('job update message received');
      //loadJobs();
      if (agent && job) {
        if (!$scope.runningJobs[agent._id]) {
        	$scope.runningJobs[agent._id] = {};
        	$scope.runningJobs[agent._id][job.id] = {}
        } else if (!$scope.runningJobs[agent._id][job.id]) {
        	$scope.runningJobs[agent._id][job.id] = {}
        }
      	$scope.runningJobs[agent._id][job.id].progress=job.progress;
      	$scope.runningJobs[agent._id][job.id].status=job.status;
	  	$scope.$apply();
	  }
      
    });
    socket.on('job-complete', function(agent,job){
      console.log('job complete message received');
      loadJobs();
	  $scope.$apply();
      
    });
    socket.on('job-cancel', function(agent,job){
      console.log('job cancel message received');
      loadJobs();
	  $scope.$apply();
      
    });
    socket.on('job-error', function(agent,job){
      console.log('job error message received');
      loadJobs();
	  $scope.$apply();
      
    });
	 $scope.toggled = function(open) {
		    console.log('Dropdown is now: ', open);
		  };
	
	  $scope.toggleDropdown = function($event) {
	    $event.preventDefault();
	    $event.stopPropagation();
	    $scope.status.isopen = !$scope.status.isopen;
	    
	  };
  
  	  $http.get('/api/repoList').
	    success(function(data) {
	    	$scope.fileRepos = data;
	    	//qs_repo.loadRepo($scope, 'leapfrog:');
	    });
  	
	  var options = {
	    mode: 'code',
	    modes: ['code', 'form', 'text', 'tree', 'view'], // allowed modes
	    error: function (err) {
	      console.log(err.toString);
	      alert(err.toString());
	    }
	  };
	  
	  var container = document.getElementById('jsoneditor');
	  var editor = new JSONEditor(container,options);
	  var tree_handler = function(branch) {
	      console.log('selection='+branch.label+ ' navigating='+navigating+' ext='+branch.ext+' type='+branch.type);
	      $scope.selectedFile = branch; 
	      $scope.message = undefined;
	      if (navigating == false && '.json' == branch.ext) {
	    	  qs_repo.loadFile($scope.selectedRepo, branch.path, function(err,data) {
	    	  	editor.set(data, function(err) {
	      		    		console.log(err);
	      		    	});
	    	  }); 
	      }
	    	  
    	};
	  //tree controls
	
	  //$scope.addFile = addFile;
	  $scope.deleteFile = function () {
	  	qs_repo.deleteFile($scope.selectedFile, $scope.selectedRepoName, false, function(err,data) {
	  		var deleted_branch = $scope.selectedFile;
	  		if (tree.get_parent_branch(deleted_branch)) {
	  			var parent_branch = tree.get_parent_branch(deleted_branch);
	  			tree.select_branch(parent_branch);
	  			var newChildren = [];
	  			var oldChildren = tree.get_children(parent_branch);
	  			for (var child in oldChildren) {
	  				console.log(child.path+" "+deleted_branch.path);
	  				if (oldChildren[child].path != deleted_branch.path) {
	  					newChildren.push(oldChildren[child]);
	  				} else {
	  					console.log("removing deleted branch from tree");
	  				}
	  			}
	  			console.log(parent_branch);
	  			console.log(newChildren);
	  			parent_branch.children =  newChildren;
	  		} else {
	  			$scope.selectRepo($scope.selectedRepoName);
	  		}
	  	});
	  };
	  $scope.jobs_tree_handler = tree_handler;
	  $scope.saveJob = function() {
	  	if($scope.selectedFile) {
			  qs_repo.saveFile($scope.selectedFile.path, editor.get(), function(err, message) {
			  	$scope.message = message;
			  });
		}
	  };
	  var jobs = [] ;
	  var tree;
	  $scope.job_tree = tree = {};
	  $scope.jobs = jobs;
	  $scope.loading_jobs = false;
	  
	
	$scope.addFile = function() {
		qs_repo.openNewFileModal($scope.selectedFile, $scope.selectedRepoName, 'addFile');
		
	}
	  $http.get('/api/connectedAgents').
	    success(function(data) {
	    	$scope.connectedAgents = data;
	    });
	  
	  $scope.selectAgent = function(agent) {
		  $scope.selectedAgent = agent;
		  console.log('selected agent: '+agent);
		  $scope.status.isopen = !$scope.status.isopen;
		  var selectAgent = document.getElementById('selectAgent');
		  selectAgent.textContent=agent.user+'@'+agent.host+':'+agent.port;
	  };
	  
	  $scope.selectRepo = function(key) {
		  console.log('selected repo: '+key);
		  $scope.selectedRepoName = key;
	      $scope.selectedRepo = $scope.fileRepos[key];
	  	  qs_repo.loadRepo(key,function(err, data) {
	  		if(err) {
	  			alert("unable to load repository");
	  			
	  		}
	  		$scope.jobs=data;
	  	  });
		  $scope.repoSelect.isopen = !$scope.repoSelect.isopen;
		  var selectRepo = document.getElementById('selectRepo');
		  selectRepo.textContent=key;
	  };
	  
	  var navigating = false;

	  
	  $scope.cancel = function() {
		  if (!$scope.selectedAgent) {
			  $scope.message='Please select an agent to execute';
			  return;
		  }
		  
		  //get the content from the json editor
		  var job;
		  try {
			  job = editor.get();
		      //JSON.parse(jjob);
		    } catch (e) {
		    	console.log('error getting job data.')
		    	$scope.message='Invalid JSON - please fix.';
		        return;
		    }
		    var data = {
		    	agent: $scope.selectedAgent,
		    	job: job
		    };
		    $http({
			      method: 'POST',
			      url: '/api/cancel',
			      data: data
			    }).success(function (data, status, headers, config) {
			        $scope.agentInfo = data;
			        $scope.message = job.id+' cancel request submitted to agent: '+$scope.selectedAgent.user+'@'+$scope.selectedAgent.host+':'+$scope.selectedAgent.port
			        console.log("submitted job request");
			    }).
			    error(function (data, status, headers, config) {
			    	$scope.message = 'Unable to contact Agent http status: '+status;
			    });
	  };
	  $scope.execute = function() {
		  if (!$scope.selectedAgent) {
			  $scope.message='Please select an agent to execute';
			  return;
		  }
		  
		  //get the content from the json editor
		  var job;
		  try {
			  job = editor.get();
		      //JSON.parse(jjob);
		    } catch (e) {
		    	console.log('error getting job data.')
		    	$scope.message='Invalid JSON - please fix.';
		        return;
		    }
		    var data = {
		    	agent: $scope.selectedAgent,
		    	job: job
		    };
		    $http({
			      method: 'POST',
			      url: '/api/execute',
			      data: data
			    }).success(function (data, status, headers, config) {
			        $scope.agentInfo = data;
			        loadJobs();
			        console.log("submitted job request");
			    }).
			    error(function (data, status, headers, config) {
			    	$scope.message = 'Unable to contact Agent http status: '+status;
			    });
	  };
	  
  }).controller('LogsController', function ($scope, $http) {
	  var socket = io.connect();
	  var container = document.getElementById('log-container');
	  
	  socket.on('new-data', function(data) {
		  var message = JSON.parse(data.value);
		  addMessage(message);//message.timestamp+':'+message.level+' '+message.message);


	  });
	  $http({
	      method: 'POST',
	      url: '/api/logs',
    	  data: {
    		  numLogs:20
    		  }
	    }).
	    success(function (data, status, headers, config) {
	      $scope.logs = data.file;
	      for(var message in data.file) {
	    	  addMessage(data.file[message]);
	      }
	    });
	  
	  function addMessage(message) {
		  var newDiv = document.createElement('div');
		  var logText=document.createTextNode(message.timestamp+':'+message.level+' '+message.message);
		  newDiv.appendChild(logText);
		  container.appendChild(newDiv);  
	  }
  }).controller('WorkflowsController', function ($scope, $modal, $http, $log, qs_repo) {
  
    $scope.runningWorkflows = {};
    var loadWorkflows = function() {
    	$http.get('/api/runningWorkflowsList').
	    success(function(data) {
	    	$scope.runningJobs = data;
	    });
    };
    loadWorkflows();
    
	    
  	var socket = io();

    socket.on('task-update', function(task, agent,job){
      console.log('task update message received');
      //loadJobs();
      if (agent && job) {
        if (!$scope.runningWorkflows[agent._id]) {
        	$scope.runningWorkflows[agent._id] = {};
        	$scope.runningWorkflows[agent._id][job.id] = {}
        } else if (!$scope.runningWorkflows[agent._id][job.id]) {
        	$scope.runningWorkflows[agent._id][job.id] = {}
        }
      	$scope.runningWorkflow[agent._id][job.id].progress=job.progress;
      	$scope.runningWorkflow[agent._id][job.id].status=job.status;
	  	$scope.$apply();
	  }
      
    });
    socket.on('task-complete', function(task,agent,job){
      console.log('task complete message received');
      loadWorkflows();
	  $scope.$apply();
      
    });
    socket.on('task-cancel', function(task,agent,job){
      console.log('task cancel message received');
      loadWorkflows();
	  $scope.$apply();
      
    });
    socket.on('task-error', function(task,agent,job){
      console.log('task error message received');
      loadJobs();
	  $scope.$apply();
      
    });
    
  
  	  $http.get('/api/repoList').
	    success(function(data) {
	    	$scope.fileRepos = data;
	    });
  
	  var options = {
	    mode: 'code',
	    modes: ['code', 'form', 'text', 'tree', 'view'], // allowed modes
	    error: function (err) {
	      console.log(err.toString);
	      alert(err.toString());
	    }
	  };
	  
	  var container = document.getElementById('jsoneditor');
	  var editor = new JSONEditor(container,options);
	  
	  
	  var workflows = [] ;
	  var tree;
	  $scope.workflow_tree = tree = {};
	  $scope.workflows = workflows;
	  $scope.loading_jworkflows = false;
	  
	  $http.get('/api/connectedAgents').
	    success(function(data) {
	    	$scope.connectedAgents = data;
	    });
	  
	  $scope.selectAgent = function(agent) {
		  $scope.selectedAgent = agent;
		  console.log('selected agent: '+agent);
		  $scope.status.isopen = !$scope.status.isopen;
		  var selectAgent = document.getElementById('selectAgent');
		  selectAgent.textContent=agent.user+'@'+agent.host+':'+agent.port;
	  };
	  
	  $scope.selectRepo = function(key) {
		  console.log('selected repo: '+key);
		  qs_repo.loadRepo(key,function(err, data) {
	  		if(err) {
	  			alert("unable to load repository");
	  			
	  		}
	  		$scope.workflows=data;
	  	  });
		  $scope.repoSelect.isopen = !$scope.repoSelect.isopen;
		  var selectRepo = document.getElementById('selectRepo');
		  selectRepo.textContent=key;
	  };
	  
	  $scope.toggled = function(open) {
		    console.log('Dropdown is now: ', open);
		  };

	  $scope.toggleDropdown = function($event) {
	    $event.preventDefault();
	    $event.stopPropagation();
	    $scope.status.isopen = !$scope.status.isopen;
	    
	  };
	  
	$scope.addFile = function() {
		qs_repo.openNewFileModal($scope.selectedFile, $scope.selectedRepoName, 'addFile');
		
	}
		  $scope.deleteFile = function () {
	  	qs_repo.deleteFile($scope.selectedFile, $scope.selectedRepoName, false, function(err,data) {
	  		var deleted_branch = $scope.selectedFile;
	  		if (tree.get_parent_branch(deleted_branch)) {
	  			var parent_branch = tree.get_parent_branch(deleted_branch);
	  			tree.select_branch(parent_branch);
	  			var newChildren = [];
	  			var oldChildren = tree.get_children(parent_branch);
	  			for (var child in oldChildren) {
	  				console.log(child.path+" "+deleted_branch.path);
	  				if (oldChildren[child].path != deleted_branch.path) {
	  					newChildren.push(oldChildren[child]);
	  				} else {
	  					console.log("removing deleted branch from tree");
	  				}
	  			}
	  			console.log(parent_branch);
	  			console.log(newChildren);
	  			parent_branch.children =  newChildren;
	  		} else {
	  			$scope.selectRepo($scope.selectedRepoName);
	  		}
	  	});
	  };
	  var navigating = false;
	  $scope.tree_handler = function(branch) {
	      console.log('selection='+branch.label);
	      $scope.selectedFile = branch; 
	      $scope.message = undefined;
	      if (navigating == false && '.json' == branch.ext) {
	    	  qs_repo.loadFile($scope.selectedRepo, branch.path, function(err,data) {
	    	  	editor.set(data, function(err) {
	      		    		console.log(err);
	      		    	});
	    	  }); 
	      }
	    	  
	    };
	    
	  $scope.saveWorkflow = function() {
	  	if($scope.selectedFile) {
			  qs_repo.saveFile($scope.selectedFile.path, editor.get(), function(err, message) {
			  	$scope.message = message;
			  });
		}
	  };
	  
	  $scope.execute = function() {
		  if (!$scope.selectedAgent) {
			  $scope.message='Please select an agent to execute';
			  return;
		  }
		  
		  //get the content from the json editor
		  var job;
		  try {
			  job = editor.get();
		      //JSON.parse(jjob);
		    } catch (e) {
		    	console.log('error getting job data.')
		    	$scope.message='Invalid JSON - please fix.';
		        return;
		    }
		    var data = {
		    	agent: $scope.selectedAgent,
		    	job: job
		    };
		    $http({
			      method: 'POST',
			      url: '/api/executeWorkflow',
			      data: data
			    }).success(function (data, status, headers, config) {
			        $scope.agentInfo = data;
			        loadJobs();
			        console.log("submitted workflow request");
			    }).
			    error(function (data, status, headers, config) {
			    	$scope.message = 'Unable to contact Agent http status: '+status;
			    });
	  };
	  
	  $scope.cancel = function() {
		  if (!$scope.selectedAgent) {
			  $scope.message='Please select an agent to execute';
			  return;
		  }
		  
		  //get the content from the json editor
		  var job;
		  try {
			  job = editor.get();
		      //JSON.parse(jjob);
		    } catch (e) {
		    	console.log('error getting job data.')
		    	$scope.message='Invalid JSON - please fix.';
		        return;
		    }
		    var data = {
		    	agent: $scope.selectedAgent,
		    	job: job
		    };
		    $http({
			      method: 'POST',
			      url: '/api/cancelWorkflow',
			      data: data
			    }).success(function (data, status, headers, config) {
			        $scope.agentInfo = data;
			        $scope.message = job.id+' cancel request submitted to agent: '+$scope.selectedAgent.user+'@'+$scope.selectedAgent.host+':'+$scope.selectedAgent.port
			        console.log("submitted job request");
			    }).
			    error(function (data, status, headers, config) {
			    	$scope.message = 'Unable to contact Agent http status: '+status;
			    });
	  };
	  
	  
  });
