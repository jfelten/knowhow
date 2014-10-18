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
      
      //loadJobs();
      updateRunningJobs(agent,job);
      $scope.$apply();
	 
      
    });
    socket.on('job-complete', function(agent,job){
      console.log('job complete message received');
      updateRunningJobs(agent,job);
      $scope.message=job.id+" completed";
	  $scope.$apply();
      
    });
    socket.on('job-cancel', function(agent,job){
      console.log('job cancel message received');
      updateRunningJobs(agent,job);
      $scope.message=job.id+" cancelled";
	  $scope.$apply();
      
    });
    socket.on('job-error', function(agent,job){
      console.log('job error message received');
      updateRunningJobs(agent,job);
	  if (job.status) {
      	$scope.message="error "+job.id+": "+job.status;
      }
	  $scope.$apply();
      
    });
    var updateRunningJobs = function(agent,job) {
    	if (agent && job) {
	        if (!$scope.runningJobs[agent._id]) {
	        	$scope.runningJobs[agent._id] = {};
	        	$scope.runningJobs[agent._id][job.id] = {}
	        } else if (!$scope.runningJobs[agent._id][job.id]) {
	        	$scope.runningJobs[agent._id][job.id] = {}
	        }
	        if (job.progress){
	      		$scope.runningJobs[agent._id][job.id].progress=job.progress;
	      	}
	      	$scope.runningJobs[agent._id][job.id].status=job.status;
	      	$scope.runningJobs[agent._id][job.id].id=job.id;
	      	$scope.runningJobs[agent._id].agent={_id: agent._id, user: agent.user, host: agent.host, port: agent.port};
	    }
	  
    };
    
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
	  	  //console.log(branch);
	      console.log('selection='+branch.label+ ' navigating='+navigating+' ext='+branch.ext+' type='+branch.type);
	      $scope.selectedFile = branch; 
	      $scope.message = undefined;
	      if (branch.type == 'file') {
	    	  qs_repo.loadFile($scope.selectedRepo, branch.path, function(err,data) {
	    	    console.log("data="+data);
	    	  	if (branch.ext=='.json') {
	    	  		
  		    		editor.setText(data);
  		    		editor.setMode('code')
  		      	} else {
  		    		editor.setText(data);
  		    		editor.setMode('text')
  		    	}
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
			  qs_repo.saveFile($scope.selectedFile.path, editor.getText(), function(err, message) {
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
		qs_repo.openNewFileModal($scope.selectedFile, $scope.selectedRepoName, tree,'addFile');
		
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
	  	  qs_repo.loadRepo(key,'jobs',function(err, data) {
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

	  
	  $scope.cancel = function(agent, job) {


		    var data = {
		    	agent: agent,
		    	job: job
		    };
		    $http({
			      method: 'POST',
			      url: '/api/cancelJob',
			      data: data
			    }).success(function (data, status, headers, config) {
			        $scope.agentInfo = data;
			        $scope.message = job.id+' cancel request submitted to agent: '+agent.user+'@'+agent.host+':'+agent.port
			        console.log("submitted job request");
			    }).
			    error(function (data, status, headers, config) {
			    	$scope.message = data.message+' : '+status;
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
			        $scope.message="submitted "+job.id+" to "+$scope.selectedAgent.host+":"+$scope.selectedAgent.port;
			        //$scope.$apply();
			        
			    }).
			    error(function (data, status, headers, config) {
			    	$scope.message = data.message+' : '+status;
			    	//$scope.apply();
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
  }).controller('WorkflowsController', function ($scope, $modal, $http, $log, qs_repo, qs_workflow) {
  
  	
    $scope.runningWorkflows = {};
    var loadWorkflows = function() {
    	$http.get('/api/runningWorkflowsList').
	    success(function(data) {
	    	$scope.runningJobs = data;
	    });
    };
    loadWorkflows();
    
	    
  	
    
  
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
	  var env_container;
	  var env_editor;
	  
	  
	  var workflows = [] ;
	  var tree;
	  $scope.workflow_tree = tree = {};
	  $scope.workflows = workflows;
	  $scope.loading_workflows = false;
	  
	  var environments = [] ;
	  $scope.environments_tree = {};
	  $scope.environments = environments;
	  $scope.loading_environments = false;
	  
	  $scope.workflow = {};
	  $scope.environment = {};
	  var loadAgentsForEnvironment = function(environment) {
	  		console.log("loading agents...");
	  		var data = {
		    	environment: environment
		    };
		    
	  		$http({
			      method: 'POST',
			      url: '/api/loadAgentsForEnvironment',
			      data: data
			    }).
			    success(function(data) {
			    	console.log(data);
			    	qs_workflow.watchEnvironment(data);
			    	var socket = io();
				  	qs_workflow.listenForAgentEvents($scope, socket);
				  	qs_workflow.listenForJobEvents($scope, socket);
				  	qs_workflow.listenForWorkflowEvents($scope, socket);
				  	$scope.environment = qs_workflow.watchedEnvironment;
		    });
	  
	  }
	  
	 $scope.initAgents = function(credentials) {
	  		console.log("init agents...");
	  		console.log(credentials);
	  		$scope.master = angular.copy(credentials);
	  		var data = {
	  			credentials: credentials,
		    	environment: $scope.environment
		    };
		    
	  		$http({
			      method: 'POST',
			      url: '/api/initAgents',
			      data: data
			    }).
			    success(function(data) {
			    	$scope.workflow.agents = data;
		    });
	  
	  };
	  
	  $scope.selectRepo = function(key) {
		  console.log('selected repo: '+key);
		  $scope.selectedRepo=key
		  qs_repo.loadRepo(key,'environments',function(err, data) {
	  		if(err) {
	  			alert("unable to load repository");
	  			
	  		}
	  		env_container = document.getElementById('env_editor');
	  		console.log('env_container='+env_container);
	  		env_editor = new JSONEditor(env_container,options);
	  		$scope.environments=data;
			  qs_repo.loadRepo(key,'workflows',function(err, data) {
		  		if(err) {
		  			alert("unable to load repository");
		  			
		  		}
		  		$scope.workflows=data;
		  	  });
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
	$scope.addEnv = function() {
		qs_repo.openNewFileModal( $scope.selectedEnvBranch, $scope.selectedRepoName, $scope.environments_tree, 'addFile');
		
	}
	$scope.deleteEnv = function () {
	  	qs_repo.deleteFile($scope.selectedEnvBranch, $scope.selectedRepoName, false, function(err,data) {
	  		var deleted_branch =  $scope.selectedEnvBranch;
	  		if ( $scope.environments_tree.get_parent_branch(deleted_branch)) {
	  			var parent_branch =  $scope.environments_tree.get_parent_branch(deleted_branch);
	  			 $scope.environments_tree.select_branch(parent_branch);
	  			var newChildren = [];
	  			var oldChildren =  $scope.environments_tree.get_children(parent_branch);
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
	  
	$scope.addFile = function() {
		qs_repo.openNewFileModal($scope.selectedFile, $scope.selectedRepoName, tree, 'addFile');
		
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
	  	  //console.log(branch);
	      console.log('selection='+branch.label+ ' navigating='+navigating+' ext='+branch.ext+' type='+branch.type);
	      $scope.selectedFile = branch; 
	      $scope.message = undefined;
	      if (branch.type == 'file') {
	    	  qs_repo.loadFile($scope.selectedRepo, branch.path, function(err,data) {
	    	    //console.log("data="+data);
	    	  	if (branch.ext=='.json') {
	    	  		editor.setText(data);
  		    		editor.setMode('code');
  		      	} else {
  		    		editor.setMode('text');
  		    		editor.setText(data);
  		    	}
  		      });
	      		    		
	      }		    	
	    	  

	     
	    	  
    	};
    	
    	$scope.env_tabs = [
		    { title:'Connect ', content:'Connect ', disabled: false  },
		    { title:'Edit', content:'Edit', disabled: false }
		  ];
    	
      	$scope.env_tree_handler = function(branch) {
	  	  //console.log(branch);
	      console.log('selection='+branch.label+ ' navigating='+navigating+' ext='+branch.ext+' type='+branch.type);
	     
	      $scope.env_message = undefined;
	      $scope.selectedEnvBranch = branch;
	      if (branch.type == 'file') {
	    	  qs_repo.loadFile($scope.selectedRepo, branch.path, function(err,data) {
	    	    //console.log("data="+data);
	    	  	if (branch.label=='environment.json') {
	    	  		$scope.env_tabs[0].active = true
	    	  		$scope.selectedEnv = branch; 
  		    		env_editor.setMode('text');
  		    		var environment = JSON.parse(data)
  		    		loadAgentsForEnvironment(environment);
  		    		env_editor.set(environment);
  		    		$scope.env_tabs[0].title = 'connect '+environment.id;
  		    		$scope.env_tabs[1].title = 'Edit '+$scope.selectedEnvBranch.label;
  		    		
  		      	} else {
  		      		console.log("loading text")
  		    		env_editor.setMode('text');
  		    		env_editor.setText(data);
  		    		$scope.env_tabs[1].title = 'Edit '+$scope.selectedEnvBranch.label;
  		    		$scope.env_tabs[1].active = true
  		    	}
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

	    
	  $scope.saveWorkflow = function() {
	  	if($scope.selectedFile) {
			  qs_repo.saveFile($scope.selectedFile.path, editor.get(), function(err, message) {
			  	$scope.message = message;
			  });
		}
	  };
	  
	  $scope.saveEnv = function() {
	  	if ($scope.selectedEnv && $scope.selectedEnvBranch.ext=='.json') {
	  		  try {
	  		  	JSON.parse(env_editor.getText());
	  		  } catch(err) {
	  		  	console.log(err);
	  		  	//console.log(env_editor.get());
	  		  	$scope.env_message = "JSON must be valid before saving: "+err.message;
	  		  	return;
	  		  }
  
		 }
		 console.log("saving env file");
  		 qs_repo.saveFile($scope.selectedEnvBranch.path, env_editor.getText(), function(err, message) {
		  	 $scope.env_message = message;
		 });

	  };
	  
	  $scope.executeWorkflow = function() {
		  if (!qs_workflow.checkAgents()) {
			  $scope.message='Please connect all agents before attempting a workflow';
			  return;
		  }
		  $scope.message='';
		  //get the content from the json editor
		  var workflow;
		  try {
			  workflow = editor.get();
		      //JSON.parse(jjob);
		    } catch (e) {
		    	console.log('error loading workflow.')
		    	$scope.message='Invalid JSON - please fix.';
		        return;
		    }
		    var data = {
		    	environment: $scope.environment,
		    	workflow: workflow
		    };
		    $http({
			      method: 'POST',
			      url: '/api/executeWorkflow',
			      data: data
			    }).success(function (data, status, headers, config) {
			        $scope.agentInfo = data;
			        console.log("submitted workflow request");
			    }).
			    error(function (data, status, headers, config) {
			    	$scope.message = data.message+' : '+status;
			    	//$scope.message = 'Unable to contact server http status: '+status;
			    });
	  };
	  
	  $scope.cancel = function(agent, job) {
		  
		    var data = {
		    	agent: agent,
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
			    	$scope.message = data.message+' : '+status;
			    });
	  };
	  
	  
  });
