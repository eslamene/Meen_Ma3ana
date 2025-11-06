#!/usr/bin/env node

/**
 * i18n Sync Script
 * 
 * Synchronizes translation files:
 * - Adds missing keys from English to other languages
 * - Removes extra keys not in English
 * - Preserves existing translations
 * - Sorts keys alphabetically
 */

import fs from 'fs';
import path from 'path';

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

class I18nSyncer {
  constructor(messagesDir = 'messages') {
    this.messagesDir = messagesDir;
    this.changes = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  // Load JSON file
  loadJSON(filename) {
    const filePath = path.join(this.messagesDir, filename);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  // Save JSON file with pretty formatting
  saveJSON(filename, data) {
    const filePath = path.join(this.messagesDir, filename);
    const backup = `${filePath}.backup`;
    
    // Create backup
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backup);
      this.log(`📦 Backup created: ${filename}.backup`, 'cyan');
    }
    
    // Save with 2-space indentation
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    this.log(`💾 Saved: ${filename}`, 'green');
  }

  // Get all keys with their values
  flattenObject(obj, prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value, fullKey));
      } else {
        result[fullKey] = value;
      }
    }
    return result;
  }

  // Unflatten object
  unflattenObject(flat) {
    const result = {};
    for (const [key, value] of Object.entries(flat)) {
      const keys = key.split('.');
      let current = result;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    }
    return result;
  }

  // Sort object keys recursively
  sortObject(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return obj;
    }
    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortObject(obj[key]);
    });
    return sorted;
  }

  // Sync target language with base language structure
  syncLanguage(baseData, targetData, targetLang) {
    this.log(`\n${'='.repeat(60)}`, 'cyan');
    this.log(`🔄 Syncing ${targetLang} with en`, 'bold');
    this.log('='.repeat(60), 'cyan');

    const baseFlat = this.flattenObject(baseData);
    const targetFlat = this.flattenObject(targetData);

    let added = 0;
    let removed = 0;
    let preserved = 0;

    const synced = {};

    // Add missing keys with placeholder
    for (const [key, value] of Object.entries(baseFlat)) {
      if (targetFlat[key] !== undefined) {
        synced[key] = targetFlat[key];
        preserved++;
      } else {
        synced[key] = `[NEEDS TRANSLATION] ${value}`;
        added++;
        this.log(`  + Added: ${key}`, 'green');
      }
    }

    // Check for removed keys
    for (const key of Object.keys(targetFlat)) {
      if (baseFlat[key] === undefined) {
        removed++;
        this.log(`  - Removed: ${key}`, 'yellow');
      }
    }

    this.log(`\n📊 Changes:`, 'cyan');
    this.log(`  ✅ Preserved: ${preserved}`, 'green');
    this.log(`  ➕ Added: ${added}`, 'green');
    this.log(`  ➖ Removed: ${removed}`, 'yellow');

    return this.unflattenObject(synced);
  }

  // Main sync
  sync(options = {}) {
    const { sort = true, dryRun = false } = options;

    this.log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
    this.log('║              i18n TRANSLATION FILES SYNCER               ║', 'cyan');
    this.log('╚══════════════════════════════════════════════════════════╝\n', 'cyan');

    if (dryRun) {
      this.log('🔍 DRY RUN MODE - No files will be modified\n', 'yellow');
    }

    try {
      // Load base language (English)
      const enData = this.loadJSON('en.json');
      this.log('✅ Loaded en.json', 'green');

      // Load target language (Arabic)
      const arData = this.loadJSON('ar.json');
      this.log('✅ Loaded ar.json', 'green');

      // Sync Arabic with English structure
      let syncedAr = this.syncLanguage(enData, arData, 'ar');

      // Sort keys if requested
      if (sort) {
        this.log('\n🔤 Sorting keys alphabetically...', 'cyan');
        syncedAr = this.sortObject(syncedAr);
        this.log('✅ Keys sorted', 'green');
      }

      // Save synced file
      if (!dryRun) {
        this.saveJSON('ar.json', syncedAr);
        this.log('\n✅ Sync complete!', 'green');
        this.log('\n💡 Tip: Search for "[NEEDS TRANSLATION]" to find keys that need translation', 'cyan');
      } else {
        this.log('\n✅ Dry run complete - no files modified', 'green');
      }

      return 0;
    } catch (error) {
      this.log(`\n❌ Error: ${error.message}`, 'red');
      return 1;
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');
const noSort = args.includes('--no-sort');

// Run sync
const syncer = new I18nSyncer();
const exitCode = syncer.sync({ sort: !noSort, dryRun });
process.exit(exitCode);

