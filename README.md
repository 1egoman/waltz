# Waltz [![NPM version][npm-image]][npm-url] [![Dependency Status][daviddm-image]][daviddm-url]
> Track the time you work on projects

## Installation

```sh
$ npm install --global waltz
```

## Usage
```bash
$ waltz init
$ waltz in
$ # wait a while...
$ waltz out
$ waltz ls
Logged Hours:
Sun Jan 24 2016          10:20:00 - 11:20:00
About 1 hours, 0 minutes, and 0 seconds
$ waltz report && google-chrome report.html
# creates a report and opens it in chrome
```
For configuration options, see `.timeclock.json` in your project directory.
For a few example reports, see <https://gist.github.com/1egoman/ba14d9811c7ffa0ddf59>.


## License
 © [1egoman](rgaus.net)


[npm-image]: https://badge.fury.io/js/timeclock.svg
[npm-url]: https://npmjs.org/package/timeclock
[travis-image]: https://travis-ci.org/1egoman/timeclock.svg?branch=master
[travis-url]: https://travis-ci.org/1egoman/timeclock
[daviddm-image]: https://david-dm.org/1egoman/timeclock.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/1egoman/timeclock
