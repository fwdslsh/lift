import { readFile } from "fs/promises";
import { relative, basename } from "path";

/**
 * DocumentProcessor - Responsible for processing markdown and HTML files and content
 * Follows Single Responsibility Principle by focusing solely on document processing
 */
export class MarkdownProcessor {
  constructor(inputDir, options = {}) {
    this.inputDir = inputDir;
    this.silent = options.silent || false;
  }

  /**
   * Process a list of file paths into document objects
   */
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

  /**
   * Strip YAML frontmatter from content (works for both markdown and HTML with frontmatter)
   */
  stripFrontmatter(content) {
    // Remove YAML frontmatter (--- at start, content, --- delimiter)
    return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/m, '');
  }

  /**
   * Order documents according to importance heuristics
   */
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

  /**
   * Check if a document is an index document (readme, index, home)
   */
  isIndexDocument(path) {
    const lower = path.toLowerCase();
    const filename = basename(path).toLowerCase();
    
    return (
      filename === 'index.md' ||
      filename === 'index.mdx' ||
      filename === 'index.html' ||
      filename === 'readme.md' ||
      filename === 'readme.mdx' ||
      filename === 'readme.html' ||
      filename === 'home.md' ||
      filename === 'home.mdx' ||
      filename === 'home.html' ||
      lower.includes('/index.') ||
      lower.includes('/readme.') ||
      lower.includes('/home.')
    );
  }

  /**
   * Check if a document is important (guides, tutorials, docs)
   */
  isImportantDocument(path) {
    const lower = path.toLowerCase();
    const importantPatterns = [
      'doc', 'docs', 'catalog', 'catalogs', 'tutorial', 'tutorials',
      'intro', 'introduction', 'getting-started', 'get-started',
      'quickstart', 'quick-start', 'start'
    ];
    
    return importantPatterns.some(pattern => lower.includes(pattern));
  }

  /**
   * Get priority for index documents (lower number = higher priority)
   */
  getIndexPriority(path) {
    const lower = path.toLowerCase();
    const filename = basename(path).toLowerCase();
    
    // Priority: exact index/readme at root, then others
    if (filename === 'index.md' || filename === 'index.mdx' || filename === 'index.html') return 1;
    if (filename === 'readme.md' || filename === 'readme.mdx' || filename === 'readme.html') return 2;
    if (filename === 'home.md' || filename === 'home.mdx' || filename === 'home.html') return 3;
    return 4;
  }

  /**
   * Log a message if not in silent mode
   */
  log(...args) {
    if (!this.silent) {
      console.log(...args);
    }
  }
}