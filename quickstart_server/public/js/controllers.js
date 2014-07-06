'use strict';

/* Controllers */

var myModule = angular.module('myApp.controllers', []).
  controller('AppCtrl', function ($scope, $http) {

    $http({
      method: 'GET',
      url: '/api/serverInfo'
    }).
    success(function (data, status, headers, config) {
      $scope.serverInfo = data.serverInfo;
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
      var agent_status_box = document.getElementById(agent._id+'_status');
      var agent_message_box = document.getElementById(agent._id+'_messages');
      if (agent_message_box != undefined) {
    	  agent_message_box.textContent = agent.message;
      }
      if (agent_status_box != undefined) {
    	  agent_status_box.textContent = agent.status;
      }
      
    });
    
    socket.on('agent-error', function(agent){
        console.log('agent error message received');
        var agent_status_box = document.getElementById(agent._id+'_status');
        var agent_message_box = document.getElementById(agent._id+'_messages');
        if (agent_message_box != undefined) {
      	  agent_message_box.textContent = agent.message;
        }
        if (agent_status_box != undefined) {
      	  agent_status_box.textContent = agent.status;
        }
        
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
    	$scope.master = angular.copy(agent);
    	$http.post('/api/addAgent', agent).
        success(function(data) {
        	$scope.connectedAgents = data;
        	//location.reload(); 
        });
    };
    
    $scope.deleteAgent = function (agent_id) {
    	
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
	  
	  function seleectAgent(agent) {
		  
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
	      if ('.json' == branch.ext) {
	    	  loadJob(branch.path); 
	      }
	    	  
	    };
  });
