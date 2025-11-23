const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '.prunejs.config.js';

function loadConfig() {
    const configPath = path.resolve(process.cwd(), CONFIG_FILE);

    if (fs.existsSync(configPath)) {
        try {
            return require(configPath);
        } catch (error) {
            console.error('Error loading configuration file:', error);
            return getDefaultConfig();
        }
    }

    return getDefaultConfig();
}

function getDefaultConfig() {
    return {
        excludeDirs: [
            'node_modules',
            '.next',
            '.git',
            'dist',
            'build',
            'out',
            'coverage',
            '.vercel',
            '.prunejs'
        ],
        includeExtensions: ['.ts', '.tsx', '.js', '.jsx']
    };
}

module.exports = {
    loadConfig,
    getDefaultConfig,
    CONFIG_FILE
};
