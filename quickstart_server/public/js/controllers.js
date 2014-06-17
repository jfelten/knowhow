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
    $scope.addAgent = function (agent) {
    	$scope.master = angular.copy(agent);
    	$http.post('/api/addAgent', agent).
        success(function(data) {
          $location.path('/agents');
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
