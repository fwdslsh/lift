import { IndexGenerator } from '../src/IndexGenerator.js';
import { mkdir, writeFile, rm, readFile, stat } from 'fs/promises';
import { join } from 'path';

describe('IndexGenerator', () => {
  const testInputDir = './tests/index_input';
  const testOutputDir = './tests/index_output';
  
  beforeEach(async () => {
    await rm(testInputDir, { recursive: true, force: true });
    await rm(testOutputDir, { recursive: true, force: true });
    await mkdir(testInputDir, { recursive: true });
    await mkdir(testOutputDir, { recursive: true });
    
    // Create test directory structure
    await mkdir(join(testInputDir, 'subdir'), { recursive: true });
    await mkdir(join(testInputDir, 'node_modules'), { recursive: true });
    
    // Create test files
    await writeFile(join(testInputDir, 'readme.md'), '# Readme\nReadme content');
    await writeFile(join(testInputDir, 'guide.md'), '# Guide\nGuide content');
    await writeFile(join(testInputDir, 'config.json'), '{"test": true}');
    await writeFile(join(testInputDir, 'subdir', 'nested.md'), '# Nested\nNested content');
    await writeFile(join(testInputDir, 'subdir', 'data.txt'), 'text content');
    await writeFile(join(testInputDir, 'node_modules', 'package.md'), '# Should be excluded');
  });

  afterAll(async () => {
    await rm(testInputDir, { recursive: true, force: true });
    await rm(testOutputDir, { recursive: true, force: true });
  });

  test('constructs with required parameters', () => {
    const generator = new IndexGenerator(testInputDir, testOutputDir);
    expect(generator.inputDir).toBe(testInputDir);
    expect(generator.outputDir).toBe(testOutputDir);
  });

  test('constructs with custom options', () => {
    const customOptions = {
      excludePatterns: ['custom'],
      shouldExcludeFn: () => true,
      isMarkdownFileFn: () => false
    };
    
    const generator = new IndexGenerator(testInputDir, testOutputDir, customOptions);
    expect(generator.excludePatterns).toContain('custom');
    expect(generator.shouldExcludeFn).toBe(customOptions.shouldExcludeFn);
    expect(generator.isMarkdownFileFn).toBe(customOptions.isMarkdownFileFn);
  });

  test('getFileExtension extracts extensions correctly', () => {
    const generator = new IndexGenerator(testInputDir, testOutputDir);
    
    expect(generator.getFileExtension('file.md')).toBe('.md');
    expect(generator.getFileExtension('file.txt')).toBe('.txt');
    expect(generator.getFileExtension('file')).toBe('');
    expect(generator.getFileExtension('file.name.ext')).toBe('.ext');
    expect(generator.getFileExtension('.hidden')).toBe('.hidden'); // Hidden files are treated as having extension
    expect(generator.getFileExtension('path/to/file.js')).toBe('.js');
  });

  test('generateDirectoryIndex creates index.json for single directory', async () => {
    const generator = new IndexGenerator(testInputDir, testOutputDir);
    await generator.generateDirectoryIndex(testInputDir, testOutputDir);
    
    const indexPath = join(testOutputDir, 'index.json');
    const indexStats = await stat(indexPath);
    expect(indexStats.isFile()).toBe(true);
    
    const indexContent = JSON.parse(await readFile(indexPath, 'utf8'));
    
    // Check structure
    expect(indexContent).toHaveProperty('directory');
    expect(indexContent).toHaveProperty('generated');
    expect(indexContent).toHaveProperty('files');
    expect(indexContent).toHaveProperty('subdirectories');
    expect(indexContent).toHaveProperty('summary');
    
    // Check directory
    expect(indexContent.directory).toBe('.');
    
    // Check files
    expect(Array.isArray(indexContent.files)).toBe(true);
    expect(indexContent.files.length).toBeGreaterThan(0);
    
    const readmeFile = indexContent.files.find(f => f.name === 'readme.md');
    expect(readmeFile).toBeDefined();
    expect(readmeFile).toHaveProperty('name');
    expect(readmeFile).toHaveProperty('path');
    expect(readmeFile).toHaveProperty('size');
    expect(readmeFile).toHaveProperty('modified');
    expect(readmeFile).toHaveProperty('type');
    expect(readmeFile).toHaveProperty('extension');
    expect(readmeFile).toHaveProperty('isMarkdown');
    expect(readmeFile.isMarkdown).toBe(true);
    
    // Check subdirectories
    expect(Array.isArray(indexContent.subdirectories)).toBe(true);
    const subdir = indexContent.subdirectories.find(s => s.name === 'subdir');
    expect(subdir).toBeDefined();
    expect(subdir).toHaveProperty('name');
    expect(subdir).toHaveProperty('path');
    expect(subdir).toHaveProperty('indexPath');
    
    // Check summary
    expect(indexContent.summary).toHaveProperty('totalFiles');
    expect(indexContent.summary).toHaveProperty('totalSubdirectories');
    expect(indexContent.summary).toHaveProperty('markdownFiles');
    expect(indexContent.summary).toHaveProperty('totalSize');
    expect(typeof indexContent.summary.totalFiles).toBe('number');
    expect(typeof indexContent.summary.markdownFiles).toBe('number');
  });

  test('generateDirectoryIndex excludes patterns correctly', async () => {
    const generator = new IndexGenerator(testInputDir, testOutputDir, {
      excludePatterns: ['node_modules', '.git']
    });
    await generator.generateDirectoryIndex(testInputDir, testOutputDir);
    
    const indexContent = JSON.parse(await readFile(join(testOutputDir, 'index.json'), 'utf8'));
    
    // Should not include node_modules
    const hasNodeModules = indexContent.subdirectories.some(s => s.name === 'node_modules');
    expect(hasNodeModules).toBe(false);
  });

  test('generateAll creates index files for all directories', async () => {
    const generator = new IndexGenerator(testInputDir, testOutputDir);
    await generator.generateAll();
    
    // Check root index
    const rootIndexPath = join(testOutputDir, 'index.json');
    const rootIndexStats = await stat(rootIndexPath);
    expect(rootIndexStats.isFile()).toBe(true);
    
    // Check subdirectory index
    const subIndexPath = join(testOutputDir, 'subdir', 'index.json');
    const subIndexStats = await stat(subIndexPath);
    expect(subIndexStats.isFile()).toBe(true);
    
    // Check master index
    const masterIndexPath = join(testOutputDir, 'master-index.json');
    const masterIndexStats = await stat(masterIndexPath);
    expect(masterIndexStats.isFile()).toBe(true);
  });

  test('generateMasterIndex creates aggregated index', async () => {
    const generator = new IndexGenerator(testInputDir, testOutputDir);
    
    // Use generateAll to create the full directory structure
    await generator.generateAll();
    
    const masterIndexPath = join(testOutputDir, 'master-index.json');
    const masterIndex = JSON.parse(await readFile(masterIndexPath, 'utf8'));
    
    // Check structure
    expect(masterIndex).toHaveProperty('project');
    expect(masterIndex).toHaveProperty('generated');
    expect(masterIndex).toHaveProperty('totalDirectories');
    expect(masterIndex).toHaveProperty('totalFiles');
    expect(masterIndex).toHaveProperty('totalMarkdownFiles');
    expect(masterIndex).toHaveProperty('totalSize');
    expect(masterIndex).toHaveProperty('directories');
    
    // Check directories array
    expect(Array.isArray(masterIndex.directories)).toBe(true);
    expect(masterIndex.directories.length).toBeGreaterThan(0);
    
    const rootDir = masterIndex.directories.find(d => d.path === '.');
    expect(rootDir).toBeDefined();
    expect(rootDir).toHaveProperty('indexPath');
    expect(rootDir).toHaveProperty('summary');
    
    // Check aggregated totals
    expect(typeof masterIndex.totalDirectories).toBe('number');
    expect(typeof masterIndex.totalFiles).toBe('number');
    expect(typeof masterIndex.totalMarkdownFiles).toBe('number');
    expect(typeof masterIndex.totalSize).toBe('number');
    expect(masterIndex.totalDirectories).toBeGreaterThan(0);
  });

  test('createIndexContent creates correct structure', async () => {
    const generator = new IndexGenerator(testInputDir, testOutputDir);
    
    const files = [
      { name: 'test.md', size: 100, isMarkdown: true },
      { name: 'data.json', size: 50, isMarkdown: false }
    ];
    
    const subdirectories = [
      { name: 'subdir', path: 'subdir', indexPath: 'subdir/index.json' }
    ];
    
    const content = generator.createIndexContent('testdir', files, subdirectories);
    
    expect(content).toHaveProperty('directory', 'testdir');
    expect(content).toHaveProperty('generated');
    expect(content).toHaveProperty('files', files);
    expect(content).toHaveProperty('subdirectories', subdirectories);
    expect(content).toHaveProperty('summary');
    
    // Check that subdirectories retain their indexPath
    expect(content.subdirectories[0]).toHaveProperty('indexPath', 'subdir/index.json');
    
    // Check summary calculations
    expect(content.summary.totalFiles).toBe(2);
    expect(content.summary.totalSubdirectories).toBe(1);
    expect(content.summary.markdownFiles).toBe(1);
    expect(content.summary.totalSize).toBe(150);
  });

  test('generateAll handles empty directories', async () => {
    const emptyDir = join(testInputDir, 'empty');
    const emptyOutput = join(testOutputDir, 'empty');
    await mkdir(emptyDir, { recursive: true });
    
    const generator = new IndexGenerator(emptyDir, emptyOutput);
    await generator.generateAll();
    
    const indexContent = JSON.parse(await readFile(join(emptyOutput, 'index.json'), 'utf8'));
    
    expect(indexContent.files).toEqual([]);
    expect(indexContent.subdirectories).toEqual([]);
    expect(indexContent.summary.totalFiles).toBe(0);
    expect(indexContent.summary.markdownFiles).toBe(0);
  });

  test('generateAll with custom exclude function', async () => {
    const customShouldExclude = (pattern, fullPath) => {
      return fullPath.includes('guide'); // Exclude files/dirs with 'guide' in path
    };
    
    const generator = new IndexGenerator(testInputDir, testOutputDir, {
      shouldExcludeFn: customShouldExclude
    });
    
    await generator.generateAll();
    
    const indexContent = JSON.parse(await readFile(join(testOutputDir, 'index.json'), 'utf8'));
    
    // Should not include guide.md
    const hasGuide = indexContent.files.some(f => f.name === 'guide.md');
    expect(hasGuide).toBe(false);
    
    // Should still include readme.md
    const hasReadme = indexContent.files.some(f => f.name === 'readme.md');
    expect(hasReadme).toBe(true);
  });

  test('generateAll with custom markdown detection', async () => {
    const customIsMarkdown = (path) => {
      return path.endsWith('.txt'); // Treat .txt files as markdown
    };
    
    const generator = new IndexGenerator(testInputDir, testOutputDir, {
      isMarkdownFileFn: customIsMarkdown
    });
    
    await generator.generateAll();
    
    const indexContent = JSON.parse(await readFile(join(testOutputDir, 'index.json'), 'utf8'));
    
    // .md files should not be marked as markdown with custom function
    const mdFile = indexContent.files.find(f => f.name === 'readme.md');
    expect(mdFile?.isMarkdown).toBe(false);
    
    // Check subdirectory for .txt file
    const subIndexContent = JSON.parse(await readFile(join(testOutputDir, 'subdir', 'index.json'), 'utf8'));
    const txtFile = subIndexContent.files.find(f => f.name === 'data.txt');
    expect(txtFile?.isMarkdown).toBe(true);
  });
});