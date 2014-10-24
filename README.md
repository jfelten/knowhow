LaunchPad
=========

A decentralized Nodejs workflow tool used to manage software on any server.

This is a tool that can be used to run any task on any cluser of machines virtual or physical.  Examples can be as complex as configuring a weblogic cluster on a specific set of hosts or as simple as updating personal ssh keys. Think of it as a personal Puppet or Chef without the overhead.  The only requirement for LaunchPad is an ssh login on a host you are using.  LaunchPad create and agent that allows you to excute and deliver files as it's process owner.  Launchpad and its agents are operated through a simple web interface.  The most important benefit of LaunchPad is the knowlege is retained and processes are easyily repeatable.  Once a workflow is set up it should be repeatable on any environment

The inspiration for LaunchPad came from a previous employer whose main business was delivering Oracle Commerce implemetations for online retailers.  Despite delivering many similar implemetations there was no reapeatable process with experience and knowledge was lost between implemetations.  Sadly this is not as uncommon as it should be, and we determiend there was quite a need for something like launchpad.

Installation
============

Get the code and run it.

Via GIT: git clone 
Via npm: npm install LaunchPad
