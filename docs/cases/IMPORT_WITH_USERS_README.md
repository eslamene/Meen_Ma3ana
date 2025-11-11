# Import Contributions with User Accounts (by ContributorID)

This script imports contributions from `contributions.csv` and creates proper user accounts for each unique ContributorID.

## Features

- ✅ Clears all existing cases, contributions, and notifications
- ✅ Creates Supabase Auth users for each unique **ContributorID** (not by name)
- ✅ Creates corresponding records in the `users` table
- ✅ Generates email addresses using ContributorID only (format: `contributor<ContributorID>@contributor.meenma3ana.local`)
- ✅ Auto-confirms email addresses so users can login immediately
- ✅ Creates cases from CSV data with proper categorization
- ✅ Creates contributions linked to proper user accounts
- ✅ Creates approval statuses for all contributions
- ✅ Updates case amounts automatically
- ✅ Handles duplicate contributor names correctly (uses ContributorID as unique key)

## Requirements

1. **Environment Variables** (in `.env.local`):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **CSV File**: `docs/cases/contributions.csv` must exist

3. **Database Setup**: 
   - Case categories must exist
   - At least one payment method must exist (preferably 'cash')
   - At least one admin user should exist (for `created_by` field)

## Usage

```bash
# From project root
node scripts/import-contributions-with-users.js
```

## CSV Structure

The script expects the following columns:
- **ID**: Case ID
- **Description**: Case description (Arabic)
- **Contributor**: Contributor name
- **ContributorID**: Unique contributor identifier (numeric)
- **Amount**: Contribution amount
- **Month**: Date

## What Happens

1. **Data Clearing**: All cases, contributions, notifications, and related data are deleted
2. **User Creation**: For each unique **ContributorID** in the CSV:
   - Creates a Supabase Auth user with email/password
   - Auto-confirms the email
   - Creates a record in the `users` table with role 'donor'
   - Email format: `contributor<ContributorID>@contributor.meenma3ana.local`
   - Uses ContributorID as the unique identifier (not name)
   - If multiple rows have the same ContributorID but different names, uses the longest name
3. **Case Creation**: Creates cases from CSV with:
   - Bilingual titles (Arabic from CSV, English auto-generated)
   - Proper categorization based on Arabic title
   - Target amounts calculated from contributions
4. **Contribution Creation**: Creates contributions linked to:
   - Proper user accounts (not all to creator)
   - Cases
   - Payment method (defaults to 'cash')
   - Status: 'approved'
5. **Approval Statuses**: Creates approval statuses for all contributions
6. **Case Amounts**: Updates case `current_amount` based on contributions

## User Accounts

### Email Format
Contributors get email addresses based on their ContributorID only (no Arabic names):
- `contributor0001@contributor.meenma3ana.local` (ContributorID: 1)
- `contributor0025@contributor.meenma3ana.local` (ContributorID: 25)
- `contributor0083@contributor.meenma3ana.local` (ContributorID: 83)

All emails are ASCII-only for compatibility and consistency.

### Password Reset
All contributors can:
1. Go to the login page
2. Click "Forgot Password"
3. Enter their email address
4. Receive a password reset email
5. Set a new password

### Admin Management
Admins can:
- View all contributors in the admin panel
- Modify contributor profiles
- Update names, phone numbers, addresses, etc.
- Change user roles if needed

## Important Notes

⚠️ **This script will DELETE all existing cases and contributions!**

⚠️ **Make sure to backup your database before running this script!**

⚠️ **The script uses the service role key, which bypasses RLS policies**

## Troubleshooting

### Error: Missing environment variables
- Make sure `.env.local` exists in project root
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### Error: CSV file not found
- Make sure `docs/cases/contributions.csv` exists
- Check file path is correct

### Error: No payment methods found
- Create at least one payment method in the database
- Preferably create one with code 'cash'

### Error: No admin user found
- Create at least one admin user first
- Or the script will use the first contributor as `created_by`

### Users can't login
- Check that email confirmation is enabled in Supabase Auth settings
- Verify the email format is correct
- Users can reset passwords using "Forgot Password"

## Example Output

```
🚀 Starting contribution import with user accounts...

🗑️  Clearing all cases, contributions, and notifications...
   ✓ Cleared notifications
   ✓ Cleared contribution approval statuses
   ✓ Cleared contributions
   ✓ Cleared cases and related data

✅ All data cleared successfully!

📊 Parsing CSV data...
📋 Found 158 unique cases
👥 Found 87 unique contributors

👤 Creating user accounts for contributors...
   Creating account for: أنا
   ✓ Created auth user: أنا@contributor.meenma3ana.local
   ✓ Created app user record: أنا
   ...

✅ Created 87 new user accounts

📂 Fetching case categories...
💳 Fetching payment methods...
📝 Creating cases...
✅ Created 158 cases

💰 Creating contributions...
   ✓ Inserted batch 1 (100/536 contributions)
   ✓ Inserted batch 2 (200/536 contributions)
   ...
✅ Created 536 contributions

✅ Creating approval statuses...
✅ Created 536 approval statuses

📊 Updating case amounts...
✅ Updated case amounts

============================================================
📊 IMPORT SUMMARY
============================================================
✅ Created 87 user accounts
✅ Created 158 cases
✅ Created 536 contributions
✅ Created 536 approval statuses

💡 All contributors can now:
   - Login using their email (format: contributor<ContributorID>@contributor.meenma3ana.local)
   - Reset their password using the "Forgot Password" feature
   - Admin can modify their profiles in the admin panel
   - Each ContributorID has exactly one user account (no duplicates)
   - All emails are ASCII-only (no Arabic characters)
============================================================

✨ Import completed successfully!
```

