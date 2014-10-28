'use strict';

/* Controllers */

var myModule = angular.module('myApp.controllers', []).
  controller('AppCtrl', function ($scope, $http) {

    $http({
      method: 'GET',
      url: '/api/agentInfo'
    }).
    success(function (data, status, headers, config) {
      $scope.agentInfo = data;
    }).
    error(function (data, status, headers, config) {
    	$scope.agentInfo = {
    			name: 'Unknown',
    			port: 'Unknown'
    	};
    });

  }).
  controller('APIController', function ($scope, $http, $location) {
	
	
  }).
  controller('LogsController', function ($scope, $http, $sce) {
	  var socket = io.connect();
	  var container = document.getElementById('log-container');
	  
	  socket.on('new-data', function(data) {
	  	  console.log(data);
		  $scope.logs=$sce.trustAsHtml($scope.logs+data.value+"<br/>")
		  var logContainer = document.getElementById('log-container');
   		  logContainer.scrollTop = logContainer.scrollHeight;
		  $scope.$apply();

	  });
	  $http({
	      method: 'POST',
	      url: '/api/logs',
    	  data: {
    		  numLogs:20
    		  }
	    }).
	    success(function (data, status, headers, config) {
	      $scope.logs= $sce.trustAsHtml(data.replace(/\\n/g,"<br/>").replace(/\"/g,""));
	    });
	  
  }).
  controller('ExecuteController', function ($scope, $http) {
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
	  
	  $scope.execute = function(agent,job) {
		  var data = editor.get();;
		  $http({
		      method: 'POST',
		      url: 'http://'+agent.ip+':'+agent.port+'/api/execute',
		      data: job
		    }).success(function (data, status, headers, config) {
		        $scope.agentInfo = data;
		    }).
		    error(function (data, status, headers, config) {
		    	$scope.agentInfo = {
		    			name: 'Unknown',
		    			port: 'Unknown'
		    	};
		    });
	  }

  })
  .
  controller('AboutController', function ($scope, $http) {

	    $http({
	      method: 'GET',
	      url: '/api/agentInfo'
	    }).
	    success(function (data, status, headers, config) {
	      $scope.agentInfo = data;
	    }).
	    error(function (data, status, headers, config) {
	    	$scope.agentInfo = {
	    			name: 'Unknown',
	    			port: 'Unknown'
	    	};
	    });
	    
	    $http({
		      method: 'GET',
		      url: '/api/serverInfo'
		    }).
		    success(function (data, status, headers, config) {
		      $scope.serverInfo = data;
		    }).
		    error(function (data, status, headers, config) {
		    	$scope.agentInfo = {
		    			name: 'Unknown',
		    			port: 'Unknown'
		    	};
		    });
  });
