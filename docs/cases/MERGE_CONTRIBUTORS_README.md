# Merge Contributors Utility

This utility script helps you manage contributor accounts when duplicates are created or when you need to reassign contributions.

## Use Cases

1. **Multiple accounts for same contributor**: If the import created duplicate accounts for the same person
2. **Reassign contributions**: Move contributions from one contributor to another
3. **Consolidate accounts**: Merge duplicate accounts automatically

## Features

- ✅ List all contributors with contribution counts
- ✅ Find duplicate contributors (same name)
- ✅ Merge contributions from one user to another
- ✅ Automatically merge all duplicates
- ✅ Update case amounts after merging
- ✅ Optionally delete source user after merging

## Usage

### 1. List All Contributors

See all contributors sorted by contribution count:

```bash
node scripts/merge-contributors.js --list
```

### 2. Find Duplicates

Find contributors with duplicate names:

```bash
node scripts/merge-contributors.js --list-duplicates
```

### 3. Merge Specific Contributors

Move all contributions from one user to another:

```bash
# Basic merge (keeps source user)
node scripts/merge-contributors.js --from=<sourceUserId> --to=<targetUserId>

# Merge and delete source user
node scripts/merge-contributors.js --from=<sourceUserId> --to=<targetUserId> --delete-source
```

**Example:**
```bash
node scripts/merge-contributors.js --from=123e4567-e89b-12d3-a456-426614174000 --to=987fcdeb-51a2-43d7-8901-234567890abc --delete-source
```

### 4. Auto-Merge All Duplicates

Automatically merge all contributors with duplicate names:

```bash
# Preview duplicates (safe, no changes)
node scripts/merge-contributors.js --merge-by-name

# Actually merge duplicates (requires confirmation)
node scripts/merge-contributors.js --merge-by-name --confirm
```

**How it works:**
- Finds all contributors with the same name
- Keeps the account with the most contributions
- Merges all other accounts into it
- Deletes the duplicate accounts

## What Gets Merged

When merging contributors, the script:

1. ✅ Reassigns all contributions (`donor_id` updated)
2. ✅ Updates approval statuses (if admin_id matches)
3. ✅ Recalculates case amounts
4. ✅ Optionally deletes source user (auth + app user)

## Example Workflow

```bash
# Step 1: See what you have
node scripts/merge-contributors.js --list

# Step 2: Find duplicates
node scripts/merge-contributors.js --list-duplicates

# Step 3: Merge specific duplicates
node scripts/merge-contributors.js --from=<duplicateUserId> --to=<mainUserId> --delete-source

# OR: Auto-merge all duplicates
node scripts/merge-contributors.js --merge-by-name --confirm
```

## Example Output

### Listing Contributors
```
📋 Listing all contributors...

ID                                      Name                          Email                                    Contributions
------------------------------------------------------------------------------------------------------------------------
987fcdeb-51a2-43d7-8901-234567890abc   أنا                           أنا@contributor.meenma3ana.local         45
123e4567-e89b-12d3-a456-426614174000   سالي                          سالي@contributor.meenma3ana.local        32
...

Total contributors: 87
Total contributions: 536
```

### Finding Duplicates
```
🔍 Searching for duplicate contributors...

Found 3 duplicate name groups:

1. "أنا" (2 accounts):
   - 987fcdeb-51a2-43d7-8901-234567890abc
     Email: أنا@contributor.meenma3ana.local
     Contributions: 45
   - 123e4567-e89b-12d3-a456-426614174000
     Email: contributor1a2b3c@contributor.meenma3ana.local
     Contributions: 3
```

### Merging Contributors
```
🔄 Merging contributions from 123e4567... to 987fcdeb...

Source: أنا (contributor1a2b3c@contributor.meenma3ana.local)
Target: أنا (أنا@contributor.meenma3ana.local)

Found 3 contributions to reassign

✅ Reassigned 3 contributions
✅ Updated case amounts
✅ Deleted app user record

✅ Merge completed successfully!
```

## Important Notes

⚠️ **Backup your database before merging!**

⚠️ **Merging is irreversible** - once contributions are moved, they can't be automatically moved back

⚠️ **Deleting users** removes both auth and app user records permanently

⚠️ **Case amounts** are automatically recalculated after merging

## Troubleshooting

### Error: User not found
- Make sure you're using the correct user IDs
- Use `--list` to see all user IDs

### Error: Cannot delete user
- User might have other relationships (cases created, etc.)
- Try merging without `--delete-source` first
- Manually delete the user later if needed

### Contributions not updating
- Check that both users exist
- Verify contributions belong to source user
- Check database permissions

## Safety Features

- ✅ Verifies both users exist before merging
- ✅ Shows preview before auto-merging duplicates
- ✅ Requires `--confirm` flag for auto-merge
- ✅ Updates case amounts automatically
- ✅ Handles errors gracefully

