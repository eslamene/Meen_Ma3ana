#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Directory to process
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');

// Function to recursively find all route.ts files
function findRouteFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (item === 'route.ts') {
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
    
    // Skip if already has logger import
    if (content.includes('from \'@/lib/logger\'') || content.includes('from "@/lib/logger"')) {
      console.log(`Skipping ${filePath} - already has logger import`);
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
        const loggerImports = `\nimport { Logger } from '@/lib/logger'\nimport { getCorrelationId } from '@/lib/correlation'\n`;
        content = content.slice(0, insertIndex) + loggerImports + content.slice(insertIndex);
        modified = true;
      }
    }
    
    // Replace console.log with logger.info
    if (content.includes('console.log(')) {
      content = content.replace(/console\.log\(/g, 'logger.info(');
      modified = true;
    }
    
    // Replace console.error with logger.logStableError
    if (content.includes('console.error(')) {
      // More sophisticated replacement for console.error
      content = content.replace(/console\.error\(([^)]+)\)/g, (match, args) => {
        // Check if it's a simple error log
        if (args.includes('Error') || args.includes('error')) {
          return `logger.logStableError('INTERNAL_SERVER_ERROR', ${args})`;
        } else {
          return `logger.error(${args})`;
        }
      });
      modified = true;
    }
    
    // Replace console.warn with logger.warn
    if (content.includes('console.warn(')) {
      content = content.replace(/console\.warn\(/g, 'logger.warn(');
      modified = true;
    }
    
    // Replace console.info with logger.info
    if (content.includes('console.info(')) {
      content = content.replace(/console\.info\(/g, 'logger.info(');
      modified = true;
    }
    
    // Replace console.debug with logger.debug
    if (content.includes('console.debug(')) {
      content = content.replace(/console\.debug\(/g, 'logger.debug(');
      modified = true;
    }
    
    // Add logger initialization in functions that use it
    if (modified && content.includes('logger.')) {
      // Find function declarations and add logger initialization
      const functionRegex = /export\s+(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*{/g;
      let match;
      
      while ((match = functionRegex.exec(content)) !== null) {
        const functionStart = match.index;
        const functionName = match[2];
        const openBraceIndex = content.indexOf('{', functionStart);
        
        if (openBraceIndex !== -1) {
          // Check if this function has a request parameter
          const functionSignature = match[0];
          if (functionSignature.includes('request') || functionSignature.includes('NextRequest')) {
            // Add logger initialization
            const loggerInit = `\n  const correlationId = getCorrelationId(request)\n  const logger = new Logger(correlationId)\n`;
            content = content.slice(0, openBraceIndex + 1) + loggerInit + content.slice(openBraceIndex + 1);
          } else {
            // Add default logger
            const loggerInit = `\n  const logger = new Logger()\n`;
            content = content.slice(0, openBraceIndex + 1) + loggerInit + content.slice(openBraceIndex + 1);
          }
        }
      }
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
console.log('Starting console.log replacement in API routes...');

const routeFiles = findRouteFiles(apiDir);
console.log(`Found ${routeFiles.length} route files`);

for (const file of routeFiles) {
  replaceConsoleLogs(file);
}

console.log('Console.log replacement completed!');
