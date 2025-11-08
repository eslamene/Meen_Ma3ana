# Updated Case Generation Script

## Changes Made

### 1. **Description Column → Title**
   - The CSV "Description" column is now used as `title_ar` (Arabic title)
   - Previously it was used as `description_ar`

### 2. **Bilingual Fields**
   - **title_ar**: Uses the CSV Description column directly
   - **title_en**: Generated from Arabic title based on category
   - **description_ar**: Same as title_ar (can be customized later)
   - **description_en**: Generated English description with category context

### 3. **Improved CSV Parsing**
   - Added proper CSV parsing to handle commas in Arabic text
   - Uses quote-aware parsing to correctly split CSV lines

## Example Output

For CSV row: `1,حاله تبع وسام ايجار و تصليح حاجات.,أنا,1000,01/07/2025`

Generated SQL:
```sql
INSERT INTO cases (
    title_en,
    title_ar,
    description_ar,
    description_en,
    ...
) VALUES (
    'Housing Support',                    -- Generated English title
    'حاله تبع وسام ايجار و تصليح حاجات.',  -- CSV Description as Arabic title
    'حاله تبع وسام ايجار و تصليح حاجات.',  -- Same as title_ar
    'Support provided for housing & rent - Rent assistance. حاله تبع وسام ايجار و تصليح حاجات.',  -- Generated English description
    ...
);
```

## Next Steps

1. **Delete all existing cases**:
   ```sql
   \i supabase/migrations/delete_all_cases_data.sql
   ```

2. **Run the insert script**:
   ```sql
   \i docs/cases/insert-cases-from-csv.sql
   ```

3. **Verify the data**:
   ```sql
   SELECT title_en, title_ar, description_en, description_ar FROM cases LIMIT 5;
   ```

## Files Updated

- `docs/cases/generate-cases-from-csv.js` - Updated to use Description as title
- `docs/cases/insert-cases-from-csv.sql` - Regenerated with new structure

