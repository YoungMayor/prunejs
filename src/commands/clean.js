const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const ora = require('ora');

async function cleanCommand(subcommand) {
  const pruneDir = path.resolve(process.cwd(), '.prunejs');

  if (!fs.existsSync(pruneDir)) {
    console.log(chalk.yellow('.prunejs directory does not exist. Nothing to clean.'));
    return;
  }

  let action = subcommand;

  if (!action) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to clean?',
        choices: [
          { name: 'Fix Reports (delete fix_*.md)', value: 'fix' },
          { name: 'Scan Reports (delete report_*.md)', value: 'report' },
          { name: 'All (delete .prunejs directory)', value: 'all' },
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
    if (action === 'all') {
      spinner.start('Deleting .prunejs directory...');
      fs.rmSync(pruneDir, { recursive: true, force: true });
      spinner.succeed(chalk.green('Successfully deleted .prunejs directory.'));
    } else if (action === 'fix' || action === 'report') {
      spinner.start(`Deleting ${action} reports...`);
      const files = fs.readdirSync(pruneDir);
      let deletedCount = 0;

      files.forEach((file) => {
        if (file.startsWith(`${action}_`) && file.endsWith('.md')) {
          fs.unlinkSync(path.join(pruneDir, file));
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        spinner.succeed(chalk.green(`Successfully deleted ${deletedCount} ${action} reports.`));
      } else {
        spinner.info(chalk.yellow(`No ${action} reports found.`));
      }
    } else {
      console.log(chalk.red(`Unknown subcommand: ${action}`));
      console.log('Available subcommands: fix, report, all');
    }
  } catch (error) {
    spinner.fail(chalk.red(`Failed to clean ${action}.`));
    console.error(error.message);
  }
}

module.exports = cleanCommand;
