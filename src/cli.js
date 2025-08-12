#!/usr/bin/env bun

import { GuideProcessor } from './GuideProcessor.js';

// Version is embedded at build time or taken from package.json in development
const VERSION = process.env.GUIDE_VERSION || '0.0.1';

function showHelp() {
  console.log(`
Guide - Generate llms.txt from a directory of markdown and HTML files

Usage:
  guide [options]

Options:
  --input, -i <path>     Source directory of Markdown/HTML files (default: current directory)
  --output, -o <path>    Destination directory for generated files (default: current directory)
  --include <pattern>    Include files matching glob pattern (can be used multiple times)
  --exclude <pattern>    Exclude files matching glob pattern (can be used multiple times)
  --generate-index       Generate index.json files for directory navigation and metadata
  --silent               Suppress non-error output
  --help, -h             Show this help message
  --version              Show the current version

Examples:
  # Default (current directory)
  guide

  # Specify input and output directories
  guide --input docs --output build

  # Include only specific patterns
  guide --include "*.md" --include "guide/*.html"

  # Exclude specific patterns
  guide --exclude "*.draft.md" --exclude "temp/*"

  # Combine include/exclude with other options
  guide -i docs -o build --include "*.md" --exclude "draft/*" --generate-index

  # Silent mode
  guide -i docs -o build --silent

File Types:
  - Markdown files (.md, .mdx)
  - HTML files (.html)

Output:
  - llms.txt: Structured index with Core Documentation and Optional sections
  - llms-full.txt: Full concatenated content with headers and separators
  - index.json: Directory navigation and file metadata (with --generate-index)

The tool follows the LLMS standard for AI-friendly documentation format.
Document ordering: index/readme files first, then important docs (guides, tutorials), then remainder.
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  
  const options = {
    input: '.',
    output: '.',
    silent: false,
    generateIndex: false,
    includeGlobs: [],
    excludeGlobs: []
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
        
      case '--version':
        console.log(VERSION);
        process.exit(0);
        break;
        
      case '--input':
      case '-i':
        if (!nextArg || nextArg.startsWith('-')) {
          console.error('Error: --input requires a path argument');
          process.exit(1);
        }
        options.input = nextArg;
        i++; // Skip next argument
        break;
        
      case '--output':
      case '-o':
        if (!nextArg || nextArg.startsWith('-')) {
          console.error('Error: --output requires a path argument');
          process.exit(1);
        }
        options.output = nextArg;
        i++; // Skip next argument
        break;
        
      case '--include':
        if (!nextArg || nextArg.startsWith('-')) {
          console.error('Error: --include requires a glob pattern argument');
          process.exit(1);
        }
        options.includeGlobs.push(nextArg);
        i++; // Skip next argument
        break;
        
      case '--exclude':
        if (!nextArg || nextArg.startsWith('-')) {
          console.error('Error: --exclude requires a glob pattern argument');
          process.exit(1);
        }
        options.excludeGlobs.push(nextArg);
        i++; // Skip next argument
        break;
        
      case '--silent':
        options.silent = true;
        break;
        
      case '--generate-index':
        options.generateIndex = true;
        break;
        
      default:
        if (arg.startsWith('-')) {
          console.error(`Error: Unknown option ${arg}`);
          console.error('Use --help to see available options');
          process.exit(1);
        }
        break;
    }
  }
  
  return options;
}

async function main() {
  try {
    const options = parseArgs();
    
    const processor = new GuideProcessor(options.input, options.output, {
      silent: options.silent,
      generateIndex: options.generateIndex,
      includeGlobs: options.includeGlobs,
      excludeGlobs: options.excludeGlobs
    });
    
    await processor.process();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the CLI
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});