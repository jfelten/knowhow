KnowHow
=========

[![Join the chat at https://gitter.im/jfelten/knowhow](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/jfelten/knowhow?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![NPM](https://nodei.co/npm/knowhow.png)](https://nodei.co/npm/knowhow/)

A decentralized Nodejs workflow tool used to manage software on any server.

KnowHow is a tool that can be used to run any task on any cluster of machines virtual or physical. Examples can be as complex as configuring an enterprise weblogic cluster on a specific set of hosts or as simple as updating personal ssh keys. Think of it as a personal Puppet or Chef without the overhead. The only requirement for KnowHow is an ssh login on a host you are using or managing. KnowHow creates an agent that allows you to remotely execute and deliver files. KnowHow and its agents are operated through a simple web interface. The most important benefit of KnowHow is the knowledge is retained and processes are repeatable. Once a workflow is set up it should be repeatable on any environment.

####[Documentation >>](http://knowhowjs.com/documentation)
####[Live Demo >>](http://knowhowjs.com:3001)
####[Project homepage >>](http://knowhowjs.com)

##Subprojects
* [knowhow-agent](https://github.com/jfelten/knowhow-agent) manages execution on a single host
* [knowhow-server](https://github.com/jfelten/knowhow-server) manages over execution of jobs, repositories and workflows
* [knowhow-example-repo](https://github.com/jfelten/knowhow_example_repo) examples of jobs and workflows 
* [knowhow-shell](https://github.com/jfelten/knowhow-shell) a node api for executing knowhow json jobs


#Key Concepts

####[knowhow-agent](https://github.com/jfelten/knowhow-agent)

A knowhow agent is a simple web application that provides a control interface to execute knowhow jobs.  Knowhow-agents run as a specific user on a specific port(default 3000), and are coordinated by the knowhow-server.

####[knowhow-server](https://github.com/jfelten/knowhow-server)

Knowhow-server, this project, manages agents, jobs, workflows and repositories.  It is a web application accessed through the browser [http://localhost:3001](http://localhost:3001).

####[repository](https://github.com/jfelten/knowhow_example_repo)

A collection of json objects, and other dependent files that represent jobs, environments, and workflows.  Repositories are currently file based and is a directory with the following top folders: environments, jobs, workflows.  Each folder contains the specifc types of objects: jobs for job objects, environments environment json objects, and workflows for workflow objects.  The may be other nested folder structures underneath one of the top 3 directories.  Eventually there will be database based repositories.  See [knowhow_example_repo](https://github.com/jfelten/knowhow_example_repo) for an example repository structure.

####[job](https://github.com/jfelten/knowhow-shell)

A knowhow job is a json object that represents a task or shell script.  Jobs contain a list of shell commands with reponses to specific text if necessary.  Jobs also define environment variables that can be referenced through the json object for easier automation.  See the [knowhow-shell](https://github.com/jfelten/knowhow-shell) project for how to use knowhow jobs directly from node.

####environment

An environment is a collection of hosts that run knowhow-agents.  Environments are referenced by workflow objects to coordinate across different hosts.

####workflow

A workflow is a directive of jobs or tasks that get run against an environment.

# Installation

For node users:

    npm install -g knowhow

For everyone else there is an RPM that includes a nodejs binary:

    sudo rpm -ivh https://github.com/jfelten/knowhow/releases/download/0.0.10/knowhow-0.0.10-1.el6.x86_64.rpm

# Getting Started

To start the server execute: 

    startKHServer 
    
please follow the getting started section here: [knowhow-server](https://github.com/jfelten/knowhow-server)

To start the agent execute: 

    startKHAgent

To run a knowhow server directly from a cloned project:

    node node_modules/knowhow_server/server.js
  
To run a knowhow agent directly from a cloned project:

    node node_modules/knowhow_agent/agent.js
    
Open the knowhow server in a browser Ex: [http://localhost:3001](http://localhost:3001)

# Example Repository

The [example repository](https://github.com/jfelten/knowhow_example_repo) acts as a tutorial.  Import this repository to get started.  Navigate to Repositories tab and then select the "New Repository" sub tab.
