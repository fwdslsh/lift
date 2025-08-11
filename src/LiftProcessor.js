import { resolve, basename } from "path";
import { DirectoryScanner } from "./DirectoryScanner.js";
import { MarkdownProcessor } from "./MarkdownProcessor.js";
import { OutputGenerator } from "./OutputGenerator.js";
import { IndexGenerator } from "./IndexGenerator.js";

/**
 * LiftProcessor - Main orchestrator for the Lift tool
 * Follows Single Responsibility Principle by delegating specific tasks to specialized classes
 */
export class LiftProcessor {
  constructor(inputDir = ".", outputDir = ".", options = {}) {
    this.inputDir = resolve(inputDir);
    this.outputDir = resolve(outputDir);
    this.silent = options.silent || false;
    this.generateIndex = options.generateIndex || false;
    
    // Initialize specialized components
    this.directoryScanner = new DirectoryScanner({
      excludePatterns: [
        "node_modules",
        ".git", 
        "dist",
        "build", 
        "out",
        "coverage",
        ".next",
        ".nuxt",
        ".output",
        ".vercel",
        ".netlify"
      ],
      includeGlobs: options.includeGlobs || [],
      excludeGlobs: options.excludeGlobs || []
    });
    
    this.markdownProcessor = new MarkdownProcessor(this.inputDir, {
      silent: this.silent
    });
    
    this.outputGenerator = new OutputGenerator(this.outputDir, {
      silent: this.silent
    });
    
    if (this.generateIndex) {
      this.indexGenerator = new IndexGenerator(this.inputDir, this.outputDir, {
        excludePatterns: this.directoryScanner.excludePatterns,
        shouldExcludeFn: this.directoryScanner.shouldExclude.bind(this.directoryScanner),
        isMarkdownFileFn: this.directoryScanner.defaultIsMarkdownFile.bind(this.directoryScanner)
      });
    }
  }

  log(...args) {
    if (!this.silent) {
      console.log(...args);
    }
  }

  async process() {
    try {
      // Validate input directory
      await this.directoryScanner.validateDirectory(this.inputDir);

      // Scan for markdown files
      const files = await this.directoryScanner.scanDirectory(this.inputDir);
      
      if (files.length === 0) {
        this.log("No markdown files found.");
        return;
      }

      this.log(`Scanned input: ${basename(this.inputDir)} (${files.length} files)`);

      // Read and process files
      const documents = await this.markdownProcessor.processFiles(files);
      
      // Order documents according to heuristics
      const orderedDocs = this.markdownProcessor.orderDocuments(documents);
      
      // Generate outputs
      const projectName = basename(this.inputDir);
      await this.outputGenerator.generateOutputs(projectName, orderedDocs);
      
      // Generate index.json files if requested
      if (this.generateIndex) {
        this.log('Generating index.json files...');
        await this.indexGenerator.generateAll();
        this.log('✔ index.json files generated');
      }

    } catch (error) {
      throw new Error(`Processing failed: ${error.message}`);
    }
  }
}