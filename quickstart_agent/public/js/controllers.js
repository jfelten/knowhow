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
  controller('LogsController', function ($scope, $http) {
	  
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
	  
	  $scope.execute = function() {
		  var data = document.getElementById('jsoneditor').value;
		  $http({
		      method: 'POST',
		      url: '/api/execute'
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
  });
