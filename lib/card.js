"use strict";
const Promise = require("promise"),
      strftime = require("strftime"),
      chalk = require("chalk"),
      fs = require("fs"),
      repo = require("./repo");

// the time representations to use internally
const TIME_REPR = "%H:%M:%S", DAY_REPR = "%a %b %d %Y";
exports.TIME_REPR = TIME_REPR; exports.DAY_REPR = DAY_REPR;
function getDurationFor(day, time) {
  if (time.start && time.end) {
    return (new Date(`${day.date} ${time.end}`).getTime()) - (new Date(`${day.date} ${time.start}`).getTime())
  } else {
    // if a currently running zone is going, then use the current time as the
    // end point.
    return getDurationFor(day, {
      start: time.start,
      end: strftime(TIME_REPR),
    });
  }
}

// find the latest `.timecard.json` file. This function recurses to find;
// `.timecard.json` files that are further down the tree to allow `clock`s use in
// subfolders. Returns the file path.
function indexCard(path, n, err) {
  n = Number.isFinite(n) ? n : 10 // max recusrion amount
  path = path || ".timecard.json";

  return new Promise((resolve, reject) => {
    if (n <= 0) {
      return reject(chalk.yellow(`We couldn't find your \`.timecard.json\` file! You can run \`clock init\` to make one.`));
    }

    fs.readFile(path, 'utf8', (err) => {
      if (err) {
        indexCard(`../${path}`, n - 1, err).then(resolve).catch(reject);
      } else {
        resolve(path);
      }
    })
  });
}

// find the latest `.timecard.json` file. This function recurses to find
// `.timecard.json` files that are further down the tree to allow `clock`s use in
// subfolders.
function getCard(path, n, err) {
  return new Promise((resolve, reject) => {
    indexCard().then((path) => {
      fs.readFile(path, 'utf8', (err, data) => {
        let json = JSON.parse(data);
        if (err) {
          getCard(`../${path}`, n - 1, err).then(resolve).catch(reject);
        } else if (assertIsCard(json)) {
          resolve(json);
        } else {
          reject(`The specified timecard wasn't a valid timecard: ${path}
This can happen if you timecard is corrupted. Make sure that
the timecard is valid json and is readable.`);
        }
      })
    }).catch(reject);
  });
}

function setCard(timecard, path) {
  return new Promise((resolve, reject) => {
    indexCard().then((path) => {
      fs.writeFile(path, JSON.stringify(timecard, null, 2), (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    })
  });
}

function getSpotForDay(times) {
  let day = strftime(DAY_REPR);
  return times.find((stamp) => stamp.date === day);
}

// create a new `.timecard.json` in the current directory.
function cardInit() {
  return new Promise((resolve, reject) => {
    fs.writeFile(".timecard.json", JSON.stringify({
      reportFormat: "default",
      hourlyRate: 0,
      card: []
    }, null, 2), (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// clock in at the start of a work period
function clockIn() {
  return new Promise((resolve, reject) => {
    getCard().then((timecard) => {
      let spot = getSpotForDay(timecard.card);
      let time = strftime(TIME_REPR);
      let day = strftime(DAY_REPR);
      if (spot) {
        spot.times.push({
          start: time
        });
      } else {
        timecard.card.push({
          date: day,
          times: [{
            start: time
          }]
        });
      }
      setCard(timecard).then(() => resolve({day: day, time: time})).catch(reject);
    }).catch(reject);
  });
}

// clock out at the end of a work period
function clockOut() {
  return new Promise((resolve, reject) => {
    getCard().then((timecard) => {
      let spot = getSpotForDay(timecard.card);
      let time = strftime(TIME_REPR);
      let day = strftime(DAY_REPR);
      if (spot) {
        spot.times = spot.times.map((i) => {
          if (typeof i.end === "undefined") {
            i.end = time;
          }
          return i;
        });
        setCard(timecard).then(() => resolve({day: day, time: time})).catch(reject);
      } else {
        reject("You never clocked in!");
      }
    }).catch(reject);
  });
}

// given a timecard, calculate the total amount of time spent on the project.
function totalDuration(data, cbForEach) {
  return data.card.reduce((acc, day) => {
    return acc + day.times.reduce((acc, time) => {
      cbForEach && cbForEach(day, time);
      if (!day.disabled) {
        return acc + getDurationFor(day, time);
      } else {
        return acc;
      }
    }, 0);
  }, 0) / 1000 || 0;
}

// returns true if the passes timecard follows the spec
function assertIsCard(timecard) {
  if (typeof timecard === "object" && timecard.card) {
    if (timecard.card.length) {
      return timecard.card.every((date) => {
        return typeof date.date === "string" && date.times && date.times.every((time) => {
          if (time.end) {
            return typeof time.start === "string" && typeof time.end === "string";
          } else {
            return typeof time.start === "string";
          }
        });
      });
    } else {
      return true;
    }
  } else {
    return false;
  }
}

// This method takes:
// - `1egoman/clockmaker:file/in/repo.ejs`
// - `http://example.com/a/template/here.ejs`
// - `default` (will render the default template)
function getReportTemplate(filename) {
  return new Promise((resolve, reject) => {
    let match = filename.match(/(\w+)\/(\w+):(.*)/);
    if (match) {
      // return the template from the repo listed
      resolve(repo.getFileFromRepo(match[1], match[2], match[3]));
    } else if (filename.endsWith("ejs")) {
      request(filename, (err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(body);
        }
      });
    } else {
      // a default one
      resolve(repo.getFileFromRepo("1egoman", "clockmaker", `templates/${filename}.ejs`));
    }
  });
}

function getTimecardRenderDetails(timecard, args) {
  args = args || {};
  let ejs_data = {
    timecard: timecard,
    args: timecard.args || args || {},

    totalTime: totalDuration(timecard),
    totalCost: null,
  };

  // if possible, add the total cost of the project to the ejs data
  if (timecard.hourlyRate) {
    ejs_data.totalCost = Math.round(100 * (ejs_data.totalTime / 3600) * timecard.hourlyRate) / 100
  }
  return ejs_data;
}

module.exports = {
  getDurationFor: getDurationFor,
  indexCard: indexCard,
  getCard: getCard,
  setCard: setCard,
  getSpotForDay: getSpotForDay,
  cardInit: cardInit,
  clockIn: clockIn,
  clockOut: clockOut,
  totalDuration: totalDuration,
  getReportTemplate: getReportTemplate,
  getTimecardRenderDetails: getTimecardRenderDetails,
  assertIsCard: assertIsCard, // +1
}
