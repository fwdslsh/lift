import { spawn } from "child_process";
import { mkdir, writeFile, rm, readFile, stat } from "fs/promises";
import { join, resolve } from "path";

describe("CLI Integration", () => {
  const testInputDir = "./tests/cli_input";
  const testOutputDir = "./tests/cli_output";
  const cliPath = resolve(__dirname, "../src/cli.js");

  beforeAll(async () => {
    await mkdir(testInputDir, { recursive: true });
    await mkdir(testOutputDir, { recursive: true });
    await writeFile(
      join(testInputDir, "readme.md"),
      "# Readme\nReadme content"
    );
    await writeFile(
      join(testInputDir, "tutorial.md"),
      "# Tutorial\nTutorial content"
    );
  });

  afterAll(async () => {
    await rm(testInputDir, { recursive: true, force: true });
    await rm(testOutputDir, { recursive: true, force: true });
  });

  function runCLI(args = [], env = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn("node", [cliPath, ...args], {
        env: { ...process.env, ...env },
      });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d) => {
        stdout += d;
      });
      proc.stderr.on("data", (d) => {
        stderr += d;
      });
      proc.on("close", (code) => {
        resolve({ code, stdout, stderr });
      });
      proc.on("error", reject);
    });
  }

  function normalizeOutput(output) {
    return output.trim().replace(/\s+/g, " ");
  }

  test("shows help with --help", async () => {
    const result = await runCLI(["--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/Usage:/);
  });

  test("shows version with --version", async () => {
    const result = await runCLI(["--version"]);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("generates output files with input/output options", async () => {
    const result = await runCLI([
      "--input",
      testInputDir,
      "--output",
      testOutputDir,
    ]);
    expect(result.code).toBe(0);
    const llms = await readFile(join(testOutputDir, "llms.txt"), "utf8");
    const llmsFull = await readFile(
      join(testOutputDir, "llms-full.txt"),
      "utf8"
    );
    expect(llms).toMatch(/Core Documentation/);
    expect(llmsFull).toMatch(/Readme content/);
    expect(llmsFull).toMatch(/Tutorial content/);
  });

  test("silent mode suppresses output", async () => {
    const result = await runCLI([
      "--input",
      testInputDir,
      "--output",
      testOutputDir,
      "--silent",
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
  });

  test("errors on unknown option", async () => {
    const result = await runCLI(["--badopt"]);
    const normalizedStderr = result.stderr.trim();
    console.log("Normalized stderr:", normalizedStderr);
    expect(result.code).toBe(1);
    expect(normalizedStderr).toContain("Error: Unknown option --badopt");
    expect(normalizedStderr).toContain("Use --help to see available options");
  });

  test("errors if input path is missing", async () => {
    const result = await runCLI(["--input"]);
    const normalizedStderr = result.stderr.trim();
    console.log("Normalized stderr:", normalizedStderr);
    expect(result.code).toBe(1);
    expect(normalizedStderr).toContain(
      "Error: --input requires a path argument"
    );
  });

  test("generates index.json files with --generate-index flag", async () => {
    const result = await runCLI([
      "--input",
      testInputDir,
      "--output",
      testOutputDir,
      "--generate-index",
    ]);
    expect(result.code).toBe(0);

    // Check that index files are created
    const rootIndexStats = await stat(join(testOutputDir, "index.json"));
    expect(rootIndexStats.isFile()).toBe(true);

    const masterIndexStats = await stat(
      join(testOutputDir, "master-index.json")
    );
    expect(masterIndexStats.isFile()).toBe(true);

    // Check that regular outputs are still created
    const llms = await readFile(join(testOutputDir, "llms.txt"), "utf8");
    expect(llms).toMatch(/Core Documentation/);
  });

  test("help text includes --generate-index option", async () => {
    const result = await runCLI(["--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/--generate-index/);
    expect(result.stdout).toMatch(/Generate index\.json files/);
  });

  test("help text includes new include/exclude options", async () => {
    const result = await runCLI(["--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/--include <pattern>/);
    expect(result.stdout).toMatch(/--exclude <pattern>/);
    expect(result.stdout).toMatch(/HTML files/);
  });

  test("errors when include option is missing pattern", async () => {
    const result = await runCLI(["--include"]);
    const normalizedStderr = result.stderr.trim();
    console.log("Normalized stderr:", normalizedStderr);
    expect(result.code).toBe(1);
    expect(normalizedStderr).toContain(
      "Error: --include requires a glob pattern argument"
    );
  });

  test("errors when exclude option is missing pattern", async () => {
    const result = await runCLI(["--exclude"]);
    const normalizedStderr = result.stderr.trim();
    console.log("Normalized stderr:", normalizedStderr);
    expect(result.code).toBe(1);
    expect(normalizedStderr).toContain(
      "Error: --exclude requires a glob pattern argument"
    );
  });

  test("processes files with include glob pattern", async () => {
    const result = await runCLI([
      "--input",
      testInputDir,
      "--output",
      testOutputDir,
      "--include",
      "*.md",
    ]);
    expect(result.code).toBe(0);

    const llmsFile = join(testOutputDir, "llms.txt");
    const llms = await readFile(llmsFile, "utf8");
    expect(llms).toMatch(/readme\.md|tutorial\.md/);
    expect(llms).not.toMatch(/\.html/);
  });

  test("processes files with exclude glob pattern", async () => {
    const result = await runCLI([
      "--input",
      testInputDir,
      "--output",
      testOutputDir,
      "--exclude",
      "**/reference.md",
    ]);
    expect(result.code).toBe(0);

    const llmsFile = join(testOutputDir, "llms.txt");
    const llms = await readFile(llmsFile, "utf8");
    expect(llms).toMatch(/readme\.md|tutorial\.md/);
    expect(llms).not.toMatch(/reference\.md/);
  });
});
