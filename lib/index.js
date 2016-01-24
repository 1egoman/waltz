const args = require("minimist")(process.argv.slice(2)),
      pkg = require("../package.json"),
      card = require("./card.js"),
      chalk = require("chalk");
const action = args._[0] // what are we trying to do?

switch(action) {

  case "in":
    card.getCard().then((data) => {
      console.log(data)
    }).catch(onError);
    break;

  case "out":
    console.log("abc")
    break;

  case "watch":
    console.log("abc")
    break;

  case "init":
    console.log("abc")
    break;

  case "report":
    console.log("abc")
    break;

  case "print":
    console.log("abc")
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
  clock ls
  clock report
  clock watch
 
Options
    -h, --help              Show this help message
    -v, --version           Show the current timecard version
`.replace(/`(.*?)`/g, (match) => {
  return chalk.cyan(match); // highlight all of the commands
}));
}
