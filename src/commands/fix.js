const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { loadConfig } = require('../utils/config');
const UnusedCodeFinder = require('../utils/analyzer');

async function fixCommand() {
    const spinner = ora('Scanning for unused code to fix...').start();

    try {
        const config = loadConfig();
        const projectRoot = process.cwd();
        const finder = new UnusedCodeFinder(projectRoot, config);

        const report = await finder.analyze();

        const allUnused = [...report.unusedExports, ...report.unusedNonExported];

        if (allUnused.length === 0) {
            spinner.succeed('No unused code found to fix.');
            return;
        }

        spinner.text = `Found ${allUnused.length} unused items. Fixing...`;

        // Group by file
        const itemsByFile = {};
        for (const item of allUnused) {
            if (!itemsByFile[item.filePath]) {
                itemsByFile[item.filePath] = [];
            }
            itemsByFile[item.filePath].push(item);
        }

        let fixedCount = 0;
        const fixLog = [];

        for (const filePath of Object.keys(itemsByFile)) {
            const items = itemsByFile[filePath];

            // Sort by line number descending to avoid shifting issues
            items.sort((a, b) => b.line - a.line);

            let content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');

            // We need to track removed lines to adjust indices if we were going top-down,
            // but going bottom-up simplifies this.
            // However, we need to be careful not to mess up if ranges overlap (which shouldn't happen for distinct items).

            for (const item of items) {
                const startLine = item.line;
                const endLine = finder.findBlockEnd(filePath, startLine);

                // Remove lines (0-indexed)
                // lines array is 0-indexed, so line 1 is index 0.
                const startIndex = startLine - 1;
                const endIndex = endLine - 1;

                // Check if it's a valid range
                if (startIndex >= 0 && endIndex < lines.length && startIndex <= endIndex) {
                    // Remove the lines
                    lines.splice(startIndex, endIndex - startIndex + 1);
                    fixedCount++;
                    fixLog.push({
                        file: item.file,
                        line: item.line,
                        name: item.name,
                        type: item.type,
                        action: 'Removed'
                    });
                }
            }

            fs.writeFileSync(filePath, lines.join('\n'));
        }

        spinner.succeed(`Fixed ${fixedCount} unused items!`);

        // Generate Fix Report
        const reportDir = path.join(projectRoot, '.prunejs');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(reportDir, `fix_${timestamp}.md`);

        let md = '# PruneJS Fix Report\n\n';
        md += `Generated: ${new Date().toLocaleString()}\n\n`;
        md += `Total items removed: ${fixedCount}\n\n`;
        md += '| File | Original Line | Type | Name |\n';
        md += '|------|---------------|------|------|\n';
        fixLog.forEach(item => {
            md += `| ${item.file} | ${item.line} | ${item.type} | \`${item.name}\` |\n`;
        });

        fs.writeFileSync(reportPath, md);
        console.log(`\n📄 Fix report saved to: ${chalk.cyan(reportPath)}`);

    } catch (error) {
        spinner.fail('Fix failed');
        console.error(error);
    }
}

module.exports = fixCommand;
