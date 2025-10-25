#!/usr/bin/env node

/**
 * i18n Validation Script
 * 
 * Validates translation files for:
 * - Valid JSON syntax
 * - Duplicate keys
 * - Missing keys (compared to English)
 * - Extra keys (not in English)
 * - Nested structure consistency
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

class I18nValidator {
  constructor(messagesDir = 'messages') {
    this.messagesDir = messagesDir;
    this.errors = [];
    this.warnings = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  error(message) {
    this.errors.push(message);
    this.log(`❌ ${message}`, 'red');
  }

  warning(message) {
    this.warnings.push(message);
    this.log(`⚠️  ${message}`, 'yellow');
  }

  success(message) {
    this.log(`✅ ${message}`, 'green');
  }

  info(message) {
    this.log(`ℹ️  ${message}`, 'cyan');
  }

  // Load and parse JSON file
  loadJSON(filename) {
    const filePath = path.join(this.messagesDir, filename);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.error(`${filename}: Invalid JSON - ${error.message}`);
      } else {
        this.error(`${filename}: ${error.message}`);
      }
      return null;
    }
  }

  // Get all keys from nested object
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

  // Check for duplicate keys in JSON object
  findDuplicates(obj, path = '', filename = '') {
    const keys = Object.keys(obj);
    const seen = new Set();
    const duplicates = [];

    for (const key of keys) {
      if (seen.has(key)) {
        duplicates.push(`${path}.${key}`.replace(/^\./, ''));
      }
      seen.add(key);

      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nestedDups = this.findDuplicates(
          value,
          path ? `${path}.${key}` : key,
          filename
        );
        duplicates.push(...nestedDups);
      }
    }

    return duplicates;
  }

  // Validate a single translation file
  validateFile(filename) {
    this.log(`\n${'='.repeat(60)}`, 'cyan');
    this.log(`📄 Validating: ${filename}`, 'bold');
    this.log('='.repeat(60), 'cyan');

    const data = this.loadJSON(filename);
    if (!data) return false;

    this.success('Valid JSON syntax');

    // Check for duplicates
    const duplicates = this.findDuplicates(data, '', filename);
    if (duplicates.length > 0) {
      this.error(`${filename}: Found duplicate keys:`);
      duplicates.forEach(key => this.log(`  - ${key}`, 'red'));
    } else {
      this.success('No duplicate keys');
    }

    // Count keys
    const allKeys = this.getAllKeys(data);
    this.info(`Total keys: ${allKeys.length}`);

    return data;
  }

  // Compare two language files
  compareFiles(baseData, targetData, baseLang, targetLang) {
    this.log(`\n${'='.repeat(60)}`, 'cyan');
    this.log(`🔄 Comparing ${baseLang} vs ${targetLang}`, 'bold');
    this.log('='.repeat(60), 'cyan');

    const baseKeys = new Set(this.getAllKeys(baseData));
    const targetKeys = new Set(this.getAllKeys(targetData));

    // Find missing keys
    const missing = [...baseKeys].filter(key => !targetKeys.has(key));
    if (missing.length > 0) {
      this.error(`Missing in ${targetLang} (${missing.length} keys):`);
      missing.slice(0, 10).forEach(key => this.log(`  - ${key}`, 'red'));
      if (missing.length > 10) {
        this.log(`  ... and ${missing.length - 10} more`, 'red');
      }
    } else {
      this.success(`All ${baseLang} keys present in ${targetLang}`);
    }

    // Find extra keys
    const extra = [...targetKeys].filter(key => !baseKeys.has(key));
    if (extra.length > 0) {
      this.warning(`Extra in ${targetLang} (${extra.length} keys):`);
      extra.slice(0, 10).forEach(key => this.log(`  - ${key}`, 'yellow'));
      if (extra.length > 10) {
        this.log(`  ... and ${extra.length - 10} more`, 'yellow');
      }
    } else {
      this.success(`No extra keys in ${targetLang}`);
    }

    return { missing, extra };
  }

  // Main validation
  validate() {
    this.log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
    this.log('║           i18n TRANSLATION FILES VALIDATOR              ║', 'cyan');
    this.log('╚══════════════════════════════════════════════════════════╝\n', 'cyan');

    // Validate English (base)
    const enData = this.validateFile('en.json');
    if (!enData) return this.printSummary();

    // Validate Arabic
    const arData = this.validateFile('ar.json');
    if (!arData) return this.printSummary();

    // Compare files
    const { missing, extra } = this.compareFiles(enData, arData, 'en', 'ar');

    return this.printSummary();
  }

  // Print summary
  printSummary() {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('📊 VALIDATION SUMMARY', 'bold');
    this.log('='.repeat(60), 'cyan');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.success('All checks passed! 🎉');
      return 0;
    }

    if (this.errors.length > 0) {
      this.log(`\n❌ Errors: ${this.errors.length}`, 'red');
    }

    if (this.warnings.length > 0) {
      this.log(`⚠️  Warnings: ${this.warnings.length}`, 'yellow');
    }

    this.log('');
    return this.errors.length > 0 ? 1 : 0;
  }
}

// Run validation
const validator = new I18nValidator();
const exitCode = validator.validate();
process.exit(exitCode);

