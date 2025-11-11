# Contribution Import Script - Summary (Updated)

## What Was Created

A comprehensive script (`scripts/import-contributions-with-users.js`) that imports contributions from CSV and creates proper user accounts based on **ContributorID** (not contributor name).

## Key Changes from Previous Version

### ✅ Uses ContributorID as Unique Identifier
- **Before**: Created users based on contributor name (could create duplicates)
- **Now**: Creates users based on ContributorID (guarantees one user per ContributorID)

### ✅ Better Email Generation
- Email uses ContributorID only: `contributor<ContributorID>@contributor.meenma3ana.local`
- **No Arabic characters** in email addresses (ASCII-only)
- Ensures uniqueness and compatibility
- Example: `contributor0001@contributor.meenma3ana.local` for ContributorID 1

### ✅ Handles Duplicate Names
- If same ContributorID appears with different names, uses the longest name
- All contributions for same ContributorID go to same user account

## Key Features

### 1. Data Clearing
- Clears all cases, contributions, notifications, and related data
- Ensures a clean slate before importing

### 2. User Account Creation (by ContributorID)
- Creates Supabase Auth users for each unique ContributorID
- Generates email addresses using ContributorID
- Auto-confirms emails so users can login immediately
- Creates corresponding records in the `users` table
- Stores ContributorID in user metadata for reference

### 3. Case Creation
- Creates cases from CSV data
- Bilingual titles (Arabic from CSV, English auto-generated)
- Proper categorization based on Arabic title
- Target amounts calculated from contributions

### 4. Contribution Creation
- Creates contributions linked to proper user accounts (by ContributorID)
- Links to cases and payment methods
- Sets status to 'approved'
- Creates approval statuses automatically

### 5. Case Amount Updates
- Automatically updates case `current_amount` based on contributions

## CSV Structure

The script expects:
- **ID**: Case ID
- **Description**: Case description (Arabic)
- **Contributor**: Contributor name
- **ContributorID**: Unique contributor identifier (numeric, required)
- **Amount**: Contribution amount
- **Month**: Date

**Note**: Contributions with ContributorID <= 0 are skipped (unknown contributors).

## User Account Details

### Email Format
- Format: `contributor<ContributorID>@contributor.meenma3ana.local`
- **ASCII-only** (no Arabic characters)
- Example: `contributor0001@contributor.meenma3ana.local` (ContributorID: 1)

### Password Reset
All contributors can reset their passwords:
1. Go to login page
2. Click "Forgot Password"
3. Enter their email
4. Receive reset email
5. Set new password

### Admin Management
Admins can:
- View all contributors in admin panel
- See ContributorID in user metadata
- Modify profiles (names, phone, address, etc.)
- Change user roles if needed

## Usage

```bash
# Make sure .env.local has:
# NEXT_PUBLIC_SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...

# Run the script
node scripts/import-contributions-with-users.js
```

## Important Notes

⚠️ **This script DELETES all existing cases and contributions!**

⚠️ **Backup your database before running!**

⚠️ **Uses service role key (bypasses RLS)**

⚠️ **Contributions with ContributorID <= 0 are skipped**

## Benefits of ContributorID Approach

1. **No Duplicates**: Each ContributorID gets exactly one user account
2. **Consistent**: Same ContributorID always maps to same user
3. **Traceable**: ContributorID stored in user metadata
4. **Scalable**: Works even if contributor names change or duplicate

## Files Created/Updated

1. `scripts/import-contributions-with-users.js` - Main import script (updated)
2. `docs/cases/IMPORT_WITH_USERS_README.md` - Documentation (updated)
3. `docs/cases/IMPORT_SUMMARY.md` - This file (updated)

## Next Steps

1. Review the script to ensure it meets your requirements
2. Backup your database
3. Run the script: `node scripts/import-contributions-with-users.js`
4. Verify the import was successful
5. Test login with a contributor account
6. Test password reset functionality

## Troubleshooting

### Error: Invalid ContributorID
- Check CSV for non-numeric ContributorID values
- Contributions with ContributorID <= 0 are automatically skipped

### Error: No user ID found for ContributorID
- ContributorID might be 0 or negative (skipped)
- Check CSV for valid ContributorID values

### Users can't login
- Check that email confirmation is enabled in Supabase Auth settings
- Verify the email format is correct
- Users can reset passwords using "Forgot Password"

See `docs/cases/IMPORT_WITH_USERS_README.md` for detailed troubleshooting guide.
