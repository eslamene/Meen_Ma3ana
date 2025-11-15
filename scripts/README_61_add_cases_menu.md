# Add Cases Menu Items Script

This script adds Cases and Admin Cases menu items to the database with their proper permissions.

## What it does

1. **Main Navigation: Cases** (`/cases`)
   - Label: "Cases" / "الحالات"
   - Permission: `cases:view`
   - Icon: Heart
   - Sort order: 2

2. **Admin Menu: Cases** (`/admin/cases`)
   - Label: "Cases" / "الحالات"
   - Permission: `cases:manage`
   - Icon: Heart
   - Sort order: 2 (under Administration)
   - Parent: Administration menu item

## Usage

### Option 1: Run the Node.js script

```bash
node scripts/61-add-cases-menu-items.js
```

**Requirements:**
- Environment variables must be set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Option 2: Run the SQL migration

```bash
# Apply the migration using Supabase CLI or your database tool
psql -h your-db-host -U your-user -d your-db -f supabase/migrations/061_add_cases_menu_items.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy and paste the contents of `supabase/migrations/061_add_cases_menu_items.sql`
3. Run the query

## What permissions are required?

The script expects these permissions to exist in the `admin_permissions` table:
- `cases:view` - For the main Cases menu item
- `cases:manage` - For the Admin Cases menu item

If these permissions don't exist, the script will fail with an error message.

## What happens if menu items already exist?

Both the script and SQL migration use `ON CONFLICT` or update logic, so:
- If a menu item already exists, it will be **updated** with the new values
- If a menu item doesn't exist, it will be **created**

## Verification

After running the script, you can verify the menu items were created:

```sql
-- Check main Cases menu item
SELECT * FROM admin_menu_items 
WHERE href = '/cases' AND parent_id IS NULL;

-- Check Admin Cases menu item
SELECT * FROM admin_menu_items 
WHERE href = '/admin/cases' AND parent_id IS NOT NULL;
```

## Troubleshooting

### Error: Permission not found
- Ensure the permissions exist in `admin_permissions` table
- Check that permission names match exactly: `cases:view` and `cases:manage`

### Error: Admin parent menu item not found
- The script will warn but continue
- Admin Cases menu item will not be created
- Ensure the Administration menu item exists at `/admin` first

### Error: Missing environment variables
- Check your `.env.local` or `.env` file
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

