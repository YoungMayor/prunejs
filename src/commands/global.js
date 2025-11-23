const inquirer = require('inquirer');
const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');

async function globalCommand(subcommand) {
    let action = subcommand;

    if (!action) {
        const answer = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do with the global prunejs package?',
                choices: [
                    { name: 'Install (npm install -g prunejs)', value: 'install' },
                    { name: 'Update (npm update -g prunejs)', value: 'update' },
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
            spinner.start('Installing prunejs globally...');
            execSync('npm install -g prunejs', { stdio: 'inherit' });
            spinner.succeed(chalk.green('Successfully installed prunejs globally!'));
        } else if (action === 'update') {
            spinner.start('Updating global prunejs...');
            execSync('npm update -g prunejs', { stdio: 'inherit' });
            spinner.succeed(chalk.green('Successfully updated global prunejs!'));
        } else {
            console.log(chalk.red(`Unknown subcommand: ${action}`));
            console.log('Available subcommands: install, update');
        }
    } catch (error) {
        spinner.fail(chalk.red(`Failed to ${action} prunejs globally.`));
        console.error(error.message);
    }
}

module.exports = globalCommand;
