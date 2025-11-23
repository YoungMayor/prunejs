const { Command } = require('commander');
const packageJson = require('../package.json');
const initCommand = require('./commands/init');
const scanCommand = require('./commands/scan');
const fixCommand = require('./commands/fix');

const program = new Command();

program
  .name('prunejs')
  .description('Scan JS/TS projects and detects unused files, functions, classes and exports')
  .version(packageJson.version);

program.command('init').description('Initialize prunejs configuration').action(initCommand);

program.command('scan').description('Scan the codebase for unused code').action(scanCommand);

program.command('fix').description('Remove unused code found by scan').action(fixCommand);

program.parse(process.argv);
