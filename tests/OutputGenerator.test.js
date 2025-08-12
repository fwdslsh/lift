import { OutputGenerator } from '../src/OutputGenerator.js';
import { mkdir, writeFile, rm, readFile, stat } from 'fs/promises';
import { join } from 'path';

describe('OutputGenerator', () => {
  const testOutputDir = './tests/output_test';
  
  beforeEach(async () => {
    await rm(testOutputDir, { recursive: true, force: true });
    await mkdir(testOutputDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testOutputDir, { recursive: true, force: true });
  });

  const createMockDocuments = () => {
    const docs = {
      index: [
        {
          relativePath: 'index.md',
          content: '# Welcome\nThis is the index page.'
        },
        {
          relativePath: 'readme.md',
          content: '# Readme\nThis is the readme file.'
        }
      ],
      important: [
        {
          relativePath: 'catalog.md',
          content: '# Catalog\nThis is the catalog.'
        },
        {
          relativePath: 'tutorial.md',
          content: '# Tutorial\nThis is the tutorial.'
        }
      ],
      other: [
        {
          relativePath: 'api/reference.md',
          content: '# API Reference\nAPI documentation.'
        },
        {
          relativePath: 'misc.md',
          content: '# Miscellaneous\nOther content.'
        }
      ]
    };
    docs.all = [...docs.index, ...docs.important, ...docs.other];
    return docs;
  };

  test('constructs with output directory', () => {
    const generator = new OutputGenerator(testOutputDir);
    expect(generator.outputDir).toBe(testOutputDir);
    expect(generator.silent).toBe(false);
  });

  test('constructs with silent option', () => {
    const generator = new OutputGenerator(testOutputDir, { silent: true });
    expect(generator.silent).toBe(true);
  });

  test('log method respects silent option', () => {
    const originalLog = console.log;
    let logCalled = false;
    console.log = () => { logCalled = true; };
    
    const silentGenerator = new OutputGenerator(testOutputDir, { silent: true });
    const normalGenerator = new OutputGenerator(testOutputDir, { silent: false });
    
    logCalled = false;
    silentGenerator.log('test message');
    expect(logCalled).toBe(false);
    
    logCalled = false;
    normalGenerator.log('test message');
    expect(logCalled).toBe(true);
    
    console.log = originalLog;
  });

  test('generateLlmsIndex creates structured index output', async () => {
    const generator = new OutputGenerator(testOutputDir);
    const orderedDocs = createMockDocuments();
    
    const content = generator.generateLlmsIndex('TestProject', orderedDocs);
    
    // Check header
    expect(content).toContain('# TestProject');
    expect(content).toContain('> Documentation for TestProject');
    
    // Check sections
    expect(content).toContain('## Core Documentation');
    expect(content).toContain('## Optional');
    
    // Check file links
    expect(content).toContain('- [index.md](index.md)');
    expect(content).toContain('- [readme.md](readme.md)');
    expect(content).toContain('- [catalog.md](catalog.md)');
    expect(content).toContain('- [tutorial.md](tutorial.md)');
    expect(content).toContain('- [api/reference.md](api/reference.md)');
    expect(content).toContain('- [misc.md](misc.md)');
  });

  test('generateLlmsFull creates full content output', async () => {
    const generator = new OutputGenerator(testOutputDir);
    const orderedDocs = createMockDocuments();
    const allDocs = [...orderedDocs.index, ...orderedDocs.important, ...orderedDocs.other];
    
    const content = generator.generateLlmsFull('TestProject', allDocs);
    
    // Check header
    expect(content).toContain('# TestProject');
    expect(content).toContain('> Documentation for TestProject');
    
    // Check all content is included
    expect(content).toContain('This is the index page.');
    expect(content).toContain('This is the readme file.');
    expect(content).toContain('This is the catalog.');
    expect(content).toContain('This is the tutorial.');
    expect(content).toContain('API documentation.');
    expect(content).toContain('Other content.');
    
    // Check file section headers
    expect(content).toContain('## index.md');
    expect(content).toContain('## catalog.md');
    expect(content).toContain('## api/reference.md');
  });

  test('generateOutputs creates both files and reports sizes', async () => {
    const generator = new OutputGenerator(testOutputDir);
    const orderedDocs = createMockDocuments();
    
    await generator.generateOutputs('TestProject', orderedDocs);
    
    // Check both files exist
    const llmsStats = await stat(join(testOutputDir, 'llms.txt'));
    const llmsFullStats = await stat(join(testOutputDir, 'llms-full.txt'));
    
    expect(llmsStats.isFile()).toBe(true);
    expect(llmsFullStats.isFile()).toBe(true);
    expect(llmsStats.size).toBeGreaterThan(0);
    expect(llmsFullStats.size).toBeGreaterThan(0);
  });

  test('generateOutputs handles empty documents', async () => {
    const generator = new OutputGenerator(testOutputDir);
    const emptyDocs = {
      index: [],
      important: [],
      other: [],
      all: []
    };
    
    await generator.generateOutputs('EmptyProject', emptyDocs);
    
    const llmsContent = await readFile(join(testOutputDir, 'llms.txt'), 'utf8');
    const llmsFullContent = await readFile(join(testOutputDir, 'llms-full.txt'), 'utf8');
    
    expect(llmsContent).toContain('# EmptyProject');
    expect(llmsFullContent).toContain('# EmptyProject');
    
    // Should not have sections when there are no documents
    expect(llmsContent).not.toContain('## Core Documentation');
    expect(llmsContent).not.toContain('## Optional');
  });

  test('generateOutputs handles only index documents', async () => {
    const generator = new OutputGenerator(testOutputDir);
    const indexOnlyDocs = {
      index: [
        {
          relativePath: 'index.md',
          content: '# Index\nOnly index content.'
        }
      ],
      important: [],
      other: []
    };
    indexOnlyDocs.all = [...indexOnlyDocs.index];
    
    await generator.generateOutputs('IndexProject', indexOnlyDocs);
    
    const llmsContent = await readFile(join(testOutputDir, 'llms.txt'), 'utf8');
    const llmsFullContent = await readFile(join(testOutputDir, 'llms-full.txt'), 'utf8');
    
    expect(llmsContent).toContain('- [index.md](index.md)');
    expect(llmsFullContent).toContain('Only index content.');
    
    // Should have core documentation section
    expect(llmsContent).toContain('## Core Documentation');
    // Should not have optional section when empty
    expect(llmsContent).not.toContain('## Optional');
  });

  test('generateOutputs handles documents with nested paths', async () => {
    const generator = new OutputGenerator(testOutputDir);
    const nestedDocs = {
      index: [],
      important: [],
      other: [
        {
          relativePath: 'deep/nested/path/doc.md',
          content: '# Nested Doc\nNested content.'
        }
      ]
    };
    nestedDocs.all = [...nestedDocs.other];
    
    await generator.generateOutputs('NestedProject', nestedDocs);
    
    const llmsContent = await readFile(join(testOutputDir, 'llms.txt'), 'utf8');
    const llmsFullContent = await readFile(join(testOutputDir, 'llms-full.txt'), 'utf8');
    
    expect(llmsContent).toContain('- [deep/nested/path/doc.md](deep/nested/path/doc.md)');
    expect(llmsFullContent).toContain('## deep/nested/path/doc.md');
    expect(llmsFullContent).toContain('Nested content.');
  });

  test('formatSize formats bytes correctly', () => {
    const generator = new OutputGenerator(testOutputDir);
    
    expect(generator.formatSize(0)).toBe('0 B');
    expect(generator.formatSize(512)).toBe('512 B');
    expect(generator.formatSize(1024)).toBe('1.0 KB');
    expect(generator.formatSize(1536)).toBe('1.5 KB');
    expect(generator.formatSize(1024 * 1024)).toBe('1.0 MB');
    expect(generator.formatSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
  });

  test('generateOutputs creates output directory if it does not exist', async () => {
    const nonExistentDir = join(testOutputDir, 'does-not-exist');
    const generator = new OutputGenerator(nonExistentDir);
    const orderedDocs = createMockDocuments();
    
    await generator.generateOutputs('TestProject', orderedDocs);
    
    // Directory should be created and files should exist
    const llmsStats = await stat(join(nonExistentDir, 'llms.txt'));
    expect(llmsStats.isFile()).toBe(true);
  });

  test('generateOutputs handles special characters in project name', async () => {
    const generator = new OutputGenerator(testOutputDir);
    const orderedDocs = createMockDocuments();
    
    await generator.generateOutputs('Test-Project_With@Special#Characters', orderedDocs);
    
    const llmsContent = await readFile(join(testOutputDir, 'llms.txt'), 'utf8');
    expect(llmsContent).toContain('# Test-Project_With@Special#Characters');
  });
});