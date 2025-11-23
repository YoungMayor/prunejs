# PruneJS

**PruneJS** is a powerful, configurable CLI tool designed to keep your JavaScript and TypeScript projects clean and maintainable. It scans your codebase to detect unused files, functions, classes, and exports, and can automatically remove them for you.

## Features

- **Smart Scanning**: Detects unused exports and non-exported declarations (dead code).
- **Safe Fixes**: Automatically removes unused code while preserving structure using brace counting and syntax awareness.
- **Configurable**: Support for `includeDirs` (whitelist) and `excludeDirs` (blacklist) for precise control.
- **Safety Checks**: Warns you if you attempt to scan typically excluded directories (like `node_modules`).
- **Detailed Reports**: Generates comprehensive Markdown reports of your codebase's health.

## Installation

You can install PruneJS globally or as a development dependency in your project.

### Global Installation

```bash
npm install -g prunejs
```

Then run it using

```bash
prunejs <command>
```

### Local Installation (Recommended)

Install as a dev dependency to ensure everyone on your team uses the same version.

```bash
npm install -D prunejs
```

Then run it using `npx`:

```bash
npx prunejs <command>
```

## Usage

### 1. Initialize

Set up PruneJS in your project. This creates a `.prunejs.config.js` file and updates your `.gitignore`.

```bash
prunejs init # or npx prunejs init
```

### 2. Scan

Scan your codebase for unused code. This command analyzes your project based on your configuration and outputs a summary.

```bash
prunejs scan # or npx prunejs scan
```

- **Output**: A summary in the console and a detailed report in `.prunejs/report_<timestamp>.md`.

### 3. Fix

Automatically remove unused code found by the scanner.

```bash
prunejs fix # or npx prunejs fix
```

- **Safety**: PruneJS processes files carefully to ensure that removing one item doesn't break line numbers for subsequent items.
- **Report**: Generates a log of all actions taken in `.prunejs/fix_<timestamp>.md`.

> [!IMPORTANT]
> **Always commit your changes before running `fix`.** While PruneJS is designed to be safe, automated code removal should always be reviewed.

## Configuration

PruneJS uses a `.prunejs.config.js` file in your project root. If not present, it uses sensible defaults.

### Default Configuration

```javascript
module.exports = {
  // Directories to exclude from scanning
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
  // Directories to include (defaults to current directory '.')
  includeDirs: ['src'],
  // File extensions to analyze
  includeExtensions: ['.ts', '.tsx', '.js', '.jsx']
};
```

### Customizing Configuration

You can customize the behavior by editing `.prunejs.config.js`.

#### `includeDirs` vs `excludeDirs`

PruneJS supports both whitelisting (`includeDirs`) and blacklisting (`excludeDirs`) for maximum flexibility and safety.

- **`includeDirs`**: Only files within these directories will be scanned. Defaults to `['.']` (project root).
- **`excludeDirs`**: Files within these directories will be ignored, *even if they are inside an included directory*.

**Example: Scan only `src` but ignore `src/temp`**

```javascript
module.exports = {
  includeDirs: ['src'],
  excludeDirs: ['src/temp', 'node_modules', ...], // It's good practice to keep standard excludes
  // ...
};
```

**Logic**:
1. PruneJS iterates through `includeDirs`.
2. For each directory, it recursively finds files.
3. It skips any file or subdirectory that matches `excludeDirs`.

### Safety Checks

To prevent accidents, PruneJS performs a safety check before running. If your `includeDirs` contains a directory that is typically excluded (like `node_modules`), PruneJS will warn you and ask for confirmation before proceeding.

```text
⚠️  Warning: You have included directories that are typically excluded: node_modules
? Are you sure you want to proceed with scanning these directories? (y/N)
```

## How it Works

1.  **Analysis**: PruneJS parses your code to find all exports and local declarations.
2.  **Usage Tracking**: It tracks where every export is imported and where every local declaration is used.
3.  **Cross-File Detection**: It correctly identifies if an export is used in *any* other file in your project.
4.  **Block Detection**: When removing code, it uses brace counting to identify the full scope of functions and classes, ensuring clean removal.

## License

ISC
