/*global describe, beforeEach, afterEach, it */
'use strict';
var assert = require('assert');
var chalk = require('chalk');
var response = require('./fixtures/response');
var tmi = require('../');

describe('Formatting', function () {
	beforeEach(function () {
	this.log = console.log;
	this.formattedOutput = '';

	console.log = function (content) {
		this.formattedOutput += content + '\n';
		this.log(content);
		}.bind(this);
	});

	afterEach(function () {
		console.log = this.log;
	});

	it('should correctly output in the terminal', function () {
		tmi().process({strategy: 'desktop'}, response);
		assert(/Your image weight/.test(chalk.stripColor(this.formattedOutput)));
	});
});
