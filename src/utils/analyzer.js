const fs = require('fs');
const path = require('path');
const ignore = require('ignore');

class UnusedCodeFinder {
  constructor(projectRoot, config) {
    this.projectRoot = projectRoot;
    this.exports = new Map();
    this.nonExportedDeclarations = new Map();
    this.imports = new Map(); // name -> Set<filePath>
    this.excludeDirs = config.excludeDirs || [];
    this.includeDirs = config.includeDirs || ['.'];
    this.includeExtensions = config.includeExtensions || [];
    this.ig = ignore();

    if (config.excludeIgnoredFiles) {
      this.loadGitignore();
    }
  }

  loadGitignore() {
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      try {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
        this.ig.add(gitignoreContent);
      } catch (error) {
        console.warn('Failed to load .gitignore:', error.message);
      }
    }
  }

  async analyze() {
    let files = [];
    for (const dir of this.includeDirs) {
      const fullPath = path.resolve(this.projectRoot, dir);
      if (fs.existsSync(fullPath)) {
        if (fs.statSync(fullPath).isDirectory()) {
          files = files.concat(this.getAllFiles(fullPath));
        } else if (fs.statSync(fullPath).isFile()) {
          // If user explicitly includes a file, check extension
          const ext = path.extname(fullPath);
          if (this.includeExtensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }

    // Remove duplicates if any
    files = [...new Set(files)];

    for (const file of files) {
      this.extractExports(file);
      this.extractNonExportedDeclarations(file);
    }

    for (const file of files) {
      this.extractImports(file);
    }

    this.markUsedExports();
    this.markUsedNonExportedDeclarations();

    return this.generateReportData();
  }

  getAllFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.projectRoot, fullPath);

      // Check if ignored by .gitignore
      if (this.ig.ignores(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        if (!this.excludeDirs.includes(entry.name)) {
          this.getAllFiles(fullPath, files);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (this.includeExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  extractExports(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(this.projectRoot, filePath);

    const patterns = [
      { regex: /export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, type: 'function' },
      { regex: /export\s+class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, type: 'class' },
      { regex: /export\s+interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, type: 'interface' },
      { regex: /export\s+type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, type: 'type' },
      { regex: /export\s+const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, type: 'const' },
      { regex: /export\s+(?:let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, type: 'variable' },
    ];

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];

      if (this.isComment(line)) continue;

      for (const { regex, type } of patterns) {
        const matches = [...line.matchAll(regex)];
        for (const match of matches) {
          const name = match[1];
          this.addExport(name, type, relativePath, lineNum + 1, filePath);
        }
      }

      const namedExportMatch = line.match(/export\s*{([^}]+)}/);
      if (namedExportMatch) {
        const names = namedExportMatch[1]
          .split(',')
          .map((n) =>
            n
              .trim()
              .split(/\s+as\s+/)[0]
              .trim()
          )
          .filter((n) => n && !n.includes('*'));

        for (const name of names) {
          this.addExport(name, 'const', relativePath, lineNum + 1, filePath);
        }
      }

      if (line.includes('export default')) {
        const defaultFunctionMatch = line.match(
          /export\s+default\s+(?:function\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)/
        );
        if (defaultFunctionMatch) {
          const name = defaultFunctionMatch[1];
          this.addExport(name, 'default', relativePath, lineNum + 1, filePath);
        }
      }
    }
  }

  extractNonExportedDeclarations(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(this.projectRoot, filePath);

    const patterns = [
      {
        regex: /^(?!.*export)\s*(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
        type: 'function',
      },
      { regex: /^(?!.*export)\s*class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, type: 'class' },
      {
        regex:
          /^(?!.*export)\s*(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)/g,
        type: 'function',
      },
    ];

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];

      if (this.isComment(line)) continue;
      if (line.includes('export')) continue;

      for (const { regex, type } of patterns) {
        regex.lastIndex = 0;
        const matches = [...line.matchAll(regex)];
        for (const match of matches) {
          const name = match[1];
          if (this.shouldSkipName(name)) continue;
          this.addNonExportedDeclaration(name, type, relativePath, lineNum + 1, filePath);
        }
      }
    }
  }

  shouldSkipName(name) {
    const skipPatterns = [
      /^_/,
      /^use[A-Z]/,
      /^handle[A-Z]/,
      /^on[A-Z]/,
      /^render[A-Z]/,
      /^get[A-Z]/,
      /^set[A-Z]/,
      /^is[A-Z]/,
      /^has[A-Z]/,
      /Config$/,
      /Options$/,
    ];
    return skipPatterns.some((pattern) => pattern.test(name));
  }

  extractImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const addImport = (name) => {
      if (!this.imports.has(name)) {
        this.imports.set(name, new Set());
      }
      this.imports.get(name).add(filePath);
    };

    for (const line of lines) {
      if (this.isComment(line)) continue;

      const namedImportMatch = line.match(/import\s*{([^}]+)}\s*from/);
      if (namedImportMatch) {
        const names = namedImportMatch[1]
          .split(',')
          .map((n) =>
            n
              .trim()
              .split(/\s+as\s+/)
              .pop()
              ?.trim()
          )
          .filter((n) => n);
        names.forEach((name) => name && addImport(name));
      }

      const defaultImportMatch = line.match(/import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from/);
      if (defaultImportMatch) {
        addImport(defaultImportMatch[1]);
      }

      const namespaceImportMatch = line.match(
        /import\s+\*\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from/
      );
      if (namespaceImportMatch) {
        addImport(namespaceImportMatch[1]);
      }
    }

    const identifierPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    const matches = content.matchAll(identifierPattern);
    for (const match of matches) {
      addImport(match[1]);
    }
  }

  addExport(name, type, file, line, filePath) {
    if (!this.exports.has(name)) {
      this.exports.set(name, []);
    }
    this.exports.get(name).push({
      name,
      type,
      file,
      line,
      filePath,
      isUsed: false,
      category: 'exported',
    });
  }

  addNonExportedDeclaration(name, type, file, line, filePath) {
    const key = `${file}:${name}`;
    this.nonExportedDeclarations.set(key, {
      name,
      type,
      file,
      line,
      filePath,
      isUsed: false,
      category: 'non-exported',
    });
  }

  markUsedExports() {
    for (const [name, exportInfos] of this.exports.entries()) {
      const usageFiles = this.imports.get(name);

      if (!usageFiles) continue;

      // Check each export occurrence
      exportInfos.forEach((info) => {
        // If used in another file, it's used
        let usedInOtherFile = false;
        for (const file of usageFiles) {
          if (file !== info.filePath) {
            usedInOtherFile = true;
            break;
          }
        }

        if (usedInOtherFile) {
          info.isUsed = true;
        } else {
          // Only used in the same file? Check if it's used besides the definition
          const content = fs.readFileSync(info.filePath, 'utf-8');
          const lines = content.split('\n');
          // Remove the definition line
          const otherLines = lines.filter((_, idx) => idx + 1 !== info.line);
          const otherContent = otherLines.join('\n');

          const usagePattern = new RegExp(`\\b${this.escapeRegex(name)}\\b`);
          if (usagePattern.test(otherContent)) {
            info.isUsed = true;
          }
        }
      });
    }
  }
  markUsedNonExportedDeclarations() {
    for (const [key, declaration] of this.nonExportedDeclarations.entries()) {
      const content = fs.readFileSync(declaration.filePath, 'utf-8');
      const lines = content.split('\n');
      const otherLines = lines.filter((_, idx) => idx + 1 !== declaration.line);
      const otherContent = otherLines.join('\n');
      const usagePattern = new RegExp(`\\b${this.escapeRegex(declaration.name)}\\b`);

      if (usagePattern.test(otherContent)) {
        declaration.isUsed = true;
      }
    }
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  isComment(line) {
    return (
      line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')
    );
  }

  generateReportData() {
    const unusedExports = [];
    const unusedNonExported = [];

    for (const exportInfos of this.exports.values()) {
      for (const info of exportInfos) {
        if (!info.isUsed) unusedExports.push(info);
      }
    }

    for (const declaration of this.nonExportedDeclarations.values()) {
      if (!declaration.isUsed) unusedNonExported.push(declaration);
    }

    return {
      totalExports: this.getTotalExports(),
      unusedExports,
      totalNonExported: this.nonExportedDeclarations.size,
      unusedNonExported,
    };
  }

  getTotalExports() {
    let total = 0;
    for (const exportInfos of this.exports.values()) {
      total += exportInfos.length;
    }
    return total;
  }

  /**
   * Finds the end line of a code block starting at startLine.
   * Uses brace counting to handle nested blocks.
   * @param {string} filePath - Path to the file
   * @param {number} startLine - 1-indexed start line
   * @returns {number} - 1-indexed end line
   */
  findBlockEnd(filePath, startLine) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let braceCount = 0;
    let foundStart = false;

    for (let i = startLine - 1; i < lines.length; i++) {
      const line = lines[i];

      // Count braces
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          foundStart = true;
        } else if (char === '}') {
          braceCount--;
        }
      }

      // If we found the start and brace count returns to 0, we found the end
      if (foundStart && braceCount === 0) {
        return i + 1;
      }

      // If we haven't found a start brace, but the line ends with a semicolon,
      // it's likely a single line statement.
      if (!foundStart && line.trim().endsWith(';')) {
        return i + 1;
      }

      // Safety break for extremely long files or unbalanced braces
      if (foundStart && braceCount < 0) return i + 1;
    }

    return startLine; // Fallback if no block found
  }
}

module.exports = UnusedCodeFinder;
