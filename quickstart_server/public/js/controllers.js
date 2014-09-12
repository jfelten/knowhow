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
  controller('JobsController', function ($scope, $modal, $http, $log) {
  
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
      console.log('job update message received');
      loadJobs();
	  $scope.$apply();
      
    });
    socket.on('job-complete', function(agent,job){
      console.log('job update message received');
      loadJobs();
	  $scope.$apply();
      
    });
    socket.on('job-cancel', function(agent,job){
      console.log('job update message received');
      loadJobs();
	  $scope.$apply();
      
    });
    socket.on('job-error', function(agent,job){
      console.log('job update message received');
      loadJobs();
	  $scope.$apply();
      
    });
    
  
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
	  $scope.loading_jobs = false;
	  
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
	  
	  var loadRepo = function(repoName, callback) {
	  	$scope.selectedRepoName = repoName;
	    $scope.selectedRepo = $scope.fileRepos[repoName];
	  	$http.get('/api/jobList?file='+$scope.selectedRepo).
	    success(function(data) {
	    	jobs = data.files.children;
	    	console.log(jobs);
	    	$scope.jobs = data.files.children;
	    	$scope.loading_jobs = false;
	    	if (callback) {
	    		callback();
	    	}
	        return;// tree.expand_all();     	
	    }).error(function(data) {
	    	console.log("error");
	    	if (callback) {
	    		callback(new Error(data));
	    	}
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
	  	  console.log('load job');
		  $http.get('/api/jobContent?repo='+$scope.selectedRepo+'&file='+path,{
              transformResponse: function (data, headers) {
                  //MESS WITH THE DATA
                  //data = {};
                  //data.coolThing = 'BOOM-SHAKA-LAKA';
                  if (data.length >0) {
	                  try {
	                	  var jsonObject = JSON.parse(data);
	                	  if (jsonObject == undefined) {
	                	  	jsonObject = {};
	                	  }
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
            	  
              }
          }).success(function(data) {
        	  
          });
          
	  };
	  
	 var addFile = function(newFile, isDirectory) {
	  
		  console.log('add job');
		  
		  
		  //get the selected job or dir
		  
		  //pop up the form
	  var selectedNode = $scope.selectedFile;
	  if ($scope.selectedFile.type != "folder") {
	  	selectedNode = tree.get_parent_branch(selectedNode);
	  }
	  if (newFile == undefined) {
		console.log("getting file form");
		var modalInstance ={};
		
		var newFileModalController=  function ($rootScope, $scope, $modal, $log) {

		  $scope.selectedNode = selectedNode;
		  $scope.addFile = function (fileName) {
		  	console.log("creating: "+fileName);
		    addFile(fileName);
		    modalInstance.close('ok');
		  };
		  $scope.addDirectory = function (fileName) {
		    addFile(fileName,true);
		    modalInstance.close('ok');
		  };
		
		  $scope.cancel = function () {
		    console.log("nope I really don't want to do it");
		    modalInstance.dismiss('cancel');
		  };

	    };
	    modalInstance = $modal.open({
	      templateUrl: 'addFile',
	      controller: newFileModalController,
	      size: '',
	      resolve: {
	        items: function () {
	          return $scope.items;
	        }
	      }
	    });
	
	    modalInstance.result.then(function (selectedItem) {
	      $scope.selected = selectedItem;
	    }, function () {
	      $log.info('Modal dismissed at: ' + new Date());
	    });
	    
	    
	    
	    return;
	  }
		  
		  //submit the add request
		  
			  $http.get('/api/addFile?path='+selectedNode.path+'&fileName='+newFile+'&isDirectory='+isDirectory,{
	              transformResponse: function (data, headers) {
	                  //MESS WITH THE DATA
	                  //data = {};
	                  var newFilePath = data.path;
	                  console.log("created file: "+newFilePath);
	                  loadRepo($scope.selectedRepoName, function(err) {
                	  	if (err) {
                	  		
                	  	}
                	  	navigating = true;
                	  	$scope.$apply(); 
                	  	//tree.expand_all();
                	  	var currentBranch = tree.get_first_branch();
                	  	while (tree.get_next_branch(currentBranch) != undefined) {
                	  		if (tree.get_next_branch(currentBranch) == tree.get_first_branch() || tree.get_next_branch(currentBranch).path == newFilePath) {
                	  			navigating = false;
                	  			tree.select_branch(currentBranch);
                	  			//tree.collapse_all(); 
                	  			tree.expand_branch(currentBranch);	  			
                	  			break;
                	  		}else {
                	  			tree.collapse_branch(currentBranch);
                	  		}
                	  		currentBranch = tree.get_next_branch(currentBranch);
                	  		
                	  	}
	        		});
	            	  
	              }
	          }).success(function(data) {
	        	  
	          });
          
	  }
	  
	$scope.addFile = addFile;
	var deleteFile = function(force) {
	  console.log("delete file: selectedFile="+$scope.selectedFile.path+" selectedRepo="+$scope.selectedRepoName+" type="+$scope.selectedFile.type );

	  
	  //pop up warning if a dir
	  if (force != true && $scope.selectedFile.type == "folder") {
		console.log("directory check");
		var modalInstance ={};
		var dirWarningModalController=  function ($rootScope, $scope, $modal, $log) {


		  $scope.ok = function () {
		    deleteFile(true);
		    modalInstance.close('ok');
		  };
		
		  $scope.cancel = function () {
		    console.log("nope I really don't want to do it");
		    modalInstance.dismiss('cancel');
		  };

	    };
	    modalInstance = $modal.open({
	      templateUrl: 'directoryWarning',
	      controller: dirWarningModalController,
	      size: '',
	      resolve: {
	        items: function () {
	          return $scope.items;
	        }
	      }
	    });
	
	    modalInstance.result.then(function (selectedItem) {
	      $scope.selected = selectedItem;
	    }, function () {
	      $log.info('Modal dismissed at: ' + new Date());
	    });
	    
	    
	    
	    return;
	  }
	  
	  
	  //submit the delete request
		  $http.get('/api/deleteFile?fileName='+$scope.selectedFile.path+'&selectedRepo='+$scope.selectedRepoName,{
              transformResponse: function (data, headers) {
                  //MESS WITH THE DATA
                  //data = {};
                  //data.coolThing = 'BOOM-SHAKA-LAKA';
                  try {
                  	  var deleted_branch =  $scope.selectedFile;
                  	  var current_selection = tree.get_prev_branch(); 
                  	  console.log(current_selection);
                	  loadRepo($scope.selectedRepoName, function(err) {
                	  	if (err) {
                	  		
                	  	}
                	  	navigating = true;
                	  	$scope.$apply();
                	  	//tree.expand_all();
                	  	var currentBranch = tree.get_first_branch();
                	  	while (tree.get_next_branch(currentBranch) != undefined) {
                	  		if (tree.get_next_branch(currentBranch) == tree.get_first_branch() || currentBranch.path == current_selection.path) {
                	  			navigating = false;
                	  			tree.select_branch(currentBranch); 	  			
                	  			break;
                	  		}
                	  		currentBranch = tree.get_next_branch(currentBranch);
                	  		
                	  	}
                	  	
                	  	
                	  });
                	  
                	  
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
	  $scope.deleteFile = deleteFile;
	  var navigating = false;
	  $scope.jobs_tree_handler = function(branch) {
	      console.log('selection='+branch.label);
	      $scope.selectedFile = branch; 
	      $scope.message = undefined;
	      if (navigating == false && '.json' == branch.ext) {
	    	  loadJob(branch.path); 
	      }
	    	  
	    };
	    
	  $scope.saveJob = function() {
		  console.log('save job');
		  var fileName = $scope.selectedFile.path;
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
			        loadJobs();
			        console.log("submitted job request");
			    }).
			    error(function (data, status, headers, config) {
			    	$scope.message = 'Unable to contact Agent http status: '+status;
			    });
	  };
	  
	  $scope.cancel = function() {
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
			      url: '/api/cancel',
			      data: data
			    }).success(function (data, status, headers, config) {
			        $scope.agentInfo = data;
			        $scope.message = job.id+' cancel request submitted to agent: '+$scope.selectedAgent.user+'@'+$scope.selectedAgent.host+':'+$scope.selectedAgent.port
			        console.log("submitted job request");
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
  }).controller('dirWarningModalController', function ($scope, $modal, $log) {
  	  $scope.items = ['item1', 'item2', 'item3'];

	  $scope.open = function (size) {
		console.log("open");
	    var modalInstance = $modal.open({
	      templateUrl: 'directoryWarning',
	      controller: ModalInstanceCtrl,
	      size: size,
	      resolve: {
	        items: function () {
	          return $scope.items;
	        }
	      }
	    });
	
	    modalInstance.result.then(function (selectedItem) {
	      $scope.selected = selectedItem;
	    }, function () {
	      $log.info('Modal dismissed at: ' + new Date());
	    });
	};
	// Please note that $modalInstance represents a modal window (instance) dependency.
	// It is not the same as the $modal service used above.
	
	var ModalInstanceCtrl = function ($scope, $modalInstance, items) {
	
	  $scope.items = items;
	  $scope.selected = {
	    item: $scope.items[0]
	  };
	
	  $scope.ok = function () {
	    $modalInstance.close($scope.selected.item);
	  };
	
	  $scope.cancel = function () {
	    $modalInstance.dismiss('cancel');
	  };
    };
 });
