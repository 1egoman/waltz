#!/usr/bin/env node
"use strict";
const args = require("minimist")(process.argv.slice(2)),
      pkg = require("../package.json"),
      card = require("./card"),
      fs = require("fs-extra"),
      ejs = require("ejs"),
      strftime = require("strftime"),
      watch = require("./watch"),
      chalk = require("chalk");
const action = args._[0] // what are we trying to do?

function run(action, args, cb) {
  cb = cb || () => null;
  switch(action) {
    case "in":
      card.waltzIn().then(() => {
        console.log("Waltzed in. GO!");
        cb();
      }).catch(onError);
      break;

    case "out":
      card.waltzOut().then(() => {
        console.log("Waltzed out. Go work on something else.");
        cb();
      }).catch(onError);
      break;

    case "watch":
      watch.watchAndUpdateAccordingly(args);
      break;

    case "init":
      card.cardInit(args).then(() => {
        console.log(`Created ${chalk.cyan('`.timecard.json`')}. Start working with ${chalk.cyan('`waltz in`')}!`);
        cb();
      }).catch(onError);
      break;

    case "report":
      card.getCard().then((timecard) => {
        getReportTemplate(timecard.reportFormat || "default").then((contents) => {
          let ejs_data = card.getTimecardRenderDetails(timecard);
          let report = ejs.render(contents, ejs_data);
          if (args.print) {
            // push to stdout
            console.log(report);
          } else {
            // write to disk
            fs.writeFile(args.file || "report.html", report, (err) => {
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
        console.log(chalk.bold(chalk.green("Unpaid Hours") + " / " + chalk.red("Paid Hours") + ":"));
        let total_duration = totalDuration(data, (day, time) => {
          if (day.disabled) {
            console.log(`${chalk.red(day.date)}\t\t ${time.start} - ${time.end || "(no end)"}`)
          } else {
            console.log(`${chalk.green(day.date)}\t\t ${time.start} - ${time.end || "(no end)"}`)
          }
        });

        // the total time that it took, prettyprinted
        console.log(`About ${Math.floor(total_duration / 3600)} hours, ` +
          `${Math.floor(total_duration / 60) % 60} minutes, ` + 
          `and ${total_duration % 60} seconds`
        )
        // if there is an hourly rate present, log out the total cost of the
        // project
        if (data.hourlyRate) {
          console.log(` = $${Math.round( 100 * (total_duration / 3600) * data.hourlyRate) / 100}`)
        }
      }).catch(onError);
      break;

    case "markpaid":
    case "paycheck":
      card.getCard().then((data) => {
        data.card.map((time) => {
          if (!time.disabled) {
            time.disabled = `${strftime(card.DAY_REPR)}\n${strftime(card.TIME_REPR)}`
          }
        });
        card.setCard(data).then(() => {
          console.log(chalk.cyan("All previous times are now disabled."));
        }).catch(onError);
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
}
run(action, args);

function touchDotTimecard() {
  fs.mkdirpSync(`${process.env.HOME}/.timecard/templates`);
}

// get the name of a report template
function getReportTemplate(filename) {
  return new Promise((resolve, reject) => {
    touchDotTimecard();
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
      return getReportTemplate(`${process.env.HOME}/.timecard/templates/${filename}.ejs`).then(resolve).catch(reject);
    }
  });
}

// given a timecard, calculate the total amount of time spent on the project.
function totalDuration(data, cbForEach) {
  return data.card.reduce((acc, day) => {
    return acc + day.times.reduce((acc, time) => {
      cbForEach && cbForEach(day, time);
      if (!day.disabled) {
        return acc + card.getDurationFor(day, time);
      } else {
        return acc;
      }
    }, 0);
  }, 0) / 1000 || 0;
}

// there was an error, somewhere
// catch it, and log it out.
function onError(error) {
  if (process.env.NODE_ENV !== "test") {
    console.log(chalk.red(`Oh no! There was an error!\n${error.toString()}`));
  } else {
    throw error;
  }
}

function showVersion() {
  console.log(`Waltz CLI version ${chalk.green(pkg.version)}`);
}

function showHelp() {
console.log(`
Record your project development time.
 
Set up waltz with \`waltz init\`, then \`waltz in\` or \`waltz out\` to
record start or end time, respectively. Alternatively, use \`waltz watch\` to
manage recording your time automatically. To see a list of all times, run
\`waltz ls\`, and to generate a fancy-looking invoice, use \`waltz report\`.
 
Commands
  waltz init
    \`--commit\` will auto-commit the timecard with git.
  waltz in
  waltz out
  waltz ls (aliased to \`waltz print\` and \`waltz list\`)
  waltz paycheck (will mark all current waltz ins / outs as paid)
  waltz report (by default, writes to report.html in the cwd)
    \`--print\` will print to stdout instead of writing to file.
    \`--file my_report.html\` can send to a different file.
  waltz watch
    \`--oldfile 1000\` amount of milliseconds required of inactivity to
                       be considered "waltzed out". (default = 10 minutes)
 
Options
    -h, --help              Show this help message
    -v, --version           Show the current timecard version
`.replace(/`(.*?)`/g, (match) => {
  return chalk.cyan(match); // highlight all of the commands
}));
}

module.exports = {
  run,
};
