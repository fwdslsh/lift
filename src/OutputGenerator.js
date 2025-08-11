import { writeFile, mkdir } from "fs/promises";
import { join, basename } from "path";

/**
 * OutputGenerator - Responsible for generating llms.txt and llms-full.txt files
 * Follows Single Responsibility Principle by focusing solely on output generation
 */
export class OutputGenerator {
  constructor(outputDir, options = {}) {
    this.outputDir = outputDir;
    this.silent = options.silent || false;
  }

  /**
   * Generate both llms.txt and llms-full.txt outputs
   */
  async generateOutputs(projectName, orderedDocs) {
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

  /**
   * Generate the structured index content for llms.txt
   */
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

  /**
   * Generate the full content for llms-full.txt
   */
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

  /**
   * Format byte size for human readability
   */
  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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