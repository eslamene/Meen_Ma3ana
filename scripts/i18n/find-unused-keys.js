#!/usr/bin/env node

/**
 * Find Unused Translation Keys
 * 
 * Scans the codebase to find translation keys that are:
 * - Defined in translation files but never used in code
 * - Used in code but not defined in translation files
 */

import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

class UnusedKeyFinder {
  constructor(options = {}) {
    this.messagesDir = options.messagesDir || 'messages';
    this.srcDir = options.srcDir || 'src';
    this.definedKeys = new Set();
    this.usedKeys = new Set();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  // Get all keys from translation files
  getAllKeys(obj, prefix = '') {
    let keys = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys = keys.concat(this.getAllKeys(value, fullKey));
      }
    }
    return keys;
  }

  // Load translation keys
  loadTranslationKeys() {
    const enPath = path.join(this.messagesDir, 'en.json');
    const data = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const keys = this.getAllKeys(data);
    keys.forEach(key => this.definedKeys.add(key));
    return keys.length;
  }

  // Find all translation key usages in source code
  findUsedKeys() {
    try {
      // Read all source files and scan manually
      this.scanDirectory(this.srcDir);
    } catch (error) {
      this.log(`⚠️  Error scanning source files: ${error.message}`, 'yellow');
    }
    
    return this.usedKeys.size;
  }

  // Recursively scan directory for translation usages
  scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }
        this.scanDirectory(fullPath);
      } else if (entry.isFile()) {
        // Only scan relevant file types
        if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          this.scanFile(fullPath);
        }
      }
    }
  }

  // Scan a single file for translation usages
  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Pattern 1: t('key') or t("key") - exact keys
      const regex1 = /\bt\(['"]([^'"]+)['"]\)/g;
      let match;
      while ((match = regex1.exec(content)) !== null) {
        this.usedKeys.add(match[1]);
      }
      
      // Pattern 2: getTranslations('namespace') or useTranslations('namespace')
      const regex2 = /(?:getTranslations|useTranslations)\s*\(['"]([^'"]+)['"]\)/g;
      while ((match = regex2.exec(content)) !== null) {
        const namespace = match[1];
        this.usedKeys.add(namespace);
        
        // Mark all keys in this namespace as potentially used
        // (since we can't track dynamic key usage like t(`${namespace}.someKey`))
        for (const key of this.definedKeys) {
          if (key === namespace || key.startsWith(namespace + '.')) {
            this.usedKeys.add(key);
          }
        }
      }
      
    } catch {
      // Skip files that can't be read
    }
  }

  // Find unused keys (defined but not used)
  findUnused() {
    const unused = [];
    for (const key of this.definedKeys) {
      if (!this.usedKeys.has(key)) {
        unused.push(key);
      }
    }
    return unused.sort();
  }

  // Find missing keys (used but not defined)
  findMissing() {
    const missing = [];
    for (const key of this.usedKeys) {
      if (!this.definedKeys.has(key)) {
        missing.push(key);
      }
    }
    return missing.sort();
  }

  // Main analysis
  analyze() {
    this.log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
    this.log('║           UNUSED TRANSLATION KEYS FINDER                 ║', 'cyan');
    this.log('╚══════════════════════════════════════════════════════════╝\n', 'cyan');

    // Load translation keys
    this.log('📖 Loading translation keys...', 'cyan');
    const definedCount = this.loadTranslationKeys();
    this.log(`✅ Found ${definedCount} defined keys\n`, 'green');

    // Find used keys
    this.log('🔍 Scanning source code for t() usages...', 'cyan');
    const usedCount = this.findUsedKeys();
    this.log(`✅ Found ${usedCount} used keys\n`, 'green');

    // Find unused keys
    this.log('═'.repeat(60), 'cyan');
    this.log('📊 ANALYSIS RESULTS', 'bold');
    this.log('═'.repeat(60), 'cyan');

    const unused = this.findUnused();
    const missing = this.findMissing();

    // Report unused keys
    if (unused.length > 0) {
      this.log(`\n⚠️  UNUSED KEYS (${unused.length})`, 'yellow');
      this.log('Keys defined but never used in code:', 'yellow');
      const showCount = Math.min(20, unused.length);
      unused.slice(0, showCount).forEach(key => {
        this.log(`  - ${key}`, 'yellow');
      });
      if (unused.length > showCount) {
        this.log(`  ... and ${unused.length - showCount} more`, 'yellow');
      }
    } else {
      this.log('\n✅ No unused keys found', 'green');
    }

    // Report missing keys
    if (missing.length > 0) {
      this.log(`\n❌ MISSING KEYS (${missing.length})`, 'red');
      this.log('Keys used in code but not defined in translations:', 'red');
      const showCount = Math.min(20, missing.length);
      missing.slice(0, showCount).forEach(key => {
        this.log(`  - ${key}`, 'red');
      });
      if (missing.length > showCount) {
        this.log(`  ... and ${missing.length - showCount} more`, 'red');
      }
    } else {
      this.log('\n✅ No missing keys found', 'green');
    }

    // Summary
    this.log(`\n${'═'.repeat(60)}`, 'cyan');
    this.log('📈 SUMMARY', 'bold');
    this.log('═'.repeat(60), 'cyan');
    this.log(`Total defined keys: ${definedCount}`, 'cyan');
    this.log(`Total used keys: ${usedCount}`, 'cyan');
    this.log(`Unused keys: ${unused.length}`, unused.length > 0 ? 'yellow' : 'green');
    this.log(`Missing keys: ${missing.length}`, missing.length > 0 ? 'red' : 'green');

    if (unused.length === 0 && missing.length === 0) {
      this.log('\n🎉 All translation keys are properly used!', 'green');
    }

    this.log('');
    return missing.length > 0 ? 1 : 0;
  }
}

// Run analysis
const finder = new UnusedKeyFinder();
const exitCode = finder.analyze();
process.exit(exitCode);

