# Cases Data Management

This directory contains scripts and documentation for managing cases and contributions data in the database.

## 📁 **Current Workflow**

### **1. Consolidate and Recategorize Categories**

If you have duplicate categories (e.g., 58+ categories), consolidate them first:

```bash
cd docs/cases
./consolidate-and-recategorize.sh
```

**What it does:**
- Consolidates duplicate categories (keeps one canonical category per name)
- Updates all cases to use canonical category IDs
- Recategorizes cases based on their Arabic titles using the same logic as the generation script
- Ensures you have exactly 9 unique categories:
  1. Medical Support
  2. Educational Assistance
  3. Housing & Rent
  4. Home Appliances
  5. Emergency Relief
  6. Livelihood & Business
  7. Community & Social
  8. Basic Needs & Clothing
  9. Other Support

**Note:** This should be run before inserting new cases to ensure consistency.

### **2. Clear All Cases Data**

Before inserting new data, you may want to clear all existing cases and related data:

```bash
cd docs/cases
./clear-all-cases-data.sh
```

**What it clears:**
- All cases
- All case-related contributions
- All contribution approval statuses
- All case files, images, updates, status history
- All case-related notifications
- All case-related sponsorships and recurring contributions

**What it keeps:**
- `case_categories` (reference data)
- `users` (user accounts)
- `payment_methods` (reference data)
- `projects` (separate from cases)
- Other system tables

See [`ENTITIES_TO_CLEAR.md`](./ENTITIES_TO_CLEAR.md) for a complete list of entities.

### **3. Generate Cases from CSV**

Generate SQL insert statements from `contributions.csv`:

```bash
cd docs/cases
node generate-cases-from-csv.js
```

This creates:
- `insert-cases-from-csv.sql` - SQL script with all INSERT statements
- Includes cases, contributions, approval statuses, and notifications
- Uses CSV Description column as `title_ar`
- Generates bilingual titles and descriptions

See [`UPDATED_GENERATION_README.md`](./UPDATED_GENERATION_README.md) for details on the generation process.

### **4. Insert Cases into Database**

Run the generated SQL script:

```bash
cd docs/cases
./run-insert-script.sh
```

**Requirements:**
- `DATABASE_URL` in `.env.local` file
- Script automatically handles password encoding and GSSAPI settings

See [`RUN_INSERT_INSTRUCTIONS.md`](./RUN_INSERT_INSTRUCTIONS.md) for detailed instructions and troubleshooting.

### **5. Verify Database State**

Check that data was inserted correctly:

```bash
cd docs/cases
psql "$DATABASE_URL" -f verify-database-state.sql
```

Or run the SQL directly in Supabase SQL Editor.

## 📋 **File Structure**

### **Active Scripts**
- `consolidate-and-recategorize.sh` - Consolidates categories and recategorizes cases
- `generate-cases-from-csv.js` - Generates SQL from CSV
- `clear-all-cases-data.sh` - Shell script to clear all cases
- `run-insert-script.sh` - Shell script to run insert SQL

### **SQL Files**
- `consolidate-categories.sql` - SQL to consolidate duplicate categories
- `recategorize-cases.sql` - SQL to recategorize cases based on Arabic titles
- `clear-all-cases-data.sql` - SQL to clear all cases and related data
- `insert-cases-from-csv.sql` - Generated SQL with INSERT statements (large file)
- `verify-database-state.sql` - SQL to verify database state

### **Data Files**
- `contributions.csv` - Source data (CSV format)

### **Documentation**
- `README.md` - This file
- `ENTITIES_TO_CLEAR.md` - List of entities cleared by clear script
- `UPDATED_GENERATION_README.md` - Details on case generation process
- `RUN_INSERT_INSTRUCTIONS.md` - Instructions for running insert script

## 🔄 **Complete Workflow Example**

```bash
# 1. Consolidate categories (if you have duplicates)
cd docs/cases
./consolidate-and-recategorize.sh

# 2. Clear existing data (optional)
./clear-all-cases-data.sh

# 3. Generate SQL from CSV
node generate-cases-from-csv.js

# 4. Insert data into database
./run-insert-script.sh

# 5. Verify (optional)
psql "$DATABASE_URL" -f verify-database-state.sql
```

## ⚠️ **Important Notes**

- **Backup First**: Always backup your database before running clear/insert scripts
- **Category Consolidation**: Run `consolidate-and-recategorize.sh` first if you have duplicate categories
- **Large SQL Files**: `insert-cases-from-csv.sql` is large (~1MB) and must be run via `psql`, not Supabase SQL Editor
- **DATABASE_URL**: Must be set in `.env.local` or exported as environment variable
- **Password Encoding**: The shell scripts automatically handle password encoding for special characters
- **GSSAPI**: Scripts automatically disable GSSAPI for Supabase connection pooler compatibility

## 📊 **Data Schema**

The scripts generate data for:
- `case_categories` - Case categories (9 standard categories)
- `cases` - Main cases table with bilingual fields (`title_en`, `title_ar`, `description_en`, `description_ar`)
- `contributions` - Contributions linked to cases
- `contribution_approval_status` - Approval statuses (all set to 'approved')
- `notifications` - Notifications for approved contributions

## 🆘 **Troubleshooting**

If you encounter issues:
1. Check [`RUN_INSERT_INSTRUCTIONS.md`](./RUN_INSERT_INSTRUCTIONS.md) for common problems
2. Verify `DATABASE_URL` is correctly set in `.env.local`
3. Ensure you have proper database permissions
4. Check that all required tables exist in the database
5. Run `consolidate-and-recategorize.sh` if you have category-related issues

