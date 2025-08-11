import { MarkdownProcessor } from '../src/MarkdownProcessor.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';

describe('MarkdownProcessor', () => {
  const testDir = './tests/markdown_test';
  
  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
    
    // Create test markdown files with various content
    await writeFile(join(testDir, 'index.md'), '---\ntitle: Index\ndate: 2023-01-01\n---\n\n# Index\nIndex content');
    await writeFile(join(testDir, 'readme.md'), '# Readme\nReadme content');
    await writeFile(join(testDir, 'guide.md'), '# Guide\nGuide content');
    await writeFile(join(testDir, 'tutorial.md'), '---\nauthor: Test\n---\n# Tutorial\nTutorial content');
    await writeFile(join(testDir, 'getting-started.md'), '# Getting Started\nGetting started content');
    await writeFile(join(testDir, 'reference.md'), '# Reference\nReference content');
    await writeFile(join(testDir, 'other.md'), '# Other\nOther content');
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('constructs with correct input directory', () => {
    const processor = new MarkdownProcessor(testDir);
    expect(processor.inputDir).toBe(testDir);
  });

  test('constructs with silent option', () => {
    const processor = new MarkdownProcessor(testDir, { silent: true });
    expect(processor.silent).toBe(true);
  });

  test('stripFrontmatter removes YAML frontmatter', () => {
    const processor = new MarkdownProcessor(testDir);
    
    const withFrontmatter = '---\ntitle: Test\ndate: 2023-01-01\n---\n\n# Content\nTest content';
    const withoutFrontmatter = '# Content\nTest content';
    
    expect(processor.stripFrontmatter(withFrontmatter)).toBe(withoutFrontmatter);
  });

  test('stripFrontmatter handles content without frontmatter', () => {
    const processor = new MarkdownProcessor(testDir);
    
    const content = '# Content\nTest content';
    expect(processor.stripFrontmatter(content)).toBe(content);
  });

  test('stripFrontmatter handles empty content', () => {
    const processor = new MarkdownProcessor(testDir);
    
    expect(processor.stripFrontmatter('')).toBe('');
  });

  test('stripFrontmatter handles frontmatter only', () => {
    const processor = new MarkdownProcessor(testDir);
    
    const frontmatterOnly = '---\ntitle: Test\n---\n';
    expect(processor.stripFrontmatter(frontmatterOnly)).toBe('');
  });

  test('stripFrontmatter handles malformed frontmatter', () => {
    const processor = new MarkdownProcessor(testDir);
    
    const malformed = '---\ntitle: Test\n# Content without closing frontmatter';
    expect(processor.stripFrontmatter(malformed)).toBe(malformed);
  });

  test('processFiles reads and processes multiple files', async () => {
    const processor = new MarkdownProcessor(testDir);
    const files = [
      join(testDir, 'index.md'),
      join(testDir, 'tutorial.md'),
      join(testDir, 'readme.md')
    ];
    
    const documents = await processor.processFiles(files);
    
    expect(documents).toHaveLength(3);
    
    const indexDoc = documents.find(doc => doc.relativePath === 'index.md');
    expect(indexDoc).toBeDefined();
    expect(indexDoc.content).toContain('Index content');
    expect(indexDoc.content).not.toMatch(/^---/); // Frontmatter stripped
    
    const tutorialDoc = documents.find(doc => doc.relativePath === 'tutorial.md');
    expect(tutorialDoc).toBeDefined();
    expect(tutorialDoc.content).toContain('Tutorial content');
    expect(tutorialDoc.content).not.toMatch(/^---/); // Frontmatter stripped
  });

  test('processFiles handles empty file list', async () => {
    const processor = new MarkdownProcessor(testDir);
    const documents = await processor.processFiles([]);
    
    expect(documents).toEqual([]);
  });

  test('processFiles handles non-existent files gracefully', async () => {
    const processor = new MarkdownProcessor(testDir);
    const files = [join(testDir, 'non-existent.md'), join(testDir, 'readme.md')];
    
    const documents = await processor.processFiles(files);
    
    // Should only process the existing file
    expect(documents).toHaveLength(1);
    expect(documents[0].relativePath).toBe('readme.md');
  });

  test('isIndexDocument identifies index files correctly', () => {
    const processor = new MarkdownProcessor(testDir);
    
    expect(processor.isIndexDocument('index.md')).toBe(true);
    expect(processor.isIndexDocument('INDEX.md')).toBe(true);
    expect(processor.isIndexDocument('readme.md')).toBe(true);
    expect(processor.isIndexDocument('README.MD')).toBe(true);
    expect(processor.isIndexDocument('home.md')).toBe(true);
    expect(processor.isIndexDocument('Home.mdx')).toBe(true);
    expect(processor.isIndexDocument('guide.md')).toBe(false);
    expect(processor.isIndexDocument('tutorial.md')).toBe(false);
  });

  test('isImportantDocument identifies important files correctly', () => {
    const processor = new MarkdownProcessor(testDir);
    
    expect(processor.isImportantDocument('guide.md')).toBe(true);
    expect(processor.isImportantDocument('tutorial.md')).toBe(true);
    expect(processor.isImportantDocument('getting-started.md')).toBe(true);
    expect(processor.isImportantDocument('GETTING-STARTED.MDX')).toBe(true);
    expect(processor.isImportantDocument('quickstart.md')).toBe(true);
    expect(processor.isImportantDocument('intro.md')).toBe(true);
    expect(processor.isImportantDocument('introduction.md')).toBe(true);
    expect(processor.isImportantDocument('docs.md')).toBe(true);
    expect(processor.isImportantDocument('doc.md')).toBe(true);
    expect(processor.isImportantDocument('start.md')).toBe(true);
    
    expect(processor.isImportantDocument('reference.md')).toBe(false);
    expect(processor.isImportantDocument('other.md')).toBe(false);
    expect(processor.isImportantDocument('random.md')).toBe(false);
  });

  test('orderDocuments categorizes documents correctly', async () => {
    const processor = new MarkdownProcessor(testDir);
    const files = [
      join(testDir, 'index.md'),
      join(testDir, 'readme.md'),
      join(testDir, 'guide.md'),
      join(testDir, 'tutorial.md'),
      join(testDir, 'getting-started.md'),
      join(testDir, 'reference.md'),
      join(testDir, 'other.md')
    ];
    
    const documents = await processor.processFiles(files);
    const ordered = processor.orderDocuments(documents);
    
    // Check index category
    expect(ordered.index).toHaveLength(2); // index.md, readme.md
    expect(ordered.index.some(doc => doc.relativePath === 'index.md')).toBe(true);
    expect(ordered.index.some(doc => doc.relativePath === 'readme.md')).toBe(true);
    
    // Check important category
    expect(ordered.important).toHaveLength(3); // guide.md, tutorial.md, getting-started.md
    expect(ordered.important.some(doc => doc.relativePath === 'guide.md')).toBe(true);
    expect(ordered.important.some(doc => doc.relativePath === 'tutorial.md')).toBe(true);
    expect(ordered.important.some(doc => doc.relativePath === 'getting-started.md')).toBe(true);
    
    // Check other category
    expect(ordered.other).toHaveLength(2); // reference.md, other.md
    expect(ordered.other.some(doc => doc.relativePath === 'reference.md')).toBe(true);
    expect(ordered.other.some(doc => doc.relativePath === 'other.md')).toBe(true);
  });

  test('orderDocuments sorts categories alphabetically', async () => {
    const processor = new MarkdownProcessor(testDir);
    const files = [
      join(testDir, 'other.md'),
      join(testDir, 'reference.md'),
      join(testDir, 'tutorial.md'),
      join(testDir, 'guide.md')
    ];
    
    const documents = await processor.processFiles(files);
    const ordered = processor.orderDocuments(documents);
    
    // Important files should be sorted alphabetically
    expect(ordered.important[0].relativePath).toBe('guide.md');
    expect(ordered.important[1].relativePath).toBe('tutorial.md');
    
    // Other files should be sorted alphabetically
    expect(ordered.other[0].relativePath).toBe('other.md');
    expect(ordered.other[1].relativePath).toBe('reference.md');
  });

  test('orderDocuments handles empty document list', () => {
    const processor = new MarkdownProcessor(testDir);
    const ordered = processor.orderDocuments([]);
    
    expect(ordered.index).toEqual([]);
    expect(ordered.important).toEqual([]);
    expect(ordered.other).toEqual([]);
  });

  test('processFiles creates correct document structure', async () => {
    const processor = new MarkdownProcessor(testDir);
    const files = [join(testDir, 'index.md')];
    
    const documents = await processor.processFiles(files);
    const doc = documents[0];
    
    expect(doc).toHaveProperty('fullPath');
    expect(doc).toHaveProperty('relativePath');
    expect(doc).toHaveProperty('content');
    
    expect(doc.fullPath).toBe(join(testDir, 'index.md'));
    expect(doc.relativePath).toBe('index.md');
    expect(typeof doc.content).toBe('string');
  });

  test('isIndexDocument identifies HTML index files correctly', () => {
    const processor = new MarkdownProcessor(testDir);
    
    expect(processor.isIndexDocument('index.html')).toBe(true);
    expect(processor.isIndexDocument('readme.html')).toBe(true);
    expect(processor.isIndexDocument('home.html')).toBe(true);
    expect(processor.isIndexDocument('docs/index.html')).toBe(true);
    expect(processor.isIndexDocument('guide.html')).toBe(false);
  });

  test('getIndexPriority handles HTML files correctly', () => {
    const processor = new MarkdownProcessor(testDir);
    
    expect(processor.getIndexPriority('index.html')).toBe(1);
    expect(processor.getIndexPriority('readme.html')).toBe(2);
    expect(processor.getIndexPriority('home.html')).toBe(3);
    expect(processor.getIndexPriority('docs/index.html')).toBe(1); // basename is still index.html, so priority 1
  });

  test('stripFrontmatter works with HTML files', () => {
    const processor = new MarkdownProcessor(testDir);
    const htmlWithFrontmatter = `---
title: Test HTML
layout: default
---
<h1>HTML Content</h1>
<p>This is HTML content.</p>`;
    
    const cleaned = processor.stripFrontmatter(htmlWithFrontmatter);
    expect(cleaned).toBe('<h1>HTML Content</h1>\n<p>This is HTML content.</p>');
    expect(cleaned).not.toContain('---');
    expect(cleaned).not.toContain('title: Test HTML');
  });
});