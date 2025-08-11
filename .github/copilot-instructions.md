# Copilot Instructions for AI Coding Agents

## Project Overview
- **Lift** is a CLI tool for scanning Markdown directories and generating two outputs:
  - `llms.txt`: Structured index of docs
  - `llms-full.txt`: Full concatenated content
- Designed for seamless integration with [`inform`](https://github.com/fwdslsh/inform) and follows the fwdslsh philosophy: minimal, readable, composable tools.

## Architecture & Key Files
- Main logic: `src/LiftProcessor.js`
- CLI entry: `src/cli.js`
- Tests: `tests/` (unit tests for CLI and processor)
- Example docs: `tests/fixtures/test-docs/`

## Core Behaviors
- Recursively scans for `.md`/`.mdx` files, excluding artifacts (`.git`, `node_modules`, etc.)
- Strips YAML frontmatter from docs
- Orders files:
  1. Index/home files (`index.md`, `readme.md`, `home.md`)
  2. Important docs (`guide`, `tutorial`, `getting-started`, etc.)
  3. Remaining files alphabetically
- Generates outputs with relative links and clear sectioning

## Developer Workflows
- **Run CLI:**
  - `bun src/cli.js --help` (or `lift --help` if installed globally)
  - Use flags: `--input`, `--output`, `--silent`, `--help`, `--version`
- **Development mode:**
  - `bun --watch src/cli.js`
- **Testing:**
  - Tests in `tests/` (run with Bun)
- **Integration:**
  - Use with `inform` to crawl docs, then run `lift` to process

## Project-Specific Patterns
- Output files (`llms.txt`, `llms-full.txt`) follow strict structure for downstream AI consumption
- Document ordering logic is critical—see `LiftProcessor.js` for implementation
- All links in outputs are relative and markdown-formatted
- YAML frontmatter is always stripped before processing

## External Dependencies
- Requires [Bun](https://bun.sh) runtime
- Integrates with `inform` for doc crawling

## Example Usage
```bash
lift --input docs --output build
```

## References
- See `README.md` for philosophy, usage, and integration details
- See `src/LiftProcessor.js` for document ordering and output logic
- See `tests/` for test patterns and fixtures

---
For unclear or missing conventions, consult `README.md` or ask for clarification.
