#!/usr/bin/env node

/**
 * Script to update pages to use the new Container layout system
 * This script finds pages with hardcoded max-w containers and updates them
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pagesDir = path.join(__dirname, '../src/app/[locale]');

// Patterns to find and replace
const patterns = [
  {
    // Pattern 1: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
    find: /<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">/g,
    replace: '<Container variant={containerVariant}>',
    needsImport: true,
    needsHook: true
  },
  {
    // Pattern 2: max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8
    find: /<div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">/g,
    replace: '<Container variant={containerVariant} className="py-8">',
    needsImport: true,
    needsHook: true
  },
  {
    // Pattern 3: max-w-7xl mx-auto py-6 sm:px-6 lg:px-8
    find: /<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">/g,
    replace: '<Container variant={containerVariant} className="py-6">',
    needsImport: true,
    needsHook: true
  }
];

function findPageFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findPageFiles(fullPath));
    } else if (entry.name === 'page.tsx') {
      files.push(fullPath);
    }
  }
  
  return files;
}

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let needsImport = false;
  let needsHook = false;
  
  // Check if already using Container
  if (content.includes("from '@/components/layout/Container'")) {
    console.log(`⏭️  Skipping ${filePath} - already uses Container`);
    return false;
  }
  
  // Apply patterns
  for (const pattern of patterns) {
    if (pattern.find.test(content)) {
      content = content.replace(pattern.find, pattern.replace);
      modified = true;
      if (pattern.needsImport) needsImport = true;
      if (pattern.needsHook) needsHook = true;
    }
  }
  
  // Replace closing div with Container closing tag
  if (modified) {
    // Find the closing </div> that matches our Container opening
    // This is a simple approach - might need refinement
    content = content.replace(
      /(\s*)<\/div>(\s*<\/div>\s*<\/PermissionGuard>|\s*<\/ProtectedRoute>|\s*<\/div>\s*<\/PermissionGuard>)/g,
      (match, indent, rest) => {
        // Check if this is likely the container closing tag
        if (rest.includes('PermissionGuard') || rest.includes('ProtectedRoute')) {
          return `${indent}</Container>${rest}`;
        }
        return match;
      }
    );
    
    // Add imports if needed
    if (needsImport && !content.includes("from '@/components/layout/Container'")) {
      // Find the last import statement
      const importMatch = content.match(/(import.*from.*['"]\n?)+/);
      if (importMatch) {
        const lastImport = importMatch[0].split('\n').filter(Boolean).pop();
        const importIndex = content.lastIndexOf(lastImport) + lastImport.length;
        content = content.slice(0, importIndex) + 
          "\nimport Container from '@/components/layout/Container'\n" +
          "import { useLayout } from '@/components/layout/LayoutProvider'\n" +
          content.slice(importIndex);
      }
    }
    
    // Add useLayout hook if needed
    if (needsHook && !content.includes('const { containerVariant } = useLayout()')) {
      // Find the component function start
      const functionMatch = content.match(/export default function \w+\([^)]*\)\s*\{/);
      if (functionMatch) {
        const functionStart = functionMatch.index + functionMatch[0].length;
        // Find first const/let/var or useState/useEffect
        const hookMatch = content.slice(functionStart).match(/(const|let|var|useState|useEffect)/);
        if (hookMatch) {
          const hookIndex = functionStart + hookMatch.index;
          content = content.slice(0, hookIndex) + 
            "  const { containerVariant } = useLayout()\n  " +
            content.slice(hookIndex);
        } else {
          // Add after function declaration
          content = content.slice(0, functionStart) + 
            "\n  const { containerVariant } = useLayout()\n" +
            content.slice(functionStart);
        }
      }
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${filePath}`);
    return true;
  }
  
  return false;
}

// Main execution
console.log('🔍 Finding page files...');
const pageFiles = findPageFiles(pagesDir);
console.log(`📄 Found ${pageFiles.length} page files\n`);

let updatedCount = 0;
for (const file of pageFiles) {
  if (updateFile(file)) {
    updatedCount++;
  }
}

console.log(`\n✨ Updated ${updatedCount} files`);
console.log('⚠️  Please review the changes and test the pages!');

