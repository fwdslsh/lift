#!/usr/bin/env bun

import { LiftProcessor } from './LiftProcessor.js';
import pkg from '../package.json';

function showHelp() {
  console.log(`
Lift - Generate llms.txt from a directory of markdown files

Usage:
  lift [options]

Options:
  --input, -i <path>     Source directory of Markdown files (default: current directory)
  --output, -o <path>    Destination directory for generated files (default: current directory)
  --silent               Suppress non-error output
  --help, -h             Show this help message
  --version              Show the current version

Examples:
  # Default (current directory)
  lift

  # Specify input and output directories
  lift --input docs --output build

  # Silent mode
  lift -i docs -o build --silent

Output:
  - llms.txt: Structured index with Core Documentation and Optional sections
  - llms-full.txt: Full concatenated content with headers and separators

The tool follows the LLMS standard for AI-friendly documentation format.
Document ordering: index/readme files first, then important docs (guides, tutorials), then remainder.
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  
  const options = {
    input: '.',
    output: '.',
    silent: false
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
        console.log(pkg.version);
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
        
      case '--silent':
        options.silent = true;
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
    
    const processor = new LiftProcessor(options.input, options.output, {
      silent: options.silent
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