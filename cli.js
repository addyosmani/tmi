#!/usr/bin/env node
'use strict';
const meow = require('meow');
const updateNotifier = require('update-notifier');
const psi = require('psi');
const tmi = require('.');

const cli = meow(`
	Usage
	  $ tmi <url> [options]

	Options
	  --verbose    Detailed summary
	  --key        Google API Key. By default the free tier is used
	  --strategy   Strategy to use when analyzing the page: mobile|desktop
	  --locale     Locale results should be generated in
	  --threshold  Threshold score to pass the PageSpeed test

	Example
	  $ tmi todomvc.com --strategy=desktop
`);

updateNotifier({pkg: cli.pkg}).notify();

if (!cli.input[0]) {
	console.error('Specify a URL');
	process.exit(1);
}

psi(cli.input[0], cli.flags).then(res => {
	tmi().process(cli.flags, res);
});
