#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Directory to process
const libDir = path.join(__dirname, '..', 'src', 'lib');

// Function to recursively find all TypeScript files
function findTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to replace console logs in a file
function replaceConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Skip if already has logger import or is the logger file itself
    if (content.includes('from \'@/lib/logger\'') || 
        content.includes('from "@/lib/logger"') ||
        filePath.includes('logger.ts') ||
        filePath.includes('correlation.ts')) {
      console.log(`Skipping ${filePath} - already has logger import or is logger file`);
      return;
    }
    
    // Add logger imports at the top
    if (content.includes('console.')) {
      // Find the last import statement
      const importRegex = /^import.*from.*['"].*['"];?\s*$/gm;
      const imports = content.match(importRegex);
      
      if (imports) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertIndex = lastImportIndex + lastImport.length;
        
        // Add logger imports
        const loggerImports = `\nimport { defaultLogger } from '@/lib/logger'\n`;
        content = content.slice(0, insertIndex) + loggerImports + content.slice(insertIndex);
        modified = true;
      }
    }
    
    // Replace console.log with defaultLogger.info
    if (content.includes('console.log(')) {
      content = content.replace(/console\.log\(/g, 'defaultLogger.info(');
      modified = true;
    }
    
    // Replace console.error with defaultLogger.error
    if (content.includes('console.error(')) {
      content = content.replace(/console\.error\(/g, 'defaultLogger.error(');
      modified = true;
    }
    
    // Replace console.warn with defaultLogger.warn
    if (content.includes('console.warn(')) {
      content = content.replace(/console\.warn\(/g, 'defaultLogger.warn(');
      modified = true;
    }
    
    // Replace console.info with defaultLogger.info
    if (content.includes('console.info(')) {
      content = content.replace(/console\.info\(/g, 'defaultLogger.info(');
      modified = true;
    }
    
    // Replace console.debug with defaultLogger.debug
    if (content.includes('console.debug(')) {
      content = content.replace(/console\.debug\(/g, 'defaultLogger.debug(');
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Main execution
console.log('Starting console.log replacement in lib files...');

const tsFiles = findTsFiles(libDir);
console.log(`Found ${tsFiles.length} TypeScript files`);

for (const file of tsFiles) {
  replaceConsoleLogs(file);
}

console.log('Console.log replacement in lib files completed!');
