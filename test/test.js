/* eslint-env mocha */
'use strict';
const assert = require('assert');
const chalk = require('chalk');
const tmi = require('..');
const response = require('./fixtures/response');

describe('Formatting', () => {
	beforeEach(function () {
		this.log = console.log;
		this.formattedOutput = '';

		console.log = content => {
			this.formattedOutput += content + '\n';
			this.log(content);
		};
	});

	afterEach(function () {
		console.log = this.log;
	});

	it('should correctly output in the terminal', function () {
		tmi().process({strategy: 'desktop'}, response);
		assert(/Your image weight/.test(chalk.stripColor(this.formattedOutput)));
	});
});
