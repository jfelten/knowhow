KnowHow
=========

A decentralized Nodejs workflow tool used to manage software on any server.

KnowHow is a tool that can be used to run any task on any cluster of machines virtual or physical. Examples can be as complex as configuring an enterprise weblogic cluster on a specific set of hosts or as simple as updating personal ssh keys. Think of it as a personal Puppet or Chef without the overhead. The only requirement for KnowHow is an ssh login on a host you are using or managing. KnowHow creates an agent that allows you to remotely execute and deliver files. KnowHow and its agents are operated through a simple web interface. The most important benefit of KnowHow is the knowledge is retained and processes are repeatable. Once a workflow is set up it should be repeatable on any environment.

Installation
============
We have tried to make the install as painless as possible.

For node users:
npm install -g knowhow

For everyone else there is an RPM that includes a nodejs binary
sudo rpm -ivh https://github.com/jfelten/knowhow/raw/master/knowhow-0.0.2-1.el6.x86_64.rpm

Getting Started
============
To start the server execute: startKHServer
To start the agent execute: startKHAgent

If you cloned the project you run the node_modules/knowhow_server/server.js and node_modules/knowhow_agent/agent.js entry points.  Ex node server.js.

next import the examples repository
