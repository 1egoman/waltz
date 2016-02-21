"use strict";
let card = require("./card"),
    chalk = require("chalk"),
    chokidar = require("chokidar");

const OLD_FILE_DELTA = 10 * 60 * 1000; // 10 minutes, by default

function getWatchArgsFor(args) {
  return {
    ignored: args.ignored ? new RegExp(args.ignored) : /([\/\\]\.|node_modules|\.timecard\.json|\.git)/,
    verbose: args.v || args.verbose || false,
    quiet: args.quiet ? true : false,
    watchDir: args.watchDir || '.',
    oldfile: args.expires ? args.expires * (60 * 1000) : OLD_FILE_DELTA,
  };
}

function watchAndUpdateAccordingly(passedArgs) {
  // start by updating (now), and well, we're currently on.
  let lastUpdated = new Date().getTime(),
      currentState = true,
      args = getWatchArgsFor(passedArgs);

  console.log("Listening for changes...");
  console.log(`After a minimum of ${args.oldfile / 60000} minute(s) of inactivity, you will auto-waltz-out.`);
  card.waltzIn(); // waltz in at start

  // update the lastUpdated flag every time a new update comes in.
  chokidar.watch(args.watchDir, {ignored: args.ignored}).on('all', (event, path) => {
    lastUpdated = (new Date()).getTime()
    currentState = newFileChangeEvent(args, event, path, currentState);
  });

  // every once and a while, verify we haven't fallen into a stale state
  setInterval(() => {
    currentState = isCurrentStateNotStale(args, lastUpdated, currentState);
  }, args.oldfile / 2) // update often enough so we don't accidently go over the deadline
}

function newFileChangeEvent(args, event, path, currentState) {
  // log it all out
  if (!args.quiet && event === "change") {
    console.log("Update", path);
  } else if (args.verbose) {
    console.log("->", event, path)
  }

  if (currentState === false) {
    card.waltzIn()
    console.log("> Waltz in @", new Date());
  }

  return true;
}

function isCurrentStateNotStale(args, lastUpdated, currentState) {
  if ((new Date().getTime()) - lastUpdated > args.oldfile && currentState === true) {
    // we are in a stale state
    card.waltzOut();
    console.log("> Waltz out @", new Date());
    return false;
  } else {
    return currentState;
  }
}

module.exports = {
  getWatchArgsFor: getWatchArgsFor,
  watchAndUpdateAccordingly: watchAndUpdateAccordingly,
  isCurrentStateNotStale: isCurrentStateNotStale,
  newFileChangeEvent: newFileChangeEvent,
};
