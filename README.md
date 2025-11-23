# PruneJS

PruneJS is a powerful tool to scan your JavaScript/TypeScript codebase and detect unused files, functions, classes, and exports. It helps you keep your project clean and maintainable.

## Features

- **Scan**: Detect unused exports and non-exported declarations.
- **Fix**: Automatically remove unused code (experimental).
- **Configurable**: Exclude directories and specify file extensions.
- **Reports**: Generates detailed Markdown reports.

## Installation

```bash
npm install -g prunejs
```

Or run it directly with `npx`:

```bash
npx prunejs <command>
```

## Usage

### Initialize

Set up PruneJS in your project. This creates a `.prunejs.config.js` file and updates your `.gitignore`.

```bash
prunejs init
```

### Scan

Scan your codebase for unused code.

```bash
prunejs scan
```

This will output a summary to the console and generate a detailed report in `.prunejs/report_<timestamp>.md`.

### Fix

Automatically remove unused code found by the scanner.

```bash
prunejs fix
```

**Note**: The `fix` command is powerful. It attempts to identify the full block of code (function, class, etc.) and remove it. **Always commit your changes before running `fix` so you can revert if needed.**

## Configuration

The `prunejs init` command creates a `.prunejs.config.js` file:

```javascript
module.exports = {
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
```

You can customize `excludeDirs` and `includeExtensions` to fit your project needs.

## How it works

PruneJS analyzes your code to find:
1.  **Exports**: Functions, classes, variables, etc., that are exported but never imported in other files.
2.  **Non-exported Declarations**: Functions and classes defined locally but never used within the same file.

It uses regex-based pattern matching and brace counting to identify code blocks. While effective for most standard code styles, it may have limitations with complex or unusual syntax.

## License

ISC
