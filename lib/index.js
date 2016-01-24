#!/usr/bin/env node
"use strict";
const args = require("minimist")(process.argv.slice(2)),
      pkg = require("../package.json"),
      card = require("./card.js"),
      fs = require("fs-extra"),
      ejs = require("ejs"),
      chokidar = require("chokidar"),
      chalk = require("chalk");
const action = args._[0] // what are we trying to do?

switch(action) {

  case "in":
    card.clockIn().then(() => {
      console.log("Clocked in. GO!");
    }).catch(onError);
    break;

  case "out":
    card.clockOut().then(() => {
      console.log("Clocked out. Go work on something else.");
    }).catch(onError);
    break;

  case "watch":
    const OLD_FILE_DELTA = 10 * 60 * 1000; // 10 minutes
    let lastUpdated = new Date().getTime(),
        currentState = true;

    console.log("Listening...");
    card.clockIn(); // clock in at start

    // update the lastUpdated flag every time a new update comes in.
    chokidar.watch('.', {ignored: /([\/\\]\.|node_modules|.timecard.json)/}).on('all', (event, path) => {
      // log out changes
      event === "change" && console.log("Update", path)

      lastUpdated = (new Date()).getTime()
      if (currentState === false) {
        card.clockIn()
        console.log("> Clock in @", new Date());
        currentState = true;
      }
    });

    // every once and a while, verify we haven't fallen into a stale state
    setInterval(() => {
      if ((new Date().getTime()) - lastUpdated > (args.oldfile || OLD_FILE_DELTA) && currentState === true) {
        // we are in a stale state
        card.clockOut();
        console.log("> Clock out @", new Date());
        currentState = false;
      }
    }, 10 * 1000) // every 10 seconds

    break;

  case "init":
    card.cardInit().then(() => {
      console.log(`Created ${chalk.cyan('`.timecard.json`')}. Start working with ${chalk.cyan('`clock in`')}!`);
    }).catch(onError);
    break;

  case "report":
    card.getCard().then((timecard) => {
      let ejs_data = {
        timecard: timecard,
        totalTime: totalDuration(timecard),
        args: args
      };

      // if possible, add the total cost of the project to the ejs data
      if (timecard.hourlyRate) {
        ejs_data.totalCost = Math.round(100 * (ejs_data.totalTime / 3600) * timecard.hourlyRate) / 100
      }

      // render ejs page
      getReportTemplate(timecard.reportFormat || "default").then((contents) => {
        let ejs_contents = ejs.render(contents, ejs_data);
        // write to disk, or print
        if (args.print) {
          // push to stdout
          console.log(ejs_contents);
        } else {
          fs.writeFile(args.file || "report.html", ejs_contents, (err) => {
            if (err) {
              onError(err);
            } else {
              console.log("Wrote to", args.file || "report.html");
            }
          });
        }
      }).catch(onError);
    }).catch(onError);
    break;

  case "ls":
  case "list":
  case "print":
    card.getCard().then((data) => {
      console.log(chalk.green(chalk.bold("Logged Hours:")));
      let total_duration = totalDuration(data, (day, time) => {
        console.log(`${chalk.magenta(day.date)}\t\t ${time.start} - ${time.end || "(no end)"}`)
      });

      // the total time that it took, prettyprinted
      console.log(`About ${Math.floor(total_duration / 3600)} hours,
${Math.floor(total_duration / 60) % 60} minutes, and ${total_duration % 60}
seconds`.replace(/\n/g, ' ')
      )
      // if there is an hourly rate present, log out the total cost of the
      // project
      if (data.hourlyRate) {
        console.log(` = $${Math.round( 100 * (total_duration / 3600) * data.hourlyRate) / 100}`)
      }
    }).catch(onError);
    break;

  default:
    if (args.help || args.h) {
      showHelp();
    } else if (args.version || args.v) {
      showVersion();
    } else {
      showHelp(true);
    }
    break;
}

function touchDotTimeclock() {
  fs.mkdirpSync(`${process.env.HOME}/.timeclock/templates`);
}

// get the name of a report template
function getReportTemplate(filename) {
  return new Promise((resolve, reject) => {
    touchDotTimeclock();
    if (filename.endsWith(".ejs")) {
      fs.readFile(filename, "utf8", (err, contents) => {
        if (err) {
          reject(err);
        } else {
          resolve(contents);
        }
      });
    } else {
      // use a supplied template
      return getReportTemplate(`${process.env.HOME}/.timeclock/templates/${filename}.ejs`).then(resolve).catch(reject);
    }
  });
}

// given a timecard, calculate the total amount of time spent on the project.
function totalDuration(data, cbForEach) {
  return data.card.reduce((acc, day) => {
    return acc + day.times.reduce((acc, time) => {
      cbForEach && cbForEach(day, time);
      return acc + card.getDurationFor(day, time);
    }, 0);
  }, 0) / 1000 || 0;
}

// there was an error, somewhere
// catch it, and log it out.
function onError(error) {
  console.log(chalk.red(`Oh no! There was an error!\n${error.toString()}`));
}

function showVersion() {
  console.log(`Timeclock version ${chalk.green(pkg.version)}`);
}

function showHelp() {
console.log(`
Record your project development time.
 
Set up timeclock with \`clock init\`, then \`clock in\` or \`clock out\` to
record start or end time, respectively. Alternatively, use \`clock watch\` to
manage recording your time automatically. To see a list of all times, run
\`clock ls\`, and to generate a fancy-looking invoice, use \`clock report\`.
 
Commands
  clock init
  clock in
  clock out
  clock ls (aliased to \`clock print\` and \`clock list\`)
  clock report (by default, writes to report.html in the cwd)
    \`--print\` will print to stdout instead of writing to file.
    \`--file my_report.html\` can send to a different file.
  clock watch
    \`--oldfile 1000\` amount of milliseconds required of inactivity to
                       be considered "clocked out". (default = 10 minutes)
 
Options
    -h, --help              Show this help message
    -v, --version           Show the current timecard version
`.replace(/`(.*?)`/g, (match) => {
  return chalk.cyan(match); // highlight all of the commands
}));
}
