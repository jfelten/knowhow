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
  controller('JobsController', function ($scope, $http) {
  
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
	  
	  
	  var jobs = [] ;
	  var tree;
	  $scope.job_tree = tree = {};
	  $scope.jobs = jobs;
	  $scope.loading_jobs = true;
	  $http.get('/api/jobList?file=repo/jobs').
	    success(function(data) {
	    	jobs = data.files.children;
	    	console.log(jobs);
	    	$scope.jobs = data.files.children;
	    	$scope.loading_jobs = false;
	        return tree.expand_all();    	
	    }).error(function(data) {
	    	console.log("errir");
	    });
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
		  loadRepo(key);
		  $scope.repoSelect.isopen = !$scope.repoSelect.isopen;
		  var selectRepo = document.getElementById('selectRepo');
		  selectRepo.textContent=key;
	  };
	  
	  var loadRepo = function(repoName) {
	    $scope.selectedRepo = $scope.fileRepos[repoName];
	  	$http.get('/api/jobList?file='+$scope.selectedRepo).
	    success(function(data) {
	    	jobs = data.files.children;
	    	console.log(jobs);
	    	$scope.jobs = data.files.children;
	    	$scope.loading_jobs = false;
	        return tree.expand_all();    	
	    }).error(function(data) {
	    	console.log("error");
	    });
	  }
	  
	  $scope.toggled = function(open) {
		    console.log('Dropdown is now: ', open);
		  };

	  $scope.toggleDropdown = function($event) {
	    $event.preventDefault();
	    $event.stopPropagation();
	    $scope.status.isopen = !$scope.status.isopen;
	    
	  };
	  
	  function loadJob(path) {
		  $http.get('/'+path,{
              transformResponse: function (data, headers) {
                  //MESS WITH THE DATA
                  //data = {};
                  //data.coolThing = 'BOOM-SHAKA-LAKA';
                  try {
                	  var jsonObject = JSON.parse(data);
                	  editor.set(jsonObject, function(err) {
      		    		console.log(err);
      		    	});
                	return jsonObject;
                  } 
                  catch (e) {
                	  alert(e);
                	  editor.setText(data, function(err) {
        		    		console.log(err);
                	  });
                	  return data;//.replace(/\n/g, '\\n');
                  }
            	  
              }
          }).success(function(data) {
        	  
          });
          
	  }
	  $scope.jobs_tree_handler = function(branch) {
	      console.log('selection='+branch.label);
	      $scope.selectedFile = branch.path; 
	      $scope.message = undefined;
	      if ('.json' == branch.ext) {
	    	  loadJob(branch.path); 
	      }
	    	  
	    };
	    
	  $scope.saveJob = function() {
		  console.log('save job');
		  var fileName = $scope.selectedFile
		  var job;
		  try {
			  job = editor.get();
		      //JSON.parse(job);
		    } catch (e) {
		    	console.log('error getting job data.')
		    	$scope.message='Invalid JSON - please fix.';
		        return;
		    }
		    $http({
			      method: 'GET',
			      url: '/api/saveFile',
			      params: {fileName: fileName,
			    	  	   data: job
			    	  }
			    }).success(function (data, status, headers, config) {

			        $scope.message = data.message;
			    }).
			    error(function (data, status, headers, config) {
			    	$scope.message = 'Unable to save file status: '+status;
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
			        $scope.message = job.id+' successfully submitted to agent: '+$scope.selectedAgent.user+'@'+$scope.selectedAgent.host+':'+$scope.selectedAgent.port
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
  });
