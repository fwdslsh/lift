import { readdir, readFile, writeFile, stat, mkdir } from "fs/promises";
import { join, relative, basename } from "path";

/**
 * IndexGenerator - Responsible for generating index.json files for directory navigation and metadata
 * Follows Single Responsibility Principle by focusing solely on index file generation
 */
export class IndexGenerator {
  constructor(inputDir, outputDir, options = {}) {
    this.inputDir = inputDir;
    this.outputDir = outputDir;
    this.excludePatterns = options.excludePatterns || [];
    this.shouldExcludeFn = options.shouldExcludeFn || this.defaultShouldExclude.bind(this);
    this.isMarkdownFileFn = options.isMarkdownFileFn || this.defaultIsMarkdownFile.bind(this);
  }

  /**
   * Generate all index.json files for the directory structure
   */
  async generateAll() {
    // Generate index files for each directory
    await this.generateDirectoryIndex(this.inputDir, this.outputDir);
    
    // Generate master index.json at the output root
    await this.generateMasterIndex();
  }

  /**
   * Generate index.json for a specific directory and recursively for subdirectories
   */
  async generateDirectoryIndex(inputDir, outputDir, relativePath = '') {
    try {
      // Ensure output directory exists
      await mkdir(outputDir, { recursive: true });
      
      // Get directory contents
      const entries = await readdir(inputDir, { withFileTypes: true });
      
      const files = [];
      const subdirectories = [];
      
      for (const entry of entries) {
        const entryPath = join(inputDir, entry.name);
        const entryRelativePath = join(relativePath, entry.name).replace(/\\/g, '/');
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (this.shouldExcludeFn(entry.name, entryRelativePath)) {
            continue;
          }
          
          // Process subdirectory
          const subOutputDir = join(outputDir, entry.name);
          await this.generateDirectoryIndex(entryPath, subOutputDir, entryRelativePath);
          
          subdirectories.push({
            name: entry.name,
            path: entryRelativePath,
            indexPath: join(entryRelativePath, 'index.json').replace(/\\/g, '/')
          });
          
        } else if (entry.isFile()) {
          // Skip excluded files
          if (this.shouldExcludeFn(entry.name, entryRelativePath)) {
            continue;
          }
          
          // Get file metadata
          const stats = await stat(entryPath);
          const extension = this.getFileExtension(entry.name);
          
          files.push({
            name: entry.name,
            path: entryRelativePath,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            type: extension.slice(1), // Remove the dot
            extension: extension,
            isMarkdown: this.isMarkdownFileFn(entry.name)
          });
        }
      }
      
      // Create index.json content
      const indexContent = this.createIndexContent(relativePath, files, subdirectories);
      
      // Write index.json
      const indexPath = join(outputDir, 'index.json');
      await writeFile(indexPath, JSON.stringify(indexContent, null, 2), 'utf8');
      
    } catch (error) {
      throw new Error(`Failed to generate index for ${inputDir}: ${error.message}`);
    }
  }

  /**
   * Generate master index.json at the output root
   */
  async generateMasterIndex() {
    try {
      // Collect all index.json files
      const allIndexes = await this.collectAllIndexes(this.outputDir);
      
      const masterIndex = {
        project: basename(this.inputDir),
        generated: new Date().toISOString(),
        totalDirectories: allIndexes.length,
        totalFiles: allIndexes.reduce((sum, idx) => sum + idx.content.summary.totalFiles, 0),
        totalMarkdownFiles: allIndexes.reduce((sum, idx) => sum + idx.content.summary.markdownFiles, 0),
        totalSize: allIndexes.reduce((sum, idx) => sum + idx.content.summary.totalSize, 0),
        directories: allIndexes.map(idx => ({
          path: idx.relativePath,
          indexPath: join(idx.relativePath, 'index.json').replace(/\\/g, '/'),
          summary: idx.content.summary
        }))
      };
      
      // Write master index
      const masterIndexPath = join(this.outputDir, 'master-index.json');
      await writeFile(masterIndexPath, JSON.stringify(masterIndex, null, 2), 'utf8');
      
    } catch (error) {
      throw new Error(`Failed to generate master index: ${error.message}`);
    }
  }

  /**
   * Create the content structure for an index.json file
   */
  createIndexContent(relativePath, files, subdirectories) {
    return {
      directory: relativePath || '.',
      generated: new Date().toISOString(),
      files: files.sort((a, b) => a.name.localeCompare(b.name)),
      subdirectories: subdirectories.sort((a, b) => a.name.localeCompare(b.name)),
      summary: {
        totalFiles: files.length,
        totalSubdirectories: subdirectories.length,
        markdownFiles: files.filter(f => f.isMarkdown).length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0)
      }
    };
  }

  /**
   * Recursively collect all index.json files from the output directory
   */
  async collectAllIndexes(dir, basePath = null, collected = []) {
    const base = basePath || dir;
    
    try {
      // Check if index.json exists in current directory
      const indexPath = join(dir, 'index.json');
      try {
        const indexContent = JSON.parse(await readFile(indexPath, 'utf8'));
        const relativePath = relative(base, dir).replace(/\\/g, '/') || '.';
        collected.push({
          relativePath,
          content: indexContent
        });
      } catch (error) {
        // index.json doesn't exist in this directory, skip
      }
      
      // Recursively collect from subdirectories
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== '.' && entry.name !== '..') {
          const subDir = join(dir, entry.name);
          await this.collectAllIndexes(subDir, base, collected);
        }
      }
      
    } catch (error) {
      // Directory might not exist or be accessible, skip
    }
    
    return collected;
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
  }

  /**
   * Default implementation for checking if a file should be excluded
   */
  defaultShouldExclude(name, relativePath) {
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