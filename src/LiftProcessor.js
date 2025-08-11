import { readdir, readFile, writeFile, stat, mkdir } from "fs/promises";
import { join, relative, basename, resolve } from "path";

export class LiftProcessor {
  constructor(inputDir = ".", outputDir = ".", options = {}) {
    this.inputDir = resolve(inputDir);
    this.outputDir = resolve(outputDir);
    this.silent = options.silent || false;
    this.generateIndex = options.generateIndex || false;
    
    // Default exclusions
    this.excludePatterns = [
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
  }

  log(...args) {
    if (!this.silent) {
      console.log(...args);
    }
  }

  async process() {
    try {
      // Validate input directory
      const inputStat = await stat(this.inputDir);
      if (!inputStat.isDirectory()) {
        throw new Error(`Input path is not a directory: ${this.inputDir}`);
      }

      // Scan for markdown files
      const files = await this.scanDirectory(this.inputDir);
      
      if (files.length === 0) {
        this.log("No markdown files found.");
        return;
      }

      this.log(`Scanned input: ${basename(this.inputDir)} (${files.length} files)`);

      // Read and process files
      const documents = await this.processFiles(files);
      
      // Order documents according to heuristics
      const orderedDocs = this.orderDocuments(documents);
      
      // Generate outputs
      await this.generateOutputs(orderedDocs);
      
      // Generate index.json files if requested
      if (this.generateIndex) {
        await this.generateIndexFiles();
      }

    } catch (error) {
      throw new Error(`Processing failed: ${error.message}`);
    }
  }

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
          if (this.isMarkdownFile(entry.name) && !this.shouldExclude(entry.name, relativePath)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to scan directory ${dir}: ${error.message}`);
    }
    
    return files;
  }

  isMarkdownFile(filename) {
    const lower = filename.toLowerCase();
    return lower.endsWith('.md') || lower.endsWith('.mdx');
  }

  shouldExclude(name, relativePath) {
    const lowerName = name.toLowerCase();
    const lowerPath = relativePath.toLowerCase();
    
    return this.excludePatterns.some(pattern => 
      lowerName.includes(pattern.toLowerCase()) || 
      lowerPath.includes(pattern.toLowerCase())
    );
  }

  async processFiles(filePaths) {
    const documents = [];
    
    for (const filePath of filePaths) {
      try {
        const content = await readFile(filePath, 'utf8');
        const relativePath = relative(this.inputDir, filePath);
        const cleanContent = this.stripFrontmatter(content).trim();
        
        documents.push({
          relativePath: relativePath.replace(/\\/g, '/'), // Normalize path separators
          content: cleanContent,
          fullPath: filePath
        });
      } catch (error) {
        this.log(`Warning: Failed to read ${filePath}: ${error.message}`);
      }
    }
    
    return documents;
  }

  stripFrontmatter(content) {
    // Remove YAML frontmatter (--- at start, content, --- delimiter)
    return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/m, '');
  }

  orderDocuments(documents) {
    // Separate documents by importance
    const indexDocs = [];
    const importantDocs = [];
    const otherDocs = [];
    
    for (const doc of documents) {
      if (this.isIndexDocument(doc.relativePath)) {
        indexDocs.push(doc);
      } else if (this.isImportantDocument(doc.relativePath)) {
        importantDocs.push(doc);
      } else {
        otherDocs.push(doc);
      }
    }
    
    // Sort each category
    indexDocs.sort((a, b) => this.getIndexPriority(a.relativePath) - this.getIndexPriority(b.relativePath));
    importantDocs.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    otherDocs.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    
    return {
      index: indexDocs,
      important: importantDocs,
      other: otherDocs,
      all: [...indexDocs, ...importantDocs, ...otherDocs]
    };
  }

  isIndexDocument(path) {
    const lower = path.toLowerCase();
    const filename = basename(path).toLowerCase();
    
    return (
      filename === 'index.md' ||
      filename === 'index.mdx' ||
      filename === 'readme.md' ||
      filename === 'readme.mdx' ||
      filename === 'home.md' ||
      filename === 'home.mdx' ||
      lower.includes('/index.') ||
      lower.includes('/readme.') ||
      lower.includes('/home.')
    );
  }

  isImportantDocument(path) {
    const lower = path.toLowerCase();
    const importantPatterns = [
      'doc', 'docs', 'guide', 'guides', 'tutorial', 'tutorials',
      'intro', 'introduction', 'getting-started', 'get-started',
      'quickstart', 'quick-start', 'start'
    ];
    
    return importantPatterns.some(pattern => lower.includes(pattern));
  }

  getIndexPriority(path) {
    const lower = path.toLowerCase();
    const filename = basename(path).toLowerCase();
    
    // Priority: exact index/readme at root, then others
    if (filename === 'index.md' || filename === 'index.mdx') return 1;
    if (filename === 'readme.md' || filename === 'readme.mdx') return 2;
    if (filename === 'home.md' || filename === 'home.mdx') return 3;
    return 4;
  }

  async generateOutputs(orderedDocs) {
    const projectName = basename(this.inputDir);
    
    // Ensure output directory exists
    try {
      await mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
    
    // Generate llms.txt (structured index)
    const llmsContent = this.generateLlmsIndex(projectName, orderedDocs);
    
    // Generate llms-full.txt (full content)
    const llmsFullContent = this.generateLlmsFull(projectName, orderedDocs.all);
    
    // Write files
    const llmsPath = join(this.outputDir, 'llms.txt');
    const llmsFullPath = join(this.outputDir, 'llms-full.txt');
    
    await writeFile(llmsPath, llmsContent, 'utf8');
    await writeFile(llmsFullPath, llmsFullContent, 'utf8');
    
    this.log(`Writing to: ${this.outputDir}`);
    this.log(`✔ llms.txt (${this.formatSize(llmsContent.length)})`);
    this.log(`✔ llms-full.txt (${this.formatSize(llmsFullContent.length)})`);
  }

  generateLlmsIndex(projectName, orderedDocs) {
    let content = `# ${projectName}\n\n`;
    content += `> Documentation for ${projectName}\n\n`;
    
    // Core Documentation section
    const coreDocuments = [...orderedDocs.index, ...orderedDocs.important];
    if (coreDocuments.length > 0) {
      content += `## Core Documentation\n`;
      for (const doc of coreDocuments) {
        content += `- [${doc.relativePath}](${doc.relativePath})\n`;
      }
      content += `\n`;
    }
    
    // Optional section
    if (orderedDocs.other.length > 0) {
      content += `## Optional\n`;
      for (const doc of orderedDocs.other) {
        content += `- [${doc.relativePath}](${doc.relativePath})\n`;
      }
      content += `\n`;
    }
    
    return content;
  }

  generateLlmsFull(projectName, documents) {
    let content = `# ${projectName}\n\n`;
    content += `> Documentation for ${projectName}\n\n`;
    
    for (const doc of documents) {
      content += `## ${doc.relativePath}\n\n`;
      content += `${doc.content}\n\n`;
      content += `---\n\n`;
    }
    
    return content;
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async generateIndexFiles() {
    this.log('Generating index.json files...');
    
    // Generate index files for each directory
    await this.generateDirectoryIndex(this.inputDir, this.outputDir);
    
    // Generate master index.json at the output root
    await this.generateMasterIndex();
    
    this.log('✔ index.json files generated');
  }

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
          if (this.shouldExclude(entry.name, entryRelativePath)) {
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
          if (this.shouldExclude(entry.name, entryRelativePath)) {
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
            isMarkdown: this.isMarkdownFile(entry.name)
          });
        }
      }
      
      // Create index.json content
      const indexContent = {
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
      
      // Write index.json
      const indexPath = join(outputDir, 'index.json');
      await writeFile(indexPath, JSON.stringify(indexContent, null, 2), 'utf8');
      
    } catch (error) {
      throw new Error(`Failed to generate index for ${inputDir}: ${error.message}`);
    }
  }

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

  getFileExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
  }
}