# Lift

A lightweight CLI that scans a directory of Markdown files to generate `llms.txt` (structured index) and `llms-full.txt` (full content), designed to integrate seamlessly with `inform` and follow the fwdslsh philosophy.

## Philosophy

**Lift** embodies the fwdslsh ethos: minimal, readable, and effective. It bridges crawling (via `inform`) to AI-generated documentation formats (`llms.txt`), using familiar, easy-to-understand CLI patterns.

## Installation

This tool requires [Bun](https://bun.sh) runtime:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Usage

```bash
# Default (scan current directory, output to current directory)
lift

# Specify input and output directories  
lift --input docs --output build

# Use short flags
lift -i docs -o build

# Silent mode (suppress non-error output)
lift --input docs --output build --silent

# Show help
lift --help

# Show version
lift --version
```

## Flags

- `--input, -i <path>`: Source directory of Markdown files (default: current directory)
- `--output, -o <path>`: Destination directory for generated files (default: current directory)  
- `--silent`: Suppress non-error output
- `--help, -h`: Show usage information
- `--version`: Show current version

## Behavior

### File Discovery
- Recursively scans the input directory for `.md` and `.mdx` files
- Excludes common artifacts: `.git`, `node_modules`, `dist`, `build`, `out`, `coverage`, `.next`, `.nuxt`, `.output`, `.vercel`, `.netlify`

### Document Processing  
- Strips YAML frontmatter from files
- Orders documents intelligently:
  1. **Index/home files first**: `index.md`, `readme.md`, `home.md` (prioritized by name)
  2. **Important documentation**: Files containing `doc`, `guide`, `tutorial`, `intro`, `getting-started`, etc.
  3. **Remaining files**: Alphabetically sorted

### Output Generation

#### `llms.txt` (Structured Index)
- Title = input directory name
- Blockquote summary: "Documentation for {directory}"  
- **Core Documentation** section: Index files + important docs
- **Optional** section: Remaining files
- All links are relative paths (markdown format)

#### `llms-full.txt` (Full Content)
- Complete concatenated content
- Each file has `## filename` heading
- Files separated by `---`
- Maintains document ordering from index

## Example Output

For a directory structure like:
```
docs/
├── index.md
├── guide/
│   └── getting-started.md
├── api/
│   └── reference.md
└── misc.md
```

**`llms.txt`:**
```markdown
# docs

> Documentation for docs

## Core Documentation
- [index.md](index.md)
- [guide/getting-started.md](guide/getting-started.md)

## Optional
- [api/reference.md](api/reference.md)
- [misc.md](misc.md)
```

**`llms-full.txt`:**
```markdown
# docs

> Documentation for docs

## index.md

[Full content of index.md]

---

## guide/getting-started.md

[Full content with YAML frontmatter stripped]

---

[... continues for all files]
```

## Integration with `inform`

**Lift** is designed to work seamlessly with [`inform`](https://github.com/fwdslsh/inform):

```bash
# Use inform to crawl a site into local docs
inform https://docs.example.com --output-dir docs

# Use lift to generate LLMS artifacts from the crawled content  
lift --input docs --output build
```

This composable approach follows the fwdslsh philosophy of minimal, focused tools that work well together.

## Development

```bash
# Run with Bun
bun src/cli.js --help

# Development mode (with watch)
bun --watch src/cli.js

# Run from anywhere (after making executable)
chmod +x src/cli.js
./src/cli.js --help
```

## License

CC-BY-4.0
