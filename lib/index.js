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
    case "invoice":
      card.getCard().then((timecard) => {
        card.getReportTemplate(timecard.reportFormat || "default").then((contents) => {
          let ejs_data = card.getTimecardRenderDetails(timecard);
          let report = ejs.render(contents, ejs_data);
          if (args.print) {
            // push to stdout
            console.log(report);
            cb();
          } else {
            // write to disk
            fs.writeFile(args.file || "report.html", report, (err) => {
              if (err) {
                onError(err);
              } else {
                console.log("Wrote to", args.file || "report.html");
                cb();
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
  card.echoLogo();
  showVersion();
  console.log(`
Record your project development time.
 
Set up waltz with \`waltz init\`, then \`waltz in\` or \`waltz out\` to
record start or end time, respectively. Alternatively, use \`waltz watch\` to
manage recording your time automatically. To see a list of all times, run
\`waltz ls\`, and to generate a fancy-looking invoice, use \`waltz report\`.
 
Commands

  ---
  ${chalk.magenta("waltz init")}
  ---
  Create a new timecard in the current directory.
    \`--commit\` will fashion and make a new commit for this timecard.

  ---
  ${chalk.magenta("waltz in")}
  ---
  Clock in, starting a new time. This is typically run at the start of a work period.

  ---
  ${chalk.magenta("waltz out")}
  ---
  Clock out the current time. This is typically run at the end of a work period. If run with no unending times, it will error.

  ---
  ${chalk.magenta("waltz ls")} (aliased to \`waltz print\` and \`waltz list\`)
  ---
  List all times that are currently in the timecard.

  ---
  ${chalk.magenta("waltz paycheck")} (aliased to \`waltz markpaid\`)
  ---
  Marks all current times as paid.  After one is paid, run this command to reset the invoice total back to "zero", and start the next billing period. Times generated after this is run will still be unpaid, however.


  ---
  ${chalk.magenta("waltz report")} (aliased to \`waltz invoice\`)
  ---
  Generate an invoice and save in the current directory as \`report.html\`, by default.

    \`--print\` Print to stdout instead of writing to file.
    \`--file my_report.html\` Redirect the report to a different file.

  ---
  ${chalk.magenta("waltz watch")}
  ---
  This works by monitoring filesystem changes. When a file is updated, Waltz will record your start time, and after an expiry period, Waltz will record your end time. Because accuracy isn't guaranteed, if you need by-the-second times, use waltz in and waltz out.

    \`--expires 10\` Amount of minutes required of inactivity to
                 be considered "waltzed out". (default = 10 minutes)
    \`-- watchdir some/dir\` The root folder to watch for file changes
    \`-- verbose, -v\` Log all of the changes that waltz registers
    \`--quiet, -q\` Don't print anything to stdout (errors will still be logged)
    \`--ignore [Ii]gnore_me\` An ignore regex for files that shouldn't trigger a clock in or out.
                          Defaults to \`([\/\\]\.|node_modules|\.timecard\.json|\.git)\`
 
  ---
  ${chalk.magenta("Other")}
  ---
  -h, --help              Show this help message
  -v, --version           Show the current waltz cli version
  `.replace(/(`.*?`)/g, (match) => {
    // highlight all of the commands that are in backticks (remove them, and
    // change the color)
    return chalk.cyan(match.slice(1).slice(0, -1));
  }));
}

module.exports = {
  run,
};
