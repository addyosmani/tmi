/*
 * tmi (based on psi)
 * http://github.com/addyosmani/tmi
 *
 * Copyright (c) 2014 Google Inc.
 * Licensed under an Apache 2 license.
 */

'use strict';
var pagespeed = require('gpagespeed');
var prependHttp = require('prepend-http');
var output = require('./output');

module.exports = function (opts, cb) {
	opts = opts || {};
	cb = cb || function () {
	};
	opts.strategy = opts.strategy || 'desktop';
	opts.nokey = opts.key === undefined;
	opts.verbose = opts.verbose || false;
	opts.url = prependHttp(opts.url);
	var Output = new output();

	pagespeed(opts, function (err, data) {
		if (err) {
			cb(err);
			return;
		}

		var response = data;
		Output.process(opts, response, function (processErr) {
			cb(processErr || err, response);
		});
	});
};
