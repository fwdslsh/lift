# Catalog

A lightweight CLI that scans a directory of Markdown and HTML files to generate `llms.txt` (structured index) and `llms-full.txt` (full content), designed to integrate seamlessly with `inform` and follow the fwdslsh philosophy.

## Philosophy

**Catalog** embodies the fwdslsh ethos: minimal, readable, and effective. It bridges crawling (via `inform`) to AI-generated documentation formats (`llms.txt`), using familiar, easy-to-understand CLI patterns.

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/fwdslsh/catalog/main/install.sh | sh
```

### Manual Downloads

Download pre-built binaries from [GitHub Releases](https://github.com/fwdslsh/catalog/releases).

### Docker

```bash
docker run fwdslsh/catalog:latest --help
```

## Usage

```bash
# Default (scan current directory, output to current directory)
catalog

# Specify input and output directories
catalog --input docs --output build

# Use short flags
catalog -i docs -o build

# Include only specific file patterns
catalog --include "*.md" --include "catalog/*.html"

# Exclude specific patterns  
catalog --exclude "*.draft.md" --exclude "temp/*"

# Combine include/exclude with other options
catalog -i docs -o build --include "*.md" --exclude "draft/*" --generate-index

# Silent mode (suppress non-error output)
catalog --input docs --output build --silent

# Show help
catalog --help

# Show version
catalog --version
```

## Flags

- `--input, -i <path>`: Source directory of Markdown/HTML files (default: current directory)
- `--output, -o <path>`: Destination directory for generated files (default: current directory)
- `--include <pattern>`: Include files matching glob pattern (can be used multiple times)
- `--exclude <pattern>`: Exclude files matching glob pattern (can be used multiple times)
- `--generate-index`: Generate index.json files for directory navigation and metadata
- `--silent`: Suppress non-error output
- `--help, -h`: Show usage information
- `--version`: Show current version

## Behavior

### File Discovery

- Recursively scans the input directory for `.md`, `.mdx`, and `.html` files
- Excludes common artifacts: `.git`, `node_modules`, `dist`, `build`, `out`, `coverage`, `.next`, `.nuxt`, `.output`, `.vercel`, `.netlify`
- Supports include/exclude glob patterns for fine-grained file selection

#### Glob Pattern Examples

**Include patterns** (whitelist specific files):
```bash
# Include only markdown files
catalog --include "*.md"

# Include specific directories and file types
catalog --include "docs/*.md" --include "catalogs/*.html"

# Include files with specific naming patterns
catalog --include "*catalog*" --include "*tutorial*"
```

**Exclude patterns** (blacklist specific files):
```bash
# Exclude draft files
catalog --exclude "*.draft.md" --exclude "*draft*"

# Exclude temporary directories
catalog --exclude "temp/*" --exclude "backup/*"

# Exclude specific file patterns
catalog --exclude "**/*test*" --exclude "**/*.bak"
```

**Combining patterns**:
```bash
# Include all docs but exclude drafts
catalog --include "docs/**/*" --exclude "**/draft*"

# Process only markdown, exclude specific directories
catalog --include "*.md" --exclude "archive/*" --exclude "deprecated/*"
```

### Document Processing

- Strips YAML frontmatter from files (both Markdown and HTML)
- Orders documents intelligently:
  1. **Index/home files first**: `index.md`, `index.html`, `readme.md`, `readme.html`, `home.md`, `home.html` (prioritized by name)
  2. **Important documentation**: Files containing `doc`, `catalog`, `tutorial`, `intro`, `getting-started`, etc.
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

#### `index.json` Files (Directory Navigation)

When the `--generate-index` flag is used, Catalog generates comprehensive directory navigation files:

- **`index.json`** in each directory: Contains metadata for all files and subdirectories
- **`master-index.json`** at output root: Aggregates project-wide statistics and directory navigation

**Index JSON Structure:**
```json
{
  "directory": "path/to/directory",
  "generated": "2024-01-01T00:00:00Z",
  "files": [
    {
      "name": "file.md",
      "path": "relative/path/to/file.md",
      "size": 1234,
      "modified": "2024-01-01T00:00:00Z",
      "type": "md",
      "extension": ".md",
      "isMarkdown": true
    }
  ],
  "subdirectories": [
    {
      "name": "subdir",
      "path": "relative/path/to/subdir",
      "indexPath": "relative/path/to/subdir/index.json"
    }
  ],
  "summary": {
    "totalFiles": 5,
    "totalSubdirectories": 2,
    "markdownFiles": 3,
    "totalSize": 12543
  }
}
```

**Use Cases:**
- **LLM Integration**: Provides structured metadata for AI agents to navigate documentation
- **Dynamic Menu Generation**: Enable programmatic creation of navigation menus
- **File System Analysis**: Gather insights about documentation structure and content
- **API Integration**: Allow other tools to understand and interact with the documentation structure

## Example Output

For a directory structure like:

```
docs/
├── index.md
├── catalog/
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
- [catalog/getting-started.md](catalog/getting-started.md)

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

## catalog/getting-started.md

[Full content with YAML frontmatter stripped]

---

[... continues for all files]
```

**`index.json` (with `--generate-index`):**

```json
{
  "directory": ".",
  "generated": "2024-01-01T00:00:00Z",
  "files": [
    {
      "name": "index.md",
      "path": "index.md",
      "size": 1234,
      "modified": "2024-01-01T00:00:00Z",
      "type": "md",
      "extension": ".md",
      "isMarkdown": true
    },
    {
      "name": "misc.md", 
      "path": "misc.md",
      "size": 567,
      "modified": "2024-01-01T00:00:00Z",
      "type": "md",
      "extension": ".md",
      "isMarkdown": true
    }
  ],
  "subdirectories": [
    {
      "name": "catalog",
      "path": "catalog", 
      "indexPath": "catalog/index.json"
    },
    {
      "name": "api",
      "path": "api",
      "indexPath": "api/index.json"
    }
  ],
  "summary": {
    "totalFiles": 2,
    "totalSubdirectories": 2,
    "markdownFiles": 2,
    "totalSize": 1801
  }
}
```

## Architecture

Catalog follows SOLID design principles with a modular, extensible architecture:

### Core Components

- **`CatalogProcessor`**: Main orchestrator that coordinates the workflow
- **`DirectoryScanner`**: Handles file discovery and directory traversal
- **`MarkdownProcessor`**: Processes markdown content and applies document ordering
- **`OutputGenerator`**: Creates llms.txt output files
- **`IndexGenerator`**: Generates JSON navigation and metadata files

### Design Benefits

- **Single Responsibility**: Each class has a focused, well-defined purpose
- **Extensibility**: Easy to add new features or modify behavior
- **Testability**: Components can be tested in isolation
- **Maintainability**: Clear separation of concerns makes code easier to understand and modify

### Workflow

1. `CatalogProcessor` initializes and configures specialized components
2. `DirectoryScanner` discovers all markdown files in the input directory
3. `MarkdownProcessor` reads, cleans, and orders documents by importance
4. `OutputGenerator` creates the llms.txt and llms-full.txt files
5. `IndexGenerator` optionally creates JSON navigation metadata

For detailed technical specifications, see the [App Spec](docs/app-spec.md).

## Integration with `inform`

**Catalog** is designed to work seamlessly with [`inform`](https://github.com/fwdslsh/inform):

```bash
# Use inform to crawl a site into local docs
inform https://docs.example.com --output-dir docs

# Use catalog to generate LLMS artifacts from the crawled content
catalog --input docs --output build

# Generate with directory index files for navigation
catalog --input docs --output build --generate-index
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

## Release Automation

This project includes comprehensive release automation with:

- **Cross-platform binaries**: Linux, macOS, Windows (x86_64 and ARM64)
- **Automated releases**: GitHub releases with release notes
- **Docker images**: Multi-platform images published to Docker Hub
- **Installation script**: One-command installation from GitHub releases

For detailed information about the release process, binary builds, and deployment, see [RELEASE_AUTOMATION.md](docs/RELEASE_AUTOMATION.md).

## License

CC-BY-4.0
