"use strict";
const Promise = require("promise"),
      strftime = require("strftime"),
      chalk = require("chalk"),
      request = require("request"),
      gitconfig = require("git-config"),
      username = require("username"),
      fsp = require("fs-promise"),
      _ = require("underscore"),
      tinycolor2 = require("tinycolor2"),
      inquirer = require("inquirer"),
      exec = require('child_process').exec,
      repo = require("./repo");

// the time representations to use internally
const TIME_REPR = "%H:%M:%S", DAY_REPR = "%a %b %d %Y";
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
// `.timecard.json` files that are further down the tree to allow `waltz`s use in
// subfolders. Returns the file path.
function indexCard(path, n, err) {
  n = Number.isFinite(n) ? n : 10 // max recusrion amount
  path = path || ".timecard.json";

  return new Promise((resolve, reject) => {
    if (n <= 0) {
      return reject(chalk.yellow(`We couldn't find your \`.timecard.json\` file! You can run \`waltz init\` to make one.`));
    }

    fsp.readFile(path, 'utf8').then((data) => {
      resolve(path);
    }, (err) => {
      indexCard(`../${path}`, n - 1, err).then(resolve).catch(reject);
    });
  });
}

// find the latest `.timecard.json` file. This function recurses to find
// `.timecard.json` files that are further down the tree to allow `waltz`s use in
// subfolders.
function getCard(path, n, err) {
  return indexCard()
  .then((path) => fsp.readFile(path, 'utf8'))
  .then((data) => {
    let json = JSON.parse(data);
    if (err) {
      return getCard(`../${path}`, n - 1, err);
    } else if (assertIsCard(json)) {
      return json;
    } else {
      throw new Error(`The specified timecard wasn't a valid timecard: ${path}
      This can happen if you timecard is corrupted. Make sure that
      the timecard is valid json and is readable.`);
    }
  });
}

function setCard(timecard, path) {
  indexCard()
  .then((path) => {
    return fsp.writeFile(path, JSON.stringify(timecard, null, 2));
  });
}

function echoLogo() {
  if (process.env.NODE_ENV !== "test") {
    console.log(["",
      "  \\\\        //",
      "   \\\\  /\\  //",
      "    \\\\/  \\//",
      "     v    v   altz",
      ""
    ].join("\n"));
  }
}

// get the card section for the current day
function getSpotForDay(times) {
  let day = strftime(DAY_REPR);
  return times.find((stamp) => stamp.date === day);
}

// create a new `.timecard.json` in the current directory.
function cardInit(args) {
  echoLogo();
  return askUserFor(args)
  .then((data) => {
    function writeTimecard() {
      return fsp.writeFile(".timecard.json", JSON.stringify(
          _.extend(data, {
          reportFormat: "default",
          hourlyRate: 0,
          card: []
        })
      , null, 2));
    }

    // add a commit along with the timecard
    if (args && args.commit) {
      exec(`
        git add .timecard.json &&
        git commit -m "Init waltz timecard\n\nSee http://waltzapp.co for more information"
      `, (error, stdout, stderr) => {
          console.error(stderr); // log any errors
          if (error) {
            throw error;
          } else {
            console.log(stdout);
          }
        }
      )
    } else {
      return writeTimecard();
    }
  });
}

function askUserFor(args) {
  return new Promise((resolve, reject) => {
    if (process.env.NODE_ENV === "test") { resolve(args || {}) }; // bypass in tests
    if (typeof args !== "object") {
      resolve({});
    }

    let questions = [],
        arg_keys = Object.keys(args);
    [
      {
        name: "name",
        message: "What is the name of the project?",
      },
      {
        name: "tagline",
        message: "Enter a description.",
      },
      {
        name: "reportFormat",
        message: "When displayed, which format would you like to user?",
        type: "list",
        choices: ["default", "clean", {name: "Something Else", value: "else"}],
      },
      {
        name: "reportFormat",
        message: "Enter a name (like `default`), a git repo (like `user/repo:file/here.ejs`), or a url.",
        when: (args) => args.reportFormat === "else"
      },
      {
        name: "primaryColor",
        message: "Choose a primary color",
        default: "#d45500",
        validate: (input) => tinycolor2(input).getFormat() !== false
      },
      {
        name: "secondaryColor",
        message: "Choose a secondary color",
        default: "#007fd4",
        validate: (input) => tinycolor2(input).getFormat() !== false
      },
    ].map((i) => {
      // push unfamiliar questions to be asked.
      if (!arg_keys.some((j) => j === i.name)) {
        questions.push(i);
      }
    });

    inquirer.prompt(questions, resolve);
  });
}

// ge the currently logged in user
function getLoggedInUsername() {
  return new Promise((resolve, reject) => {
    // testing with this can get a litle murky because of differing system
    // configs, so we'll normalize the result when testing
    if (process.env.NODE_ENV === "test") {
      resolve("a-username");
    } else {
      gitconfig((err, config) => {
        if (err) {
          reject(err);
        } else {
          let user = config.github ? config.github.user : config.user.name;
          if (user) {
            resolve(user);
          } else {
            resolve(username());
          }
        }
      });
      }
  });
}

// waltz in at the start of a work period
function waltzIn() {
  let time = strftime(TIME_REPR);
  let day = strftime(DAY_REPR);
  return Promise.all([
    getCard(),
    getLoggedInUsername(),
  ]).then((data) => {
    let timecard = data[0], user = data[1];
    let spot = getSpotForDay(timecard.card);
    if (spot) {
      spot.times.push({
        start: time,
        by: user,
      });
    } else {
      timecard.card.push({
        date: day,
        times: [{
          start: time,
          by: user,
        }]
      });
    }
    return timecard;
  }).then(setCard).then(() => {
    return {
      day: day,
      time: time
    };
  });
}

// waltz out at the end of a work period
function waltzOut() {
  let time = strftime(TIME_REPR);
  let day = strftime(DAY_REPR);
  return Promise.all([
    getCard(),
    getLoggedInUsername(),
  ]).then((data) => {
    let timecard = data[0], user = data[1];
    let spot = getSpotForDay(timecard.card),
        spot_ends = spot && spot.times.every((s) => !userCanWaltzOut(s, user))

    if (spot && !spot_ends) {
      spot.times = spot.times.map((i) => {
        if (userCanWaltzOut(i, user)) {
          i.end = time;
        }
        return i;
      });
      return timecard;
    } else if (spot) {
      throw new Error("There aren't any currently open times that can be closed. Most likely, you ran `waltz out` twice.");
    } else {
      throw new Error("You never waltzed in!");
    }
  }).then(setCard).then(() => {
    return {
      day: day,
      time: time,
    };
  });
}

// there isn't and end to the time, and one of two things:
// 1. the by field doesn't exist
// 2. the by field is === to the username
function userCanWaltzOut(time, user) {
  return typeof time.end === "undefined" && (typeof time.by === "undefined" || time.by && time.by === user);
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
// - `1egoman/waltzmaker:file/in/repo.ejs`
// - `http://example.com/a/template/here.ejs`
// - `default` (will render the default template)
function getReportTemplate(filename) {
    let match = filename.match(/(\w+)\/(\w+):(.*)/);
    if (match) {
      // return the template from the repo listed
      return repo.getFileFromRepo(match[1], match[2], match[3]);
    } else if (filename.endsWith("ejs")) {
      return new Promise((resolve, reject) => {
        request(filename, (err, resp, body) => {
          if (err) {
            reject(err);
          } else {
            resolve(body);
          }
        });
      });
    } else {
      // a default one
      return repo.getFileFromRepo("1egoman", "clockmaker", `templates/${filename}.ejs`);
    }
}

function getTimecardRenderDetails(timecard, args) {
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
  TIME_REPR: TIME_REPR,
  DAY_REPR: DAY_REPR,
  getDurationFor: getDurationFor,
  indexCard: indexCard,
  getCard: getCard, // +1
  setCard: setCard,
  getSpotForDay: getSpotForDay, // +1
  cardInit: cardInit, // +1
  waltzIn: waltzIn, // +1
  waltzOut: waltzOut, // +1
  totalDuration: totalDuration, // +1
  getReportTemplate: getReportTemplate, // ...kinda (a few cases missing)
  getTimecardRenderDetails: getTimecardRenderDetails, // +1
  assertIsCard: assertIsCard, // +1
  userCanWaltzOut: userCanWaltzOut,
  getLoggedInUsername: getLoggedInUsername,
  echoLogo,
}
