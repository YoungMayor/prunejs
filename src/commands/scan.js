
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { loadConfig, validateConfig } = require('../utils/config');
const UnusedCodeFinder = require('../utils/analyzer');

async function scanCommand() {
    let spinner;
    try {
        const config = loadConfig();
        await validateConfig(config);

        spinner = ora('Scanning codebase...').start();
        const projectRoot = process.cwd();
        const finder = new UnusedCodeFinder(projectRoot, config);

        const report = await finder.analyze();
        spinner.succeed('Scan complete!');

        // Console Output
        console.log('\n' + chalk.bold.underline('Scan Summary'));
        console.log(`Total Exports: ${report.totalExports} `);
        console.log(`Unused Exports: ${chalk.red(report.unusedExports.length)} `);
        console.log(`Total Non - Exported: ${report.totalNonExported} `);
        console.log(`Unused Non - Exported: ${chalk.red(report.unusedNonExported.length)} `);

        // Generate Markdown Report
        const reportDir = path.join(projectRoot, '.prunejs');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(reportDir, `report_${timestamp}.md`);

        const markdown = generateMarkdown(report);
        fs.writeFileSync(reportPath, markdown);

        console.log(`\n📄 Detailed report saved to: ${chalk.cyan(reportPath)} `);

        if (report.unusedExports.length > 0 || report.unusedNonExported.length > 0) {
            console.log(`\nRun ${chalk.yellow('prunejs fix')} to remove unused code.`);
        }

    } catch (error) {
        if (spinner) spinner.fail('Scan failed');
        console.error(error);
    }
}

function generateMarkdown(report) {
    let md = '# Unused Code Report\n\n';
    md += `Generated: ${new Date().toLocaleString()} \n\n`;

    md += '## Summary\n\n';
    md += `- ** Total Exports **: ${report.totalExports} \n`;
    md += `- ** Unused Exports **: ${report.unusedExports.length} \n`;
    md += `- ** Total Non - Exported **: ${report.totalNonExported} \n`;
    md += `- ** Unused Non - Exported **: ${report.unusedNonExported.length} \n\n`;

    if (report.unusedExports.length > 0) {
        md += '## Unused Exports\n\n';
        md += '| File | Line | Type | Name |\n';
        md += '|------|------|------|------|\n';
        report.unusedExports.forEach(item => {
            md += `| ${item.file} | ${item.line} | ${item.type} | \`${item.name}\` |\n`;
        });
        md += '\n';
    }

    if (report.unusedNonExported.length > 0) {
        md += '## Unused Non-Exported Declarations\n\n';
        md += '| File | Line | Type | Name |\n';
        md += '|------|------|------|------|\n';
        report.unusedNonExported.forEach(item => {
            md += `| ${item.file} | ${item.line} | ${item.type} | \`${item.name}\` |\n`;
        });
        md += '\n';
    }

    return md;
}

module.exports = scanCommand;
