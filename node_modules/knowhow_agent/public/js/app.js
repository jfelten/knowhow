'use strict';

angular.module('myApp', [               
  'myApp.controllers',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'ui.bootstrap',
  'ngRoute'
]).
config(function ($routeProvider, $locationProvider) {
  $routeProvider.
    when('/', {
      templateUrl: 'partials/api',
      controller: 'APIController'
    }).
    when('/api', {
      templateUrl: 'partials/api',
      controller: 'APIController'
    }).
    when('/execute', {
        templateUrl: 'partials/execute',
        controller: 'ExecuteController'
      }).
    when('/logs', {
      templateUrl: 'partials/logs',
      controller: 'LogsController'
    }).
    when('/about', {
        templateUrl: 'partials/about',
        controller: 'AboutController'
    }).
    otherwise({
      redirectTo: '/'
    });

  $locationProvider.html5Mode(true);
});
