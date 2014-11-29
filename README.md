# tmi [![Dependency Status](https://david-dm.org/addyosmani/tmi.svg)](https://david-dm.org/addyosmani/tmi) [![devDependency Status](https://david-dm.org/addyosmani/tmi/dev-status.svg)](https://david-dm.org/addyosmani/tmi#info=devDependencies) [![Build Status](https://travis-ci.org/addyosmani/tmi.svg?branch=master)](https://travis-ci.org/addyosmani/tmi)

> TMI (Too Many Images)

Discover your image weight on the web. Find out the image weight in your pages, compare to the BigQuery medians and discover what images you can optimize further. 


## Install

```sh
$ npm install -g tmi
```

## Quick start

Summary:

```sh
$ tmi <url>
```

Examples:

![](http://i.imgur.com/v9kMjQS.png)

![](http://i.imgur.com/CglUZ8N.png)

Switch between desktop and mobile strategies:

```sh
$ tmi <url> --strategy=mobile
```

![](http://i.imgur.com/DEI2wWG.png)

Detailed summary with URLs you can optimize:

```sh
$ tmi <url> --verbose
```

![](http://i.imgur.com/Z3K6kIN.png)


## Usage

This module is modelled on [psi](http://github.com/addyosmani/psi) and follows a very similar API.

When using this module for a production-level build process, registering for an API key from the [Google Developer Console](https://developers.google.com/speed/docs/insights/v1/getting_started#auth) is recommended.

```js
var tmi = require('tmi');

tmi({
	// key: '...', optional
	url: 'http://html5rocks.com',
	paths: '',           // optional
	locale: 'en_GB',     // optional
	strategy: 'mobile',  // optional
	threshold: 80        // optional
});
```

Optionally, a callback is also available with access to the response:

```js
tmi(options, function (err, data) {
	console.log(data.score);
	console.log(data.pageStats);
});
```

### Options

#### url

*Required*  
Type: `string`

URL of the page for which the PageSpeed Insights API should generate results.

#### locale

Type: `string`  
Default: `en_US`

The locale that results should be generated in (e.g 'en_GB').

#### strategy

Type: `string`  
Default: `desktop`

The strategy to use when analyzing the page. Valid values are desktop and mobile.

#### threshold

Type: `number`  
Default: `70`

Threshold score that is needed to pass the pagespeed test

#### paths

Type: `array`

An array of URL paths that are appended to the URL

#### key

Type: `string`  
Default: `nokey`

[Google API Key](https://code.google.com/apis/console/)

Unless Specified defaults to use the free tier on PageSpeed Insights. Good for getting a feel for how well this tool works for you.


## CLI support

You will probably want to globally install tmi if using as a CLI. This can be done as follows:

```sh
$ npm install --global tmi
```

You can then casually use it with or without your key:

```sh
$ tmi http://www.google.com
```

```sh
$ tmi http://www.google.com --key 'YOUR_KEY_GOES_HERE'
```

With or without http:// for URLs:

```sh
$ tmi chrome.com
```

Or ask for a more detailed report including image URLs that can be optimized:

```sh
$ tmi http://www.google.com --verbose
```

Similar to gpagespeed, the following optional flags are also supported:

```sh
$ tmi <url> --key=<key> --prettyprint=<true> --userIp=<userIp> --locale=<locale> --strategy=<desktop|mobile>
```

```sh
$ tmi http://www.html5rocks.com --strategy=mobile
```

### Good test URLs

* [LG Watch](http://www.lg.com/global/gwatch/index.html)
* [MySpace homepage](http://myspace.com)
* [Mercedes Benz](https://www.mercedes-benz.com/)
* [Apple iMac](http://www.apple.com/imac/)
* [Cyclemon](http://www.cyclemon.com/)

## Local testing

We plan on adding support for testing localhost and local files in the
very near future. Until then, [ngrok](https://ngrok.com/) should be able
to help get you mostly there.

## License

Apache 2.
