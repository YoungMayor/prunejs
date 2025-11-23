const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { getDefaultConfig, CONFIG_FILE } = require('../utils/config');

async function initCommand(options) {
  console.log(chalk.blue('Initializing prunejs...'));

  const configPath = path.resolve(process.cwd(), CONFIG_FILE);
  const force = options && options.force;

  if (fs.existsSync(configPath) && !force) {
    console.log(chalk.yellow(`${CONFIG_FILE} already exists.`));
    console.log(chalk.red('Use --force to overwrite.'));
    return;
  }

  if (fs.existsSync(configPath) && force) {
    console.log(chalk.yellow(`Overwriting ${CONFIG_FILE}...`));
  }

  const defaultConfig = getDefaultConfig();
  const configContent = `module.exports = ${JSON.stringify(defaultConfig, null, 2)};\n`;

  fs.writeFileSync(configPath, configContent);
  console.log(chalk.green(`Created ${CONFIG_FILE}`));

  // Update .gitignore
  const gitignorePath = path.resolve(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    let gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignoreContent.includes('.prunejs/**')) {
      gitignoreContent += '\n# prunejs\n.prunejs/**\n';
      fs.writeFileSync(gitignorePath, gitignoreContent);
      console.log(chalk.green('Added .prunejs/** to .gitignore'));
    } else {
      console.log(chalk.yellow('.prunejs/** already in .gitignore'));
    }
  } else {
    console.log(chalk.yellow('No .gitignore found, skipping update.'));
  }

  console.log(chalk.blue('Initialization complete!'));
}

module.exports = initCommand;
