const fs = require('fs');
const UnusedCodeFinder = require('../src/utils/analyzer');

// Mock fs to avoid writing to disk
jest.mock('fs');

describe('UnusedCodeFinder', () => {
  const mockProjectRoot = '/mock/project';
  const mockConfig = {
    excludeDirs: ['node_modules'],
    includeDirs: ['.'],
    includeExtensions: ['.js'],
    excludeIgnoredFiles: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should detect unused exports', async () => {
    // Setup mock file system
    const files = {
      '/mock/project/file1.js': `
        export const used = 1;
        export const unused = 2;
      `,
      '/mock/project/file2.js': `
        import { used } from './file1';
      `,
    };

    fs.readdirSync.mockReturnValue([
      { name: 'file1.js', isFile: () => true, isDirectory: () => false },
      { name: 'file2.js', isFile: () => true, isDirectory: () => false },
    ]);

    fs.statSync.mockImplementation((p) => {
      if (p === '/mock/project') return { isDirectory: () => true, isFile: () => false };
      return { isDirectory: () => false, isFile: () => true };
    });

    fs.existsSync.mockReturnValue(true);

    fs.readFileSync.mockImplementation((filePath) => {
      return files[filePath] || '';
    });

    const finder = new UnusedCodeFinder(mockProjectRoot, mockConfig);
    // Mock getAllFiles to return our specific files
    finder.getAllFiles = jest.fn().mockReturnValue(Object.keys(files));

    const report = await finder.analyze();

    expect(report.unusedExports).toHaveLength(1);
    expect(report.unusedExports[0].name).toBe('unused');
  });

  test('should detect unused local declarations', async () => {
    const files = {
      '/mock/project/file1.js': `
        function unusedLocal() {}
        function usedLocal() {}
        usedLocal();
      `,
    };

    fs.readFileSync.mockImplementation((filePath) => {
      return files[filePath] || '';
    });

    const finder = new UnusedCodeFinder(mockProjectRoot, mockConfig);
    finder.getAllFiles = jest.fn().mockReturnValue(Object.keys(files));

    const report = await finder.analyze();

    expect(report.unusedNonExported[0].name).toBe('unusedLocal');
  });

  test('should skip exports in configured files', async () => {
    const files = {
      '/mock/project/pages/index.js': `
        export default function Home() {}
        export const getServerSideProps = async () => {};
      `,
      '/mock/project/components/Button.js': `
        export const Button = () => {};
      `,
    };

    fs.readFileSync.mockImplementation((filePath) => {
      return files[filePath] || '';
    });

    const configWithSkip = {
      ...mockConfig,
      skipExportsIn: ['pages/**/*'],
    };

    const finder = new UnusedCodeFinder(mockProjectRoot, configWithSkip);
    finder.getAllFiles = jest.fn().mockReturnValue(Object.keys(files));

    const report = await finder.analyze();

    // Home and getServerSideProps should be skipped (marked as used)
    // Button should be unused
    expect(report.unusedExports).toHaveLength(1);
    expect(report.unusedExports[0].name).toBe('Button');
  });
});
