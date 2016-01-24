"use strict";
const Promise = require("promise"),
      strftime = require("strftime"),
      fs = require("fs");

const TIME_REPR = "%H:%M:%S", DAY_REPR = "%a %b %d %Y";
exports.TIME_REPR = TIME_REPR; exports.DAY_REPR = DAY_REPR;
exports.getDurationFor = function(day, time) {
  return (new Date(`${day.date} ${time.end}`).getTime()) - (new Date(`${day.date} ${time.start}`).getTime())
}

// find the latest `.timecard.json` file. This function recurses to find;
// `.timecard.json` files that are further down the tree to allow `clock`s use in
// subfolders. Returns the file path.
function indexCard(path, n, err) {
  n = Number.isFinite(n) ? n : 10 // max recusrion amount
  path = path || ".timecard.json";

  return new Promise((resolve, reject) => {

    if (n <= 0) {
      return reject(`
We couldn't find your \`.timecard.json\` file! You can run \`clock init\` to make
one.
${err}
  `);
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
        if (err) {
          getCard(`../${path}`, n - 1, err).then(resolve).catch(reject);
        } else {
          resolve(JSON.parse(data));
        }
      })
    })
  });
}
exports.getCard = getCard;


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
exports.setCard = setCard;

function getSpotForDay(times) {
  let day = strftime(DAY_REPR);
  return times.find((stamp) => stamp.date === day);
}

// create a new `.timecard.json` in the current directory.
exports.cardInit = function cardInit() {
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
exports.clockIn = function clockIn() {
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
exports.clockOut = function clockIn() {
  return new Promise((resolve, reject) => {
    getCard().then((timecard) => {
      let spot = getSpotForDay(timecard.card);
      let time = strftime(TIME_REPR);
      let day = strftime(DAY_REPR);
      if (spot) {
        spot.times = (spot.times
          .filter((i) => i.end === undefined)
          .map((i) => {
           i.end = time;
           return i;
          })
        );
        setCard(timecard).then(() => resolve({day: day, time: time})).catch(reject);
      } else {
        reject("You never clocked in!");
      }
    }).catch(reject);
  });
}
