# Guide CLI Tool - Complete Application Specification

> Guide is a lightweight, efficient CLI tool designed to scan Markdown and HTML directories and generate llms.txt (structured index) and llms-full.txt (full concatenated content) files. Additionally, it can generate index.json files for directory navigation and metadata collection. The tool supports flexible file filtering through include/exclude glob patterns and is designed for seamless integration with AI systems, documentation workflows, and the fwdslsh ecosystem following the philosophy of minimal, readable, composable tools.

Guide transforms source Markdown files with YAML frontmatter into structured, AI-friendly documentation formats while optionally generating comprehensive navigation metadata, making it the perfect companion tool to [`inform`](https://github.com/fwdslsh/inform) for creating complete documentation workflows.

## Target Users

- **AI Engineers and LLM Developers** who need structured documentation for training or inference
- **Documentation Teams** who want to generate comprehensive, navigable indexes of their content
- **Content Creators** who maintain large Markdown documentation sets
- **Developers** integrating with documentation toolchains requiring programmatic navigation
- **Technical Writers** who need to generate consolidated documentation views

## Core Features

- **Recursive Markdown and HTML Scanning**: Discovers `.md`, `.mdx`, and `.html` files across directory structures
- **Flexible File Filtering**: Include/exclude glob patterns for precise file selection
- **YAML Frontmatter Stripping**: Cleanses content for consistent processing
- **Intelligent Document Ordering**: Prioritizes index/readme files, important documentation, then alphabetical order
- **Dual Output Generation**: Creates both structured index and full content files
- **Optional Directory Navigation**: Generates JSON metadata for programmatic navigation
- **Configurable Exclusion Patterns**: Automatically excludes common build artifacts and dependencies
- **Relative Link Preservation**: Maintains proper markdown linking in outputs
- **Project-wide Metadata Collection**: Aggregates statistics and file information
- **Silent Mode Operation**: Supports automated workflows with minimal output
- **Cross-platform Compatibility**: Works on Windows, macOS, and Linux

## Command Line Interface

### Application Name

`guide`

### Main Command

#### `guide` (Default Command)

Processes Markdown files and generates outputs.

**Syntax:**

```bash
guide [options]
```

**Workflow:**

1. Validates source directory exists and is accessible
2. Recursively scans for `.md`, `.mdx`, and `.html` files while respecting exclusion patterns and include/exclude globs
3. Reads and processes files, stripping YAML frontmatter
4. Orders documents using importance heuristics (index → important → alphabetical)
5. Generates `llms.txt` (structured index) and `llms-full.txt` (full content)
6. Optionally generates `index.json` files for directory navigation (with `--generate-index`)
7. Reports processing summary with file counts and output sizes

**Expected Output:**

- `llms.txt`: Structured index with Core Documentation and Optional sections
- `llms-full.txt`: Full concatenated content with headers and section separators
- `index.json`: Directory-specific navigation metadata (optional)
- `master-index.json`: Project-wide navigation summary (optional)
- Console summary with file counts and processing statistics
- Exit code 0 on success, 1 on recoverable errors, 2 on fatal errors

### Command Line Options

#### Directory Options

**`--input, -i <directory>`**

- **Purpose:** Specify source directory containing Markdown and HTML files
- **Default:** `.` (current directory)
- **Validation:** Must be existing, readable directory
- **Behavior:** Recursively scanned for `.md`, `.mdx`, and `.html` files

**`--output, -o <directory>`**

- **Purpose:** Specify destination directory for generated files
- **Default:** `.` (current directory)
- **Validation:** Must be in a writable location
- **Behavior:** Created if doesn't exist, files overwritten if present

#### Feature Options

**`--include <pattern>`**

- **Purpose:** Include files matching glob pattern (can be used multiple times)
- **Default:** All supported files included
- **Pattern Format:** Standard glob patterns (e.g., `*.md`, `docs/**/*.html`, `*guide*`)
- **Behavior:** Only files matching at least one include pattern are processed
- **Examples:** `--include "*.md"`, `--include "docs/*.html"`, `--include "**/guide*"`

**`--exclude <pattern>`**

- **Purpose:** Exclude files matching glob pattern (can be used multiple times)
- **Default:** Standard exclusion patterns applied (node_modules, .git, etc.)
- **Pattern Format:** Standard glob patterns (e.g., `draft*`, `temp/*`, `**/*test*`)
- **Behavior:** Files matching any exclude pattern are skipped
- **Examples:** `--exclude "*.draft.md"`, `--exclude "temp/*"`, `--exclude "**/backup/**"`

**`--generate-index`**

- **Purpose:** Enable generation of `index.json` navigation files
- **Default:** `false` (disabled)
- **Effect:** Creates directory-specific `index.json` files and project-wide `master-index.json`
- **Use Cases:** LLM integration, dynamic menu generation, programmatic navigation

#### Operational Options

**`--silent`**

- **Purpose:** Suppress non-error output for automated workflows
- **Default:** `false` (verbose output enabled)
- **Effect:** Only errors and warnings are displayed

**`--help, -h`**

- **Purpose:** Display comprehensive usage information
- **Effect:** Shows syntax, options, examples, and exits with code 0

**`--version`**

- **Purpose:** Display current version number
- **Effect:** Shows version string and exits with code 0

### Examples

#### Basic Usage

```bash
# Process current directory
guide

# Specify input and output directories
guide --input docs --output build

# Generate with navigation metadata
guide --input docs --output build --generate-index

# Silent operation for automation
guide -i docs -o build --silent
```

#### File Filtering Examples

```bash
# Include only markdown files
guide --include "*.md"

# Include specific directories and file types
guide --include "docs/*.md" --include "guides/*.html"

# Exclude draft and temporary files
guide --exclude "*.draft.md" --exclude "temp/*"

# Combine include/exclude patterns
guide --include "docs/**/*" --exclude "**/draft*" --exclude "**/temp*"

# Process only guides and tutorials
guide --include "*guide*" --include "*tutorial*"
```

#### Advanced Workflows

```bash
# Documentation pipeline with filtering
guide --input documentation --output dist --include "*.md" --exclude "archive/*" --generate-index

# AI training data preparation
guide --input knowledge-base --output training-data --exclude "**/private/**" --silent

# Multi-format processing
guide --include "*.md" --include "*.html" --exclude "draft*" --output processed

# Multi-project processing
for dir in project1 project2 project3; do
  guide --input "$dir/docs" --output "output/$dir" --generate-index
done
```

## Architecture

### SOLID Design Principles

The application follows SOLID design principles with clear separation of concerns:

#### Single Responsibility Principle (SRP)

- **`GuideProcessor`**: Main orchestrator coordinating workflow
- **`DirectoryScanner`**: File discovery and directory traversal
- **`MarkdownProcessor`**: Content processing and document ordering
- **`OutputGenerator`**: llms.txt file generation
- **`IndexGenerator`**: JSON metadata file creation

#### Open/Closed Principle

- Classes are open for extension through dependency injection
- Closed for modification through well-defined interfaces
- Customizable exclusion patterns and processing functions

#### Dependency Inversion

- High-level modules depend on abstractions
- File system operations abstracted for testability
- Configurable functions for markdown detection and exclusion logic

### Core Classes

#### `GuideProcessor`

**Purpose:** Main orchestrator that coordinates the entire workflow

**Responsibilities:**
- Initialize and configure specialized components
- Coordinate workflow execution
- Handle top-level error management
- Provide unified interface for CLI

**Key Methods:**
- `process()`: Execute complete workflow
- Constructor accepts input/output directories and options

#### `DirectoryScanner`

**Purpose:** Discover and filter files in directory structures

**Responsibilities:**
- Recursive directory traversal
- File type detection (markdown vs. other)
- Exclusion pattern matching
- Directory validation

**Key Methods:**
- `scanDirectory(dir)`: Recursively find markdown files
- `validateDirectory(path)`: Ensure directory exists and is readable
- `shouldExclude(name, path)`: Apply exclusion rules

#### `MarkdownProcessor`

**Purpose:** Process markdown content and apply ordering logic

**Responsibilities:**
- Read and parse markdown files
- Strip YAML frontmatter
- Apply document importance heuristics
- Order documents for optimal presentation

**Key Methods:**
- `processFiles(filePaths)`: Read and clean markdown content
- `orderDocuments(documents)`: Apply importance-based ordering
- `stripFrontmatter(content)`: Remove YAML headers

#### `OutputGenerator`

**Purpose:** Generate llms.txt output files

**Responsibilities:**
- Create structured index format
- Generate full content concatenation
- Format content with appropriate headers and separators
- File size calculation and reporting

**Key Methods:**
- `generateOutputs(projectName, orderedDocs)`: Create both output files
- `generateLlmsIndex()`: Create structured index
- `generateLlmsFull()`: Create full content file

#### `IndexGenerator`

**Purpose:** Generate JSON navigation and metadata files

**Responsibilities:**
- Directory metadata collection
- File statistics aggregation
- JSON structure creation
- Master index compilation

**Key Methods:**
- `generateAll()`: Create all index files
- `generateDirectoryIndex()`: Create directory-specific index
- `generateMasterIndex()`: Create project-wide summary

### Data Flow

1. **Initialization**: `GuideProcessor` creates and configures specialized components
2. **Discovery**: `DirectoryScanner` finds all markdown files
3. **Processing**: `MarkdownProcessor` reads, cleans, and orders documents
4. **Output Generation**: `OutputGenerator` creates llms.txt files
5. **Optional Indexing**: `IndexGenerator` creates navigation metadata (if enabled)

### File Formats

#### llms.txt Structure

```markdown
# ProjectName

> Documentation for ProjectName

## Core Documentation
- [index.md](index.md)
- [guide.md](guide.md)

## Optional
- [misc.md](misc.md)
```

#### llms-full.txt Structure

```markdown
# ProjectName

> Documentation for ProjectName

## index.md

[content with frontmatter stripped]

---

## guide.md

[content with frontmatter stripped]

---
```

#### index.json Structure

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
    }
  ],
  "subdirectories": [
    {
      "name": "guides",
      "path": "guides",
      "indexPath": "guides/index.json"
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

## Document Ordering Logic

### Importance Categories

1. **Index Documents** (Highest Priority)
   - `index.md`, `index.mdx`
   - `readme.md`, `readme.mdx`
   - `home.md`, `home.mdx`
   - Files in subdirectories matching these patterns

2. **Important Documents** (Medium Priority)
   - Files containing: `doc`, `docs`, `guide`, `guides`
   - `tutorial`, `tutorials`, `intro`, `introduction`
   - `getting-started`, `get-started`, `quickstart`, `quick-start`, `start`

3. **Other Documents** (Standard Priority)
   - All remaining markdown files in alphabetical order

### Priority Rules

- Within index documents: exact matches first, then alphabetical
- Important and other documents: alphabetical within category
- Directory structure preserved in relative paths

## Exclusion Patterns

### Default Exclusions

- `node_modules` - Node.js dependencies
- `.git` - Git repository data
- `dist`, `build`, `out` - Build outputs
- `coverage` - Test coverage reports
- `.next`, `.nuxt`, `.output` - Framework outputs
- `.vercel`, `.netlify` - Deployment artifacts

### Exclusion Logic

- Case-insensitive pattern matching
- Applies to both directory and file names
- Matches partial strings within paths
- Prevents traversal into excluded directories

## Error Handling

### Error Categories

#### Fatal Errors (Exit Code 2)

- Input directory doesn't exist or isn't readable
- Output directory creation fails
- Insufficient permissions for file operations

#### Recoverable Errors (Exit Code 1)

- Individual file read failures (logged, processing continues)
- Malformed JSON during index generation
- Network issues in distributed environments

#### Warnings (No Exit)

- Files that can't be read (permissions, corruption)
- Unexpectedly large files that may impact performance
- Unusual directory structures

### Error Messages

- Clear, actionable error descriptions
- Full file paths for context
- Suggested solutions where applicable
- Proper logging levels (error, warn, info)

## Performance Requirements

### Processing Performance

- Handle projects with 1000+ markdown files
- Process individual files up to 10MB efficiently
- Complete typical documentation projects (<100 files) in <5 seconds
- Memory usage remains <200MB for large projects

### File System Performance

- Efficient recursive directory traversal
- Minimal file system calls through batched operations
- Streaming file reads for large documents
- Concurrent processing where safe

### Scalability Targets

- Support documentation sets up to 10GB total size
- Handle deep directory structures (>20 levels)
- Process files with extensive frontmatter efficiently
- Maintain responsiveness with large binary exclusions

## Integration Requirements

### fwdslsh Ecosystem

- Compatible with `inform` for documentation crawling
- Follows fwdslsh philosophy of minimal, composable tools
- Outputs suitable for direct consumption by AI systems
- Maintains relative linking for web publishing

### External Integrations

#### AI/LLM Systems

- llms.txt format optimized for context windows
- Structured metadata enables intelligent document selection
- Clean content without formatting artifacts
- Consistent document ordering for training data

#### Build Pipelines

- Exit codes suitable for CI/CD integration
- Silent mode for automated processing
- Deterministic output for reproducible builds
- Fast incremental processing capabilities

#### Documentation Workflows

- Preserves markdown linking and structure
- Maintains relative paths for portability
- Compatible with static site generators
- Supports documentation versioning workflows

## Runtime Requirements

### Bun Runtime

- **Minimum Version:** Bun 1.0.0
- **Recommended:** Latest stable Bun release
- **ESM Modules:** Pure ES module implementation
- **Built-in APIs:** Leverages Bun's fast file system operations

### Node.js Compatibility

- **Minimum Version:** Node.js 18.0.0 (with --experimental-modules)
- **Recommended:** Node.js 20.0.0+
- **Import Requirements:** JSON imports require proper syntax
- **Performance:** Optimal with Bun, functional with Node.js

### Cross-Platform Support

- **Windows:** Full support with proper path handling
- **macOS:** Native support with all features
- **Linux:** Optimized performance on Unix systems
- **Path Handling:** Normalized for cross-platform compatibility

## Testing Requirements

### Unit Testing

- Individual class testing with dependency injection
- Mock file system operations for deterministic tests
- Comprehensive error condition coverage
- Performance regression testing

### Integration Testing

- End-to-end CLI workflow testing
- Real file system integration tests
- Cross-platform compatibility validation
- Large dataset processing verification

### Test Coverage

- Minimum 85% line coverage for core functionality
- 100% coverage for critical path operations
- Edge case testing for file system errors
- Performance benchmarking for regression detection

## Security Requirements

### Path Safety

- Prevention of directory traversal attacks
- Validation of all file path inputs
- Restriction to specified input directories
- Safe handling of symbolic links

### File System Security

- Read-only access to input directories
- Controlled write access to output directories
- Proper permission validation before operations
- Safe handling of large files to prevent DoS

### Input Validation

- Sanitization of command line arguments
- Validation of directory paths
- Safe parsing of markdown content
- Protection against malformed frontmatter

## Success Criteria

### Functional Requirements

- **Core Processing:** Successfully processes markdown files and generates outputs
- **Document Ordering:** Correctly prioritizes index, important, and other documents
- **Index Generation:** Creates valid JSON navigation metadata when enabled
- **Error Handling:** Graceful degradation with informative error messages
- **Cross-platform:** Consistent behavior across Windows, macOS, and Linux

### Performance Requirements

- **Processing Speed:** Completes typical projects (<100 files) in <5 seconds
- **Memory Efficiency:** Uses <200MB for large projects (1000+ files)
- **File Size Support:** Handles individual files up to 10MB
- **Scalability:** Processes documentation sets up to 10GB total size

### Usability Requirements

- **Zero Configuration:** Works with sensible defaults out of the box
- **Clear Documentation:** Comprehensive help and usage examples
- **Intuitive CLI:** Logical option names and clear error messages
- **Silent Mode:** Supports automation without verbose output

### Reliability Requirements

- **Error Recovery:** Continues processing when individual files fail
- **Consistent Output:** Deterministic results for identical inputs
- **Resource Management:** Proper cleanup of temporary resources
- **Graceful Shutdown:** Handles interruption signals appropriately

### Integration Requirements

- **fwdslsh Ecosystem:** Seamless integration with companion tools
- **AI Systems:** Outputs optimized for LLM consumption
- **Build Pipelines:** Suitable exit codes and output for CI/CD
- **Documentation Workflows:** Preserves linking and maintains structure

## Future Extensibility

### Plugin Architecture

- Configurable document processors for different formats
- Custom ordering algorithms through dependency injection
- Extensible exclusion pattern systems
- Pluggable output format generators

### Format Support

- Additional markdown variants (CommonMark, GitHub Flavored)
- Support for other documentation formats (AsciiDoc, reStructuredText)
- Custom frontmatter processors
- Binary asset handling and indexing

### Advanced Features

- Incremental processing with change detection
- Parallel processing for improved performance
- Network-based input sources
- Integration with version control systems
- Real-time documentation monitoring