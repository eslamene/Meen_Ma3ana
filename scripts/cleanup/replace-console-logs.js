#!/usr/bin/env node

/**
 * Migration script to replace console.* statements with centralized logger
 * 
 * Usage: node scripts/cleanup/replace-console-logs.js [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DRY_RUN = process.argv.includes('--dry-run')

/**
 * Recursively get all TypeScript files
 */
function getAllTsFiles(dir, fileList = []) {
  const files = readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = statSync(filePath)
    
    if (stat.isDirectory()) {
      // Skip node_modules, .next, and other build directories
      if (!['node_modules', '.next', 'out', 'build', '.git'].includes(file)) {
        getAllTsFiles(filePath, fileList)
      }
    } else if (stat.isFile()) {
      // Only include .ts and .tsx files, exclude .d.ts
      if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !file.endsWith('.d.ts')) {
        fileList.push(filePath)
      }
    }
  })
  
  return fileList
}

const files = getAllTsFiles(path.join(__dirname, '../../src'))

let totalModified = 0
let totalFiles = 0

console.log(`📋 Found ${files.length} files to process\n`)

files.forEach(file => {
  let content = readFileSync(file, 'utf-8')
  let modified = false
  const originalContent = content

  // Skip if no console statements
  if (!content.includes('console.')) {
    return
  }

  totalFiles++

  // Check if this is an API route
  const isApiRoute = file.includes('/api/') && file.endsWith('/route.ts')
  
  // Check if logger is already imported
  const hasLoggerImport = content.includes("from '@/lib/logger'")
  const hasCorrelationImport = content.includes("from '@/lib/correlation'")
  
  // Add imports if needed
  if ((content.includes('console.error') || content.includes('console.log') || content.includes('console.warn')) && !hasLoggerImport) {
    // Find the last import statement
    const importRegex = /^import\s+.*from\s+['"].*['"];?\s*$/gm
    const imports = content.match(importRegex) || []
    
    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1]
      const lastImportIndex = content.lastIndexOf(lastImport)
      const insertPos = lastImportIndex + lastImport.length
      
      let newImports = ''
      if (isApiRoute) {
        newImports = "\nimport { Logger } from '@/lib/logger'\nimport { getCorrelationId } from '@/lib/correlation'\n"
      } else {
        newImports = "\nimport { defaultLogger as logger } from '@/lib/logger'\n"
      }
      
      content = content.slice(0, insertPos) + newImports + content.slice(insertPos)
      modified = true
    }
  }

  // For API routes, add logger initialization
  if (isApiRoute && content.includes('console.') && !content.includes('const logger = new Logger')) {
    // Find the function declaration (GET, POST, etc.)
    const functionMatch = content.match(/(export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\s*\([^)]*\)\s*{)/)
    if (functionMatch) {
      const functionStart = functionMatch.index + functionMatch[0].length
      const loggerInit = isApiRoute 
        ? "\n  const correlationId = getCorrelationId(request)\n  const logger = new Logger('" + 
          file.replace('src/app/api/', '').replace('/route.ts', '').replace(/\//g, '/') + 
          "', correlationId)\n"
        : "\n  const logger = defaultLogger\n"
      
      content = content.slice(0, functionStart) + loggerInit + content.slice(functionStart)
      modified = true
    }
  }

  // Replace console.error patterns
  if (content.includes('console.error')) {
    // Pattern 1: console.error('message', error)
    content = content.replace(
      /console\.error\((['"`])(.*?)\1\s*,\s*(.*?)\)/g,
      'logger.error($1$2$1, { error: $3 })'
    )
    
    // Pattern 2: console.error('message')
    content = content.replace(
      /console\.error\((['"`])(.*?)\1\)/g,
      'logger.error($1$2$1)'
    )
    
    // Pattern 3: console.error(error)
    content = content.replace(
      /console\.error\((.*?)\)/g,
      'logger.error($1)'
    )
    
    modified = true
  }

  // Replace console.log patterns (only in API routes, keep in components for now)
  if (isApiRoute && content.includes('console.log')) {
    content = content.replace(
      /console\.log\((['"`])(.*?)\1\s*,\s*(.*?)\)/g,
      'logger.info($1$2$1, $3)'
    )
    content = content.replace(
      /console\.log\((['"`])(.*?)\1\)/g,
      'logger.info($1$2$1)'
    )
    content = content.replace(
      /console\.log\((.*?)\)/g,
      'logger.info($1)'
    )
    modified = true
  }

  // Replace console.warn patterns
  if (content.includes('console.warn')) {
    content = content.replace(
      /console\.warn\((['"`])(.*?)\1\s*,\s*(.*?)\)/g,
      'logger.warn($1$2$1, $3)'
    )
    content = content.replace(
      /console\.warn\((['"`])(.*?)\1\)/g,
      'logger.warn($1$2$1)'
    )
    content = content.replace(
      /console\.warn\((.*?)\)/g,
      'logger.warn($1)'
    )
    modified = true
  }

  if (modified && content !== originalContent) {
    if (!DRY_RUN) {
      writeFileSync(file, content, 'utf-8')
    }
    console.log(`${DRY_RUN ? '🔍 [DRY RUN] Would update' : '✅ Updated'}: ${file}`)
    totalModified++
  }
})

console.log(`\n📊 Summary:`)
console.log(`   Files processed: ${totalFiles}`)
console.log(`   Files ${DRY_RUN ? 'would be' : ''} modified: ${totalModified}`)

if (DRY_RUN) {
  console.log(`\n💡 Run without --dry-run to apply changes`)
}

