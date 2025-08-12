# Lift Docker Image

A minimal Docker image for scanning Markdown and HTML documentation directories and generating:

- `llms.txt`: Structured index of docs
- `llms-full.txt`: Full concatenated content

## Usage

Run Lift in Docker:

```bash
docker run --rm -v $(pwd):/docs fwdslsh/lift:latest --input /docs --output /docs/build
```

### Common Options

- `--input, -i <path>`: Source directory of Markdown/HTML files (default: `/docs`)
- `--output, -o <path>`: Destination directory for generated files (default: `/docs`)
- `--include <pattern>`: Include files matching glob pattern
- `--exclude <pattern>`: Exclude files matching glob pattern
- `--generate-index`: Generate index.json files for navigation/metadata
- `--silent`: Suppress non-error output
- `--help, -h`: Show usage information
- `--version`: Show current version

## Example

```bash
docker run --rm -v $(pwd):/docs fwdslsh/lift:latest --input /docs --output /docs/build --generate-index
```

## Output Files

- `llms.txt`: Structured index for LLMs
- `llms-full.txt`: Full concatenated content
- `index.json` (optional): Directory navigation metadata

## Documentation

For full documentation and advanced usage, see:

- [GitHub Project](https://github.com/fwdslsh/lift)

---
This README is intended for DockerHub. For non-Docker installation and usage, see the main project README.
