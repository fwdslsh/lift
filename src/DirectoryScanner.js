import { readdir, stat } from "fs/promises";
import { join, relative } from "path";

/**
 * DirectoryScanner - Responsible for scanning directories and discovering files
 * Follows Single Responsibility Principle by focusing solely on file discovery
 */
export class DirectoryScanner {
  constructor(options = {}) {
    this.excludePatterns = options.excludePatterns || [
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
    ];
    this.isMarkdownFileFn = options.isMarkdownFileFn || this.defaultIsMarkdownFile.bind(this);
  }

  /**
   * Scan a directory for markdown files recursively
   */
  async scanDirectory(dir, basePath = null) {
    const base = basePath || dir;
    const files = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = relative(base, fullPath);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (this.shouldExclude(entry.name, relativePath)) {
            continue;
          }
          
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectory(fullPath, base);
          files.push(...subFiles);
          
        } else if (entry.isFile()) {
          // Include only markdown files
          if (this.isMarkdownFileFn(entry.name) && !this.shouldExclude(entry.name, relativePath)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to scan directory ${dir}: ${error.message}`);
    }
    
    return files;
  }

  /**
   * Validate that a path is a directory
   */
  async validateDirectory(path) {
    try {
      const stats = await stat(path);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${path}`);
      }
      return true;
    } catch (error) {
      throw new Error(`Invalid directory: ${error.message}`);
    }
  }

  /**
   * Check if a file or directory should be excluded
   */
  shouldExclude(name, relativePath) {
    const lowerName = name.toLowerCase();
    const lowerPath = relativePath.toLowerCase();
    
    return this.excludePatterns.some(pattern => 
      lowerName.includes(pattern.toLowerCase()) || 
      lowerPath.includes(pattern.toLowerCase())
    );
  }

  /**
   * Default implementation for checking if a file is markdown
   */
  defaultIsMarkdownFile(filename) {
    const lower = filename.toLowerCase();
    return lower.endsWith('.md') || lower.endsWith('.mdx');
  }
}