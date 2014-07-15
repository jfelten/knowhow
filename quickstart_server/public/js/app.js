'use strict';

// Declare app level module which depends on filters, and services
angular.module('myModule', ['ui.bootstrap']);

angular.module('myApp', [               
  'myApp.controllers',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'ui.bootstrap',
  'ngRoute',
  'angularBootstrapNavTree'
]).
config(function ($routeProvider, $locationProvider) {
  $routeProvider.
    when('/agents', {
      templateUrl: 'partials/agents',
      controller: 'AddAgentController'
    }).
    when('/jobs', {
      templateUrl: 'partials/jobs',
      controller: 'JobsController'
    }).
    when('/environments', {
        templateUrl: 'partials/environments',
        controller: 'EnvironmentsController'
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
      redirectTo: '/agents'
    });

  $locationProvider.html5Mode(true);
});
