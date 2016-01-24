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
      data.card.map((day) => {
        day.times.map((time) => {
          console.log(`${chalk.green(day.date)}\t\t ${time.start} - ${time.end}`)
        })
      })
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
