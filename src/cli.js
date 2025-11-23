const { Command } = require('commander');
const packageJson = require('../package.json');
const initCommand = require('./commands/init');
const scanCommand = require('./commands/scan');
const fixCommand = require('./commands/fix');

const inquirer = require('inquirer');
const globalCommand = require('./commands/global');
const localCommand = require('./commands/local');
const cleanCommand = require('./commands/clean');

const program = new Command();

program
  .name('prunejs')
  .description('Scan JS/TS projects and detects unused files, functions, classes and exports')
  .version(packageJson.version);

program
  .command('init')
  .description('Initialize prunejs configuration')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(initCommand);

program.command('scan').description('Scan the codebase for unused code').action(scanCommand);

program.command('fix').description('Remove unused code found by scan').action(fixCommand);

program
  .command('global [subcommand]')
  .description('Install or update prunejs globally (install | update)')
  .action(globalCommand);

program
  .command('local [subcommand]')
  .description('Install or update prunejs locally (install | update)')
  .action(localCommand);

program
  .command('clean [subcommand]')
  .description('Clean reports (fix | report | all)')
  .action(cleanCommand);

// Interactive mode if no args
if (process.argv.length <= 2) {
  (async () => {
    const { command } = await inquirer.prompt([
      {
        type: 'list',
        name: 'command',
        message: 'What would you like to do?',
        choices: [
          { name: 'Scan for unused code', value: 'scan' },
          { name: 'Fix unused code', value: 'fix' },
          { name: 'Initialize configuration', value: 'init' },
          { name: 'Manage global package', value: 'global' },
          { name: 'Manage local dependency', value: 'local' },
          { name: 'Clean reports', value: 'clean' },
          { name: 'Exit', value: 'exit' },
        ],
      },
    ]);

    if (command === 'exit') {
      process.exit(0);
    }

    if (command === 'scan') await scanCommand();
    else if (command === 'fix') await fixCommand();
    else if (command === 'init') await initCommand({});
    else if (command === 'global') await globalCommand();
    else if (command === 'local') await localCommand();
    else if (command === 'clean') await cleanCommand();
  })();
} else {
  program.parse(process.argv);
}
