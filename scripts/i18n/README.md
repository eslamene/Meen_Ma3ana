# i18n Maintenance Scripts

Automated tools to maintain and validate translation files for the Meen Ma3ana project.

## 📋 Available Scripts

### 1. **validate-i18n.js** - Validate Translation Files

Checks translation files for common issues:
- ✅ Valid JSON syntax
- ✅ No duplicate keys
- ✅ Structure consistency between languages
- ✅ Missing/extra keys

**Usage:**
```bash
node scripts/i18n/validate-i18n.js
```

**Output:**
- Lists all validation errors and warnings
- Shows missing keys in target languages
- Displays extra keys not in English
- Exit code 0 if all checks pass, 1 if errors found

---

### 2. **sync-i18n.js** - Sync Translation Files

Synchronizes translation files to match English structure:
- ➕ Adds missing keys with `[NEEDS TRANSLATION]` placeholder
- ➖ Removes extra keys not in English
- 💾 Creates backup before modifying
- 🔤 Optionally sorts keys alphabetically

**Usage:**
```bash
# Normal mode - makes changes
node scripts/i18n/sync-i18n.js

# Dry run - shows what would change without modifying files
node scripts/i18n/sync-i18n.js --dry-run

# Skip sorting
node scripts/i18n/sync-i18n.js --no-sort
```

**After running:**
Search for `[NEEDS TRANSLATION]` in `messages/ar.json` to find keys that need translation.

---

### 3. **find-unused-keys.js** - Find Unused Translation Keys

Scans the codebase to find:
- ⚠️  Keys defined but never used in code (unused)
- ❌ Keys used in code but not defined (missing)

**Usage:**
```bash
node scripts/i18n/find-unused-keys.js
```

**Requirements:**
- `ripgrep` (rg) or `grep` must be available
- Install ripgrep: `brew install ripgrep` (macOS) or `apt install ripgrep` (Linux)

---

## 🔄 Recommended Workflow

### Daily Development

1. **Before committing changes:**
   ```bash
   node scripts/i18n/validate-i18n.js
   ```
   Fix any errors before committing.

### When Adding New Features

1. **Write code with translation keys:**
   ```tsx
   <Button>{t('cases.createNew')}</Button>
   ```

2. **Add translations to `messages/en.json`:**
   ```json
   {
     "cases": {
       "createNew": "Create New Case"
     }
   }
   ```

3. **Sync other languages:**
   ```bash
   node scripts/i18n/sync-i18n.js
   ```

4. **Translate placeholder text:**
   Search for `[NEEDS TRANSLATION]` in `messages/ar.json` and replace with actual translations.

### Weekly Maintenance

1. **Find unused keys:**
   ```bash
   node scripts/i18n/find-unused-keys.js
   ```

2. **Remove unused keys** (if confirmed they're not needed)

3. **Validate everything:**
   ```bash
   node scripts/i18n/validate-i18n.js
   ```

---

## 🚀 Adding to package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "i18n:validate": "node scripts/i18n/validate-i18n.js",
    "i18n:sync": "node scripts/i18n/sync-i18n.js",
    "i18n:sync:dry": "node scripts/i18n/sync-i18n.js --dry-run",
    "i18n:unused": "node scripts/i18n/find-unused-keys.js",
    "i18n:check": "npm run i18n:validate && npm run i18n:unused"
  }
}
```

Then use:
```bash
npm run i18n:validate
npm run i18n:sync
npm run i18n:unused
npm run i18n:check
```

---

## 🔧 Git Hooks (Optional)

Add to `.husky/pre-commit` or your pre-commit hook:

```bash
#!/bin/sh
# Validate i18n before commit
node scripts/i18n/validate-i18n.js
if [ $? -ne 0 ]; then
  echo "❌ i18n validation failed. Please fix errors before committing."
  exit 1
fi
```

---

## 💡 Best Practices

1. **Always use English as the base language**
   - Add new keys to `en.json` first
   - Then sync to other languages

2. **Use meaningful key names**
   ```json
   // ✅ Good
   "cases.createNew": "Create New Case"
   "cases.validation.titleRequired": "Title is required"
   
   // ❌ Bad
   "text1": "Create New Case"
   "error1": "Title is required"
   ```

3. **Group related keys**
   ```json
   {
     "cases": {
       "create": "...",
       "edit": "...",
       "delete": "..."
     }
   }
   ```

4. **Keep translations concise**
   - Avoid very long text in JSON
   - Consider breaking into multiple keys

5. **Run validation before committing**
   - Catch issues early
   - Keep translation files clean

---

## 🐛 Troubleshooting

### "Module not found" error
Make sure you're running from project root:
```bash
cd /path/to/Meen_Ma3ana
node scripts/i18n/validate-i18n.js
```

### Script doesn't find any used keys
Install ripgrep for better code scanning:
```bash
# macOS
brew install ripgrep

# Ubuntu/Debian
sudo apt install ripgrep

# Windows
choco install ripgrep
```

### Backup files not created
Check write permissions on `messages/` directory.

---

## 📚 Additional Tools (Optional)

For more advanced workflows, consider:

1. **i18next-parser** - Extract keys from code automatically
2. **lokalise/crowdin** - Cloud-based translation management
3. **Google Translate API** - Auto-translate missing keys (with review)

---

## 🤝 Contributing

When adding new scripts:
1. Follow existing code style
2. Add usage examples to this README
3. Test with both English and Arabic files
4. Handle errors gracefully

