'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('AppCtrl', function ($scope, $http) {

    $http({
      method: 'GET',
      url: '/api/name'
    }).
    success(function (data, status, headers, config) {
      $scope.name = data.name;
    }).
    error(function (data, status, headers, config) {
      $scope.name = 'Error!';
    });

  }).
  controller('AddAgentController', function ($scope, $http, $location) {
	$scope.master = {};
	  
	    
    $scope.form = {};
    $scope.test = ['sd','sdsds','dsdsd'];
    var eventSource = new EventSource('/agent-updates');
	
	eventSource.addEventListener('message', function(e) {
        console.log('message received for: '+data.id);
		var data = JSON.parse(e.data);
		var agent_message_box = document.getElementById('data.id+"_messages"');
		agent_message_box.textContent = data.msg;
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
