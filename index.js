'use strict';
const fs = require('fs');
const path = require('path');
const prettyBytes = require('pretty-bytes');
const chalk = require('chalk');
const logSymbols = require('log-symbols');

const THRESHOLD = 70;

class Output {
	constructor() {
		/**
		 * What indices from BigQuery do we want to summarize scores
		 * for in the CLI output?
		 * @type {number[]}
		 */
		this.indicesOfInterest = [3, 6, 9]; // 25th, 50th, 75th percentile

		/**
		 * Is the weight higher than one of the BigQuery
		 * percentiles?
		 * @type {boolean}
		 */
		this.fasterThanAPercentile = false;
		this.bigQueryData = {
			desktop: [],
			mobile: [],
			titles: []
		};

		/**
		 * A subset of BigQuery data that we actually use for output
		 * This should represent the indices of interest from the
		 * bigQueryData.
		 * @type {{desktop: Array, mobile: Array, titles: Array}}
		 */
		this.outputData = {
			desktop: [],
			mobile: [],
			titles: []
		};

		/**
		 * Average image weights per site, based on BigQuery data
		 * @type {{desktop: number, mobile: number}}
		 */
		this.medians = {};

		const data = fs.readFileSync(path.join(__dirname, 'data/bigquery.csv'), 'utf8').split('\n');

		// Complete full set of available BigQuery Data
		this.bigQueryData.titles = data[0].split(',');
		this.bigQueryData.desktop = data[1].split(',').slice(1).map(x => parseInt(x, 10));
		this.bigQueryData.mobile = data[2].split(',').slice(1).map(x => parseInt(x, 10));

		// Sub-slice portions of data we're interested
		for (const item of this.indicesOfInterest) {
			this.outputData.desktop.push(this.bigQueryData.desktop[item]);
			this.outputData.mobile.push(this.bigQueryData.mobile[item]);
			this.outputData.titles.push(this.bigQueryData.titles[item]);
		}

		this.medians.mobile = parseInt(this.bigQueryData.mobile[1], 10);
		this.medians.desktop = parseInt(this.bigQueryData.desktop[1], 10);
	}

	/**
	 * Compare a supplied image weight with the weight in a supplied percentile.
	 * @param siteImageWeight
	 * @param percentileImageWeight
	 * @param percentile
	 * @returns {string} Summary message of comparisons to the percentile
	 */
	compareWeightPercentile(siteImageWeight, percentileImageWeight, percentile) {
		if (siteImageWeight === undefined) {
			return;
		}

		let diff = (siteImageWeight - parseInt(percentileImageWeight, 10)) * 1000;

		if (diff > 0) {
			diff = chalk.red('+' + prettyBytes(diff));
		} else {
			diff *= -1;
			diff = chalk.green('-' + prettyBytes(diff));
			this.fasterThanAPercentile = true;
		}

		return diff + (' compared to sites in the ') + chalk.yellow(percentile.replace('p', '') + 'th') + ' percentile';
	}

	compareWeights(siteImageWeight, sizes, percentiles) {
		if (siteImageWeight === undefined) {
			return;
		}

		let comparisons = '';
		siteImageWeight = parseInt(siteImageWeight, 10);

		for (let i = 0; i < percentiles.length; i++) {
			comparisons += this.compareWeightPercentile(siteImageWeight, sizes[i], percentiles[i]) + '\n';
		}

		return comparisons;
	}

	/**
	 * Check if image weight is higher than one of the available percentile sizes
	 * @param sizeImageWeight
	 * @param sizes
	 * @param percentiles
	 * @returns {*}
	 */
	getHighestPercentile(sizeImageWeight, sizes, percentiles) {
		if (sizeImageWeight === undefined) {
			return;
		}

		let highestPercentileMatch = -1;
		let result;

		// Begin with index 2 to avoid catching unnecessary labels
		// like `desktop` and `mobile` included in this row of data
		for (let i = 2; i < percentiles.length; i++) {
			sizes[i] = parseInt(sizes[i], 10);

			if (sizeImageWeight > sizes[i]) {
				highestPercentileMatch = i;
			}
		}

		if (highestPercentileMatch === -1) {
			result = '0';
		} else {
			result = percentiles[highestPercentileMatch];
		}

		return result;
	}

	process(opts, res) {
		const threshold = opts.threshold || THRESHOLD;
		const yourImageWeight = parseInt(res.pageStats.imageResponseBytes || 0, 10);
		const unoptimizedImages = res.formattedResults.ruleResults.OptimizeImages.urlBlocks;
		const desktopWeights = this.compareWeights(yourImageWeight / 1000, this.outputData.desktop, this.outputData.titles);
		const mobileWeights = this.compareWeights(yourImageWeight / 1000, this.outputData.mobile, this.outputData.titles);
		const unoptimizedUrls = unoptimizedImages[0] && unoptimizedImages[0].urls;
		let imagesToOptimize = '';

		if (opts.verbose && unoptimizedUrls && unoptimizedUrls.length > 0) {
			for (const url of unoptimizedUrls) {
				for (const x of url.result.args) {
					let result = '';

					switch (x.type) {
						case 'URL':
							result += chalk.green(x.value);
							break;
						case 'BYTES':
							result += `Size: ${chalk.red(x.value)}`;
							break;
						case 'PERCENTAGE':
							result += `Can be improved by ${chalk.yellow(x.value)}\n`;
							break;
						default:
							// No default
					}

					imagesToOptimize += result + '\n';
				}
			}
		}

		console.log([
			chalk.cyan('\nYour image weight'), prettyBytes(yourImageWeight),
			chalk.gray('Median mobile site image weight'), prettyBytes(this.medians.mobile * 1000),
			chalk.gray('Median desktop site image weight'), prettyBytes(this.medians.desktop * 1000),
			chalk.cyan('\nOn Mobile'),
			mobileWeights,
			chalk.cyan('On Desktop'),
			desktopWeights
		].join('\n'));

		if (this.fasterThanAPercentile) {
			console.log(chalk.cyan('Thanks for keeping the web fast <3'));
		}

		if (imagesToOptimize.length > 0) {
			console.log(chalk.underline('\nImages to optimize\n') + imagesToOptimize + chalk.cyan('This list does not include images which cannot be optimized further.\nYou may consider removing those images if possible.\n'));
		}

		if (res.score < threshold) {
			console.error(chalk.bold(`${logSymbols.error} Threshold of ${threshold} not met with score of ${res.score}`));
			process.exit(1); // eslint-disable-line unicorn/no-process-exit
		}
	}
}

module.exports = () => new Output();
