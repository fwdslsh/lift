import { DirectoryScanner } from '../src/DirectoryScanner.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';

describe('DirectoryScanner', () => {
  const testDir = './tests/scanner_test';
  
  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'node_modules'), { recursive: true });
    await mkdir(join(testDir, '.git'), { recursive: true });
    await mkdir(join(testDir, 'subdir'), { recursive: true });
    
    // Create various file types
    await writeFile(join(testDir, 'readme.md'), '# Readme');
    await writeFile(join(testDir, 'guide.mdx'), '# Guide');
    await writeFile(join(testDir, 'config.txt'), 'config content');
    await writeFile(join(testDir, 'node_modules', 'package.md'), '# Should be excluded');
    await writeFile(join(testDir, '.git', 'config'), 'git config');
    await writeFile(join(testDir, 'subdir', 'nested.md'), '# Nested');
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('constructs with default options', () => {
    const scanner = new DirectoryScanner();
    expect(scanner.excludePatterns).toBeDefined();
    expect(scanner.excludePatterns.length).toBeGreaterThan(0);
    expect(scanner.excludePatterns).toContain('node_modules');
  });

  test('constructs with custom options', () => {
    const customPatterns = ['custom1', 'custom2'];
    const customIsMarkdown = (path) => path.endsWith('.text');
    
    const scanner = new DirectoryScanner({
      excludePatterns: customPatterns,
      isMarkdownFileFn: customIsMarkdown
    });
    
    expect(scanner.excludePatterns).toEqual(customPatterns);
    expect(scanner.isMarkdownFileFn).toBe(customIsMarkdown);
  });

  test('defaultIsMarkdownFile identifies markdown files correctly', () => {
    const scanner = new DirectoryScanner();
    
    expect(scanner.defaultIsMarkdownFile('test.md')).toBe(true);
    expect(scanner.defaultIsMarkdownFile('test.mdx')).toBe(true);
    expect(scanner.defaultIsMarkdownFile('test.MD')).toBe(true);
    expect(scanner.defaultIsMarkdownFile('test.MDX')).toBe(true);
    expect(scanner.defaultIsMarkdownFile('test.txt')).toBe(false);
    expect(scanner.defaultIsMarkdownFile('test.html')).toBe(true); // HTML now supported
    expect(scanner.defaultIsMarkdownFile('test.HTML')).toBe(true); // Case insensitive
    expect(scanner.defaultIsMarkdownFile('test')).toBe(false);
  });

  test('shouldExclude works with various patterns', () => {
    const scanner = new DirectoryScanner();
    
    expect(scanner.shouldExclude('node_modules', 'path/to/node_modules')).toBe(true);
    expect(scanner.shouldExclude('.git', 'path/to/.git/config')).toBe(true);
    expect(scanner.shouldExclude('dist', 'project/dist/bundle.js')).toBe(true);
    expect(scanner.shouldExclude('normal', 'path/to/normal/file.md')).toBe(false);
  });

  test('validateDirectory throws for non-existent directory', async () => {
    const scanner = new DirectoryScanner();
    await expect(scanner.validateDirectory('/non/existent/path')).rejects.toThrow();
  });

  test('validateDirectory passes for existing directory', async () => {
    const scanner = new DirectoryScanner();
    const result = await scanner.validateDirectory(testDir);
    expect(result).toBe(true);
  });

  test('scanDirectory finds markdown files and excludes patterns', async () => {
    const scanner = new DirectoryScanner();
    const files = await scanner.scanDirectory(testDir);
    
    // Should find markdown files
    expect(files.some(f => f.endsWith('readme.md'))).toBe(true);
    expect(files.some(f => f.endsWith('guide.mdx'))).toBe(true);
    expect(files.some(f => f.endsWith('nested.md'))).toBe(true);
    
    // Should exclude non-markdown files
    expect(files.some(f => f.endsWith('config.txt'))).toBe(false);
    
    // Should exclude files in excluded directories
    expect(files.some(f => f.includes('node_modules'))).toBe(false);
    expect(files.some(f => f.includes('.git'))).toBe(false);
  });

  test('scanDirectory with custom isMarkdownFile function', async () => {
    const scanner = new DirectoryScanner({
      isMarkdownFileFn: (path) => path.endsWith('.txt') // Custom: treat .txt as markdown
    });
    
    const files = await scanner.scanDirectory(testDir);
    
    // Should find .txt files with custom function
    expect(files.some(f => f.endsWith('config.txt'))).toBe(true);
    
    // Should not find .md files with custom function
    expect(files.some(f => f.endsWith('readme.md'))).toBe(false);
  });

  test('scanDirectory handles empty directories', async () => {
    const emptyDir = join(testDir, 'empty');
    await mkdir(emptyDir, { recursive: true });
    
    const scanner = new DirectoryScanner();
    const files = await scanner.scanDirectory(emptyDir);
    
    expect(files).toEqual([]);
  });

  test('scanDirectory handles directories with only excluded content', async () => {
    const excludedDir = join(testDir, 'only-excluded');
    await mkdir(excludedDir, { recursive: true });
    await mkdir(join(excludedDir, 'node_modules'), { recursive: true });
    await writeFile(join(excludedDir, 'node_modules', 'test.md'), '# Test');
    
    const scanner = new DirectoryScanner();
    const files = await scanner.scanDirectory(excludedDir);
    
    expect(files).toEqual([]);
  });

  test('matchesGlobs works with include patterns', () => {
    const scanner = new DirectoryScanner({
      includeGlobs: ['*.md', 'docs/*.html']
    });
    
    expect(scanner.matchesGlobs('test.md')).toBe(true);
    expect(scanner.matchesGlobs('docs/guide.html')).toBe(true);
    expect(scanner.matchesGlobs('test.txt')).toBe(false);
    expect(scanner.matchesGlobs('other/guide.html')).toBe(false);
  });

  test('matchesGlobs works with exclude patterns', () => {
    const scanner = new DirectoryScanner({
      excludeGlobs: ['draft*', 'temp/*']
    });
    
    expect(scanner.matchesGlobs('test.md')).toBe(true);
    expect(scanner.matchesGlobs('draft.md')).toBe(false);
    expect(scanner.matchesGlobs('draft-notes.html')).toBe(false);
    expect(scanner.matchesGlobs('temp/file.md')).toBe(false);
    expect(scanner.matchesGlobs('docs/temp.md')).toBe(true); // doesn't match temp/*
  });

  test('matchesGlobs works with both include and exclude patterns', () => {
    const scanner = new DirectoryScanner({
      includeGlobs: ['*.md', '*.html'],
      excludeGlobs: ['draft*', 'temp/*']
    });
    
    expect(scanner.matchesGlobs('test.md')).toBe(true);
    expect(scanner.matchesGlobs('guide.html')).toBe(true);
    expect(scanner.matchesGlobs('test.txt')).toBe(false); // not included
    expect(scanner.matchesGlobs('draft.md')).toBe(false); // excluded
    expect(scanner.matchesGlobs('temp/file.html')).toBe(false); // excluded
  });

  test('defaultIsDocumentFile includes HTML files', () => {
    const scanner = new DirectoryScanner();
    
    expect(scanner.defaultIsDocumentFile('test.md')).toBe(true);
    expect(scanner.defaultIsDocumentFile('test.mdx')).toBe(true);
    expect(scanner.defaultIsDocumentFile('test.html')).toBe(true);
    expect(scanner.defaultIsDocumentFile('test.HTML')).toBe(true);
    expect(scanner.defaultIsDocumentFile('test.txt')).toBe(false);
  });
});