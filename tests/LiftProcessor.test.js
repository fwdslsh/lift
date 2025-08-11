import { LiftProcessor } from '../src/LiftProcessor.js';
import { mkdir, writeFile, rm, readdir, stat } from 'fs/promises';
import { join } from 'path';

describe('LiftProcessor', () => {
  const testInputDir = './tests/tmp_input';
  const testOutputDir = './tests/tmp_output';

  beforeAll(async () => {
    await mkdir(testInputDir, { recursive: true });
    await mkdir(testOutputDir, { recursive: true });
    // Create markdown files
    await writeFile(join(testInputDir, 'index.md'), '# Index\n---\nIndex content');
    await writeFile(join(testInputDir, 'guide.md'), '# Guide\nGuide content');
    await writeFile(join(testInputDir, 'other.txt'), 'Not markdown');
    await mkdir(join(testInputDir, 'node_modules'), { recursive: true });
    await writeFile(join(testInputDir, 'node_modules', 'ignore.md'), '# Should be ignored');
  });

  afterAll(async () => {
    await rm(testInputDir, { recursive: true, force: true });
    await rm(testOutputDir, { recursive: true, force: true });
  });

  test('scanDirectory finds only markdown files and excludes patterns', async () => {
    const processor = new LiftProcessor(testInputDir, testOutputDir);
    const files = await processor.scanDirectory(testInputDir);
    expect(files.length).toBe(2);
    expect(files.some(f => f.endsWith('index.md'))).toBe(true);
    expect(files.some(f => f.endsWith('guide.md'))).toBe(true);
    expect(files.some(f => f.includes('node_modules'))).toBe(false);
  });

  test('isMarkdownFile correctly identifies markdown files', () => {
    const processor = new LiftProcessor();
    expect(processor.isMarkdownFile('foo.md')).toBe(true);
    expect(processor.isMarkdownFile('foo.mdx')).toBe(true);
    expect(processor.isMarkdownFile('foo.txt')).toBe(false);
  });

  test('shouldExclude works for excluded patterns', () => {
    const processor = new LiftProcessor();
    expect(processor.shouldExclude('node_modules', 'node_modules/ignore.md')).toBe(true);
    expect(processor.shouldExclude('foo', 'foo')).toBe(false);
  });

  test('processFiles strips frontmatter and reads content', async () => {
    const processor = new LiftProcessor(testInputDir, testOutputDir);
    const files = await processor.scanDirectory(testInputDir);
    const docs = await processor.processFiles(files);
    expect(docs[0].content).not.toMatch(/^---/);
    expect(docs[0].content).toContain('Index content');
  });

  test('orderDocuments categorizes documents', async () => {
    const processor = new LiftProcessor(testInputDir, testOutputDir);
    const files = await processor.scanDirectory(testInputDir);
    const docs = await processor.processFiles(files);
    const ordered = processor.orderDocuments(docs);
    expect(ordered.index.length).toBe(1);
    expect(ordered.important.length).toBe(1);
    expect(ordered.other.length).toBe(0);
  });

  test('generateOutputs creates llms.txt and llms-full.txt', async () => {
    const processor = new LiftProcessor(testInputDir, testOutputDir);
    const files = await processor.scanDirectory(testInputDir);
    const docs = await processor.processFiles(files);
    const ordered = processor.orderDocuments(docs);
    await processor.generateOutputs(ordered);
    const outFiles = await readdir(testOutputDir);
    expect(outFiles).toContain('llms.txt');
    expect(outFiles).toContain('llms-full.txt');
    const stats = await stat(join(testOutputDir, 'llms.txt'));
    expect(stats.size).toBeGreaterThan(0);
  });
});
