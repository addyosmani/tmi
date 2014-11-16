'use strict';

var prettyBytes = require('pretty-bytes');
var chalk = require('chalk');
var utils = require('./lib/utils');
var csvparse = require('csv-parse');
var fs = require('fs');

function Output() {

	if (!(this instanceof Output)) {
		return new Output;
	}

	/**
	 * PageSpeed Insights threshold
	 * @type {number}
	 */
	this.threshold = 70;

	/**
	 * What indices from BigQuery do we want to summarize scores
	 * for in the CLI output?
	 * @type {number[]}
	 */
	this.indicesOfInterest = [3, 6, 9]; // 25th, 50th, 75th percentile

	/**
	 * Include suggestions for URLs that could be improved score-wise
	 * This will not include a complete list of possible optimizations
	 * and relies on PageSpeed Insights API data
	 * @type {boolean}
	 */
	this.verbose = false;

	/**
	 * Is the weight higher than one of the BigQuery
	 * percentiles?
	 * @type {boolean}
	 */
	this.fasterThanAPercentile = false;
	this.bigQueryData = {
		desktop: [], mobile: [], titles: []
	};

	/**
	 * A subset of BigQuery data that we actually use for output
	 * This should represent the indices of interest from the
	 * bigQueryData.
	 * @type {{desktop: Array, mobile: Array, titles: Array}}
	 */
	this.outputData = {
		desktop: [], mobile: [], titles: []
	};

	/**
	 * Average image weights per site, based on BigQuery data
	 * @type {{desktop: number, mobile: number}}
	 */
	this.averages = {};

	/**
	 * Message shown when image weight is lower than one of the percentiles
	 * we care about.
	 */
	this.keepingWebFast = chalk.cyan('Thanks for keeping the web fast <3');


	var parser = csvparse({
		delimiter: ';'
	}, function (err, data) {

		// TODO: Refactor all of this to be less boilerplate-y.

		// Complete full set of available BigQuery Data
		this.bigQueryData.titles = data[0][0].split(',');
		this.bigQueryData.desktop = data[1][0].split(',');
		this.bigQueryData.mobile = data[2][0].split(',');

		// Sub-slice portions of data we're interested
		this.indicesOfInterest.forEach(function (item) {
			this.outputData.desktop.push(this.bigQueryData.desktop[item]);
			this.outputData.mobile.push(this.bigQueryData.mobile[item]);
			this.outputData.titles.push(this.bigQueryData.titles[item]);
		}.bind(this));

		this.averages.mobile = parseInt(this.bigQueryData.mobile[1], 10);
		this.averages.desktop = parseInt(this.outputData.desktop[1], 10);

	}.bind(this));

	fs.createReadStream(__dirname + '/data/bigquery.csv').pipe(parser);
};


/**
 * Compare a supplied image weight with the weight in a supplied percentile.
 * @param siteImageWeight
 * @param percentileImageWeight
 * @param percentile
 * @returns {string} Summary message of comparisons to the percentile
 */
Output.prototype.compareWeightPercentile = function (siteImageWeight, percentileImageWeight, percentile) {
	if (siteImageWeight === undefined) {
		return;
	}
	var diff = (siteImageWeight - parseInt(percentileImageWeight, 10)) * 1000;
	if (diff > 0) {
		diff = chalk.red('+' + prettyBytes(diff));
	} else {
		diff = diff * -1;
		diff = chalk.green('-' + prettyBytes(diff));
		this.fasterThanAPercentile = true;
	}
	return diff + (' compared to a site in the ') + chalk.yellow(percentile.replace('p', '') + 'th') + ' percentile';
};

Output.prototype.compareWeights = function (siteImageWeight, sizes, percentiles) {
	if (siteImageWeight === undefined) {
		return;
	}
	var comparisons = '';
	siteImageWeight = parseInt(siteImageWeight, 10);
	for (var i = 0; i < percentiles.length; i++) {
		comparisons += this.compareWeightPercentile(siteImageWeight, sizes[i], percentiles[i]) + '\n';
	}
	return comparisons;
};

/**
 * Check if image weight is higher than one of the available percentile sizes
 * @param sizeImageWeight
 * @param sizes
 * @param percentiles
 * @returns {*}
 */
Output.prototype.getHighestPercentile = function (sizeImageWeight, sizes, percentiles) {
	if (sizeImageWeight === undefined) {
		return;
	}
	var highestPercentileMatch = -1;
	// Begin with index 2 to avoid catching unnecessary labels
	// like `desktop` and `mobile` included in this row of data
	for (var i = 2; i < percentiles.length; i++) {
		sizes[i] = parseInt(sizes[i], 10);
		if (sizeImageWeight > sizes[i]) {
			highestPercentileMatch = i;
		}
	}
	return percentiles[highestPercentileMatch];
};


Output.prototype.process = function (parameters, response, done) {

	done = done || function () {};
	var logger = console.log;
	var error = null;
	this.threshold = parameters.threshold || this.threshold;
	this.verbose = parameters.verbose;
	var yourImageWeight = parseInt(response.pageStats.imageResponseBytes || 0, 10);
	var unoptimizedImages = response.formattedResults.ruleResults.OptimizeImages.urlBlocks;
	var desktopWeights = this.compareWeights(yourImageWeight / 1000, this.outputData.desktop, this.outputData.titles);
	var mobileWeights = this.compareWeights(yourImageWeight / 1000, this.outputData.mobile, this.outputData.titles);
	var highestPercentileDesktop = this.getHighestPercentile(yourImageWeight / 1000, this.bigQueryData.desktop, this.bigQueryData.titles);
	var highestPercentileMobile = this.getHighestPercentile(yourImageWeight / 1000, this.bigQueryData.mobile, this.bigQueryData.titles);
	var imagesToOptimize = '';

	if (this.verbose) {

		if (unoptimizedImages[1] !== undefined) {
			unoptimizedImages[1].urls.forEach(function (url) {
				url.result.args.forEach(function (x) {
					var result = '';
					switch (x.type) {
						case 'URL':
							result += chalk.green(x.value);
							break;
						case 'BYTES':
							result += 'Size: ' + chalk.red(x.value);
							break;
						case 'PERCENTAGE':
							result += 'Can be improved by ' + chalk.yellow(x.value) + '\n';
							break;
					}
					imagesToOptimize += result + '\n';
				});
			});
		}
	}

	logger([
		chalk.cyan('Your image weight: ') + prettyBytes(yourImageWeight),

		chalk.cyan('\nOn Mobile you are:'),
		mobileWeights,
		'The median site has ' + prettyBytes(this.averages.mobile * 1000) + ' of images',
		'You have more image bytes than ' + highestPercentileDesktop.replace('p', '') + '% of sites',

		chalk.cyan('\nOn Desktop you are:'),
		desktopWeights,
		'The median site has ' + prettyBytes(this.averages.desktop * 1000) + ' of images',
		'You have more image bytes than ' + highestPercentileMobile.replace('p', '') + '% of sites',

		this.fasterThanAPercentile ? this.keepingWebFast: '',
		imagesToOptimize.length ? (chalk.underline('\nImages to optimize:\n') + imagesToOptimize + chalk.cyan('\nThis list does not include images which cannot be optimized further.\nYou may consider removing those images if possible.')) : '',
	].join('\n'));

	if (response.score < this.threshold) {
		error = new Error('Threshold of ' + this.threshold + ' not met with score of ' + response.score);
	}
	return done(error);
};


module.exports = Output;

