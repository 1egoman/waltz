"use strict";
const args = require("minimist")(process.argv.slice(2)),
      pkg = require("../package.json"),
      card = require("./card.js"),
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
    console.log("abc")
    break;

  case "init":
    card.cardInit().then(() => {
      console.log(`Created ${chalk.cyan('`.timecard.json`')}. Start working with ${chalk.cyan('`clock in`')}!`);
    }).catch(onError);
    break;

  case "report":
    console.log("abc")
    break;

  case "ls":
  case "list":
  case "print":
    card.getCard().then((data) => {
      console.log(chalk.green(chalk.bold("Logged Hours:")));
      let total_duration = totalDuration(data);

      console.log(chalk.green(chalk.bold("Totals:")));

      // the total time that it took, prettyprinted
      console.log(`About ${Math.floor(total_duration / 3600)} hours,
${Math.floor(total_duration / 60)} minutes, and ${total_duration % 60}
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

// given a timecard, calculate the total amount of time spent on the project.
function totalDuration(data) {
  return data.card.reduce((acc, day) => {
    return acc + day.times.reduce((acc, time) => {
      console.log(`${chalk.magenta(day.date)}\t\t ${time.start} - ${time.end}`)
      return acc + card.getDurationFor(day, time);
    }, 0);
  }, 0) / 1000;
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
  clock report
  clock watch
 
Options
    -h, --help              Show this help message
    -v, --version           Show the current timecard version
`.replace(/`(.*?)`/g, (match) => {
  return chalk.cyan(match); // highlight all of the commands
}));
}
