'use strict';

var prettyBytes = require('pretty-bytes');
var chalk = require('chalk');
var utils = require('./lib/utils');
var csvparse = require('csv-parse');
var fs = require('fs');

exports.init = function() {
    var threshold = 70;
    var exports = {};
    var verbose = '';
    var titles, desktop, mobile = [];
    var fasterThanAPercentile =  false;
    var desktopAverage = 0;
    var mobileAverage  = 0;

    var compareWeight = function(siteImageWeight, percentileImageWeight, percentile) {
        var diff = (siteImageWeight - parseInt(percentileImageWeight, 10)) * 1000;
        if (diff > 0) {
            diff = chalk.red('+' + prettyBytes(diff));
        } else {
            diff = diff * -1;
            diff = chalk.green('-' + prettyBytes(diff));
            fasterThanAPercentile = true;
        }
        return diff + (' compared to a site in ') + chalk.yellow(percentile.replace('p', '') + 'th') + ' percentile';
    }

    var compareWeights = function(siteImageWeight, sizes, percentiles) {
        var comparisons = "";
        siteImageWeight = parseInt(siteImageWeight, 10);
        for (var i = 2; i < percentiles.length; i++) {
            comparisons += compareWeight(siteImageWeight, sizes[i], percentiles[i]) + '\n';
        }
        return comparisons;
    }

    var parser = csvparse({
        delimiter: ';'
    }, function(err, data) {
        titles = data[0][0].split(',');
        desktop = data[1][0].split(',');
        mobile = data[2][0].split(',');
        mobileAverage = parseInt(mobile[1], 10);
        desktopAverage = parseInt(desktop[1], 10);
    });

    fs.createReadStream(__dirname + '/data/bigquery.csv').pipe(parser);

    var generateScore = function(url, strategy, score) {
        var color = utils.scoreColor(score);

        score = 'Score:     ' + color(score);
        url = 'URL:       ' + chalk.cyan(url);
        strategy = 'Strategy:  ' + chalk.cyan(strategy);

        return [url, score, strategy].join('\n') + '\n';
    };

    var generateRuleSetResults = function(rulesets) {
        var result, ruleImpact, title;
        var _results = [];

        for (title in rulesets) {
            result = rulesets[title];
            ruleImpact = Math.ceil(result.ruleImpact * 100) / 100;
            _results.push(utils.labelize(title) + chalk.cyan(ruleImpact));
        }

        return _results.join('\n');
    };

    var generateStatistics = function(statistics) {
        var result, title;
        var _results = [];

        for (title in statistics) {
            result = title.indexOf('Bytes') !== -1 ?
                prettyBytes(+statistics[title]) :
                statistics[title];

            _results.push(utils.labelize(title) + chalk.cyan(result));
        }

        return _results.join('\n');
    };

    exports.threshold = function(limit) {
        threshold = limit;
        return threshold;
    };

    exports.process = function(parameters, response, done) {
        var logger = console.log,
            error = null;

        done = done || function() {};
        threshold = parameters.threshold || threshold;
        verbose = parameters.verbose;

        var yourImageWeight = parseInt(response.pageStats.imageResponseBytes || 0, 10);
        var unoptimizedImages = response.formattedResults.ruleResults.OptimizeImages.urlBlocks;
        var imagesToOptimize = '';
        var desktop_weights = compareWeights(yourImageWeight / 1000, desktop, titles);
        var mobile_weights = compareWeights(yourImageWeight / 1000, mobile, titles);
        var mobileDifference = yourImageWeight - mobileAverage * 1000;
        var desktopDifference = yourImageWeight - desktopAverage * 1000;
        var shave = chalk.cyan('Thanks for keeping the web fast <3');

        if (verbose) {
            if (unoptimizedImages[1] !== undefined) {
                unoptimizedImages[1].urls.forEach(function(url) {
                    url.result.args.forEach(function(x) {
                        var result = '';
                        switch (x.type) {
                            case 'URL':
                                result += chalk.green(x.value);
                                break;
                            case 'BYTES':
                                result += 'Size: ' + chalk.red(x.value);
                                break;
                            case 'PERCENTAGE':
                                result += 'Can be improved by ' + chalk.yellow(x.value);
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
            mobile_weights,
            // prettyBytes(mobileDifference) + ' compared to the median site',
            'The median site has ' + prettyBytes(mobileAverage * 1000) + ' of images',
            
            chalk.cyan('\nOn Desktop you are:'),
            desktop_weights,
            'The median site has ' + prettyBytes(desktopAverage * 1000) + ' of images',
            // prettyBytes(desktopDifference) + ' compared to the median site',
            
            fasterThanAPercentile ? shave : '',
            imagesToOptimize.length ? (chalk.underline('\nImages to optimize:\n') + imagesToOptimize + chalk.cyan('\nThis list does not include images which cannot be optimized further.\nYou may consider removing those images if possible.')) : '',
        ].join('\n'));

        if (response.score < threshold) {
            error = new Error('Threshold of ' + threshold + ' not met with score of ' + response.score);
        }

        return done(error);
    };

    return exports;
};
