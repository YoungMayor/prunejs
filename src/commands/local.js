const inquirer = require('inquirer');
const { execSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

async function localCommand(subcommand) {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log(chalk.red('Error: package.json not found in the current directory.'));
    return;
  }

  let action = subcommand;

  if (!action) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do with the local prunejs dependency?',
        choices: [
          { name: 'Install (npm install -D prunejs)', value: 'install' },
          { name: 'Update (npm update prunejs)', value: 'update' },
          { name: 'Cancel', value: 'cancel' },
        ],
      },
    ]);
    action = answer.action;
  }

  if (action === 'cancel') {
    console.log(chalk.red('Operation cancelled.'));
    return;
  }

  const spinner = ora();

  try {
    if (action === 'install') {
      spinner.start('Installing prunejs as a dev dependency...');
      execSync('npm install -D prunejs', { stdio: 'inherit' });
      spinner.succeed(chalk.green('Successfully installed prunejs locally!'));
    } else if (action === 'update') {
      spinner.start('Updating local prunejs...');
      execSync('npm update prunejs', { stdio: 'inherit' });
      spinner.succeed(chalk.green('Successfully updated local prunejs!'));
    } else {
      console.log(chalk.red(`Unknown subcommand: ${action}`));
      console.log('Available subcommands: install, update');
    }
  } catch (error) {
    spinner.fail(chalk.red(`Failed to ${action} prunejs locally.`));
    console.error(error.message);
  }
}

module.exports = localCommand;
