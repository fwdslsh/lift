import { spawn } from 'child_process';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';

describe('CLI Integration', () => {
  const testInputDir = './tests/cli_input';
  const testOutputDir = './tests/cli_output';
  const cliPath = './src/cli.js';

  beforeAll(async () => {
    await mkdir(testInputDir, { recursive: true });
    await mkdir(testOutputDir, { recursive: true });
    await writeFile(join(testInputDir, 'readme.md'), '# Readme\nReadme content');
    await writeFile(join(testInputDir, 'tutorial.md'), '# Tutorial\nTutorial content');
  });

  afterAll(async () => {
    await rm(testInputDir, { recursive: true, force: true });
    await rm(testOutputDir, { recursive: true, force: true });
  });

  function runCLI(args = [], env = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn('bun', [cliPath, ...args], { env: { ...process.env, ...env } });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', d => { stdout += d; });
      proc.stderr.on('data', d => { stderr += d; });
      proc.on('close', code => {
        resolve({ code, stdout, stderr });
      });
      proc.on('error', reject);
    });
  }

  test('shows help with --help', async () => {
    const result = await runCLI(['--help']);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/Usage:/);
  });

  test('shows version with --version', async () => {
    const result = await runCLI(['--version']);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  test('generates output files with input/output options', async () => {
    const result = await runCLI(['--input', testInputDir, '--output', testOutputDir]);
    expect(result.code).toBe(0);
    const llms = await readFile(join(testOutputDir, 'llms.txt'), 'utf8');
    const llmsFull = await readFile(join(testOutputDir, 'llms-full.txt'), 'utf8');
    expect(llms).toMatch(/Core Documentation/);
    expect(llmsFull).toMatch(/Readme content/);
    expect(llmsFull).toMatch(/Tutorial content/);
  });

  test('silent mode suppresses output', async () => {
    const result = await runCLI(['--input', testInputDir, '--output', testOutputDir, '--silent']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
  });

  test('errors on unknown option', async () => {
    const result = await runCLI(['--badopt']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/Unknown option/);
  });

  test('errors if input path is missing', async () => {
    const result = await runCLI(['--input']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/requires a path argument/);
  });
});
