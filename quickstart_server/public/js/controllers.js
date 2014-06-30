'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
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
	  

  }).
  controller('MyCtrl2', function ($scope) {
    // write Ctrl here
	  $http.get('/api/addAgent/' + $routeParams.id).
      success(function(data) {
        $scope.form = data.post;
      });
  });
