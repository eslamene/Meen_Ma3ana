# Database Cleanup Strategy

## Overview

This document outlines the strategy for cleaning up database scripts and ensuring the Drizzle ORM schema matches the actual database state.

## Current State

### Drizzle Schema (`drizzle/schema.ts`)
- **Purpose**: Single source of truth for database structure
- **Location**: `drizzle/schema.ts`
- **Status**: ✅ Updated with all current tables

### Migration Files

#### Drizzle Migrations (`drizzle/migrations/`)
- **Purpose**: Auto-generated migrations from schema changes
- **Location**: `drizzle/migrations/`
- **Status**: Should be regenerated after schema updates

#### Supabase Migrations (`supabase/migrations/`)
- **Purpose**: Manual SQL migrations (RLS policies, triggers, functions, data migrations)
- **Location**: `supabase/migrations/`
- **Status**: 117+ files, many incremental changes
- **Action**: Archive old migrations, keep only essential ones

## Strategy

### Phase 1: Schema Synchronization ✅

1. **Update Drizzle Schema**
   - ✅ Added all missing tables:
     - `beneficiaries`
     - `beneficiary_documents`
     - `case_files`
     - `site_activity_log`
     - `storage_rules`
     - `admin_roles`
     - `admin_permissions`
     - `admin_role_permissions`
     - `admin_user_roles`
     - `admin_menu_items`
     - `id_types`
     - `cities`
   - ✅ Added `beneficiary_id` to `cases` table
   - ✅ Added relations for all new tables

2. **Verify Schema Completeness**
   ```bash
   node scripts/cleanup/audit-database-schema.js
   ```

### Phase 2: Migration Cleanup

#### 2.1 Archive Old Supabase Migrations

**Keep:**
- Base table creation migrations
- Essential RLS policy migrations
- Critical trigger/function migrations
- Data migration scripts (if needed for reference)

**Archive:**
- Incremental fix migrations (consolidate into base)
- Duplicate migrations
- Test/debug migrations
- Rollback migrations (keep documentation only)

**Action:**
```bash
# Create archive directory
mkdir -p supabase/migrations/archived

# Move old migrations (review first!)
# Example: Move incremental fixes
mv supabase/migrations/0*_fix_*.sql supabase/migrations/archived/
```

#### 2.2 Generate Fresh Drizzle Migration

After schema updates:

```bash
# Generate migration from current schema
npm run db:generate

# Review generated migration
# Apply to database (if needed)
npm run db:migrate
```

### Phase 3: Documentation

#### 3.1 Migration Categories

**Base Migrations** (Keep):
- `000_complete_admin_setup.sql` - Admin system setup
- `create_beneficiaries_table.sql` - Beneficiaries table
- `unify_case_files.sql` - Case files table
- `074_create_site_activity_log.sql` - Activity logging
- `058_create_storage_rules_table.sql` - Storage rules

**RLS/Policy Migrations** (Keep essential):
- Keep only the final, consolidated RLS policies
- Archive incremental RLS fixes

**Data Migrations** (Archive after verification):
- Keep for reference, but mark as applied
- Document in migration log

#### 3.2 Migration Naming Convention

**New migrations should follow:**
```
{timestamp}_{description}.sql
```

**Example:**
```
20250101_add_beneficiary_verification.sql
```

### Phase 4: Future Migration Strategy

#### 4.1 Schema Changes

1. **Update Drizzle Schema First**
   - Modify `drizzle/schema.ts`
   - Add relations if needed

2. **Generate Migration**
   ```bash
   npm run db:generate
   ```

3. **Review Generated Migration**
   - Check SQL output
   - Ensure it matches intent

4. **Apply Migration**
   ```bash
   npm run db:migrate
   ```

#### 4.2 RLS/Policy Changes

1. **Create Supabase Migration**
   - Add to `supabase/migrations/`
   - Use descriptive name
   - Include rollback instructions if needed

2. **Apply Manually or via Supabase CLI**
   ```bash
   supabase db push
   ```

#### 4.3 Data Migrations

1. **Create Separate Migration File**
   - Use descriptive name
   - Include verification queries
   - Document rollback procedure

2. **Test in Development First**
   - Always test data migrations
   - Backup before running

## Maintenance

### Regular Tasks

1. **Monthly Audit**
   - Run schema audit script
   - Check for drift between schema and database
   - Review migration files

2. **Quarterly Cleanup**
   - Archive old migrations
   - Consolidate incremental changes
   - Update documentation

### Tools

- **Schema Audit**: `scripts/cleanup/audit-database-schema.js`
- **Migration Generation**: `npm run db:generate`
- **Migration Application**: `npm run db:migrate`
- **Database Studio**: `npm run db:studio`

## Checklist

- [x] Update Drizzle schema with all tables
- [x] Add missing relations
- [x] Fix array type definitions
- [ ] Generate fresh Drizzle migration
- [ ] Archive old Supabase migrations
- [ ] Create migration documentation
- [ ] Test schema sync
- [ ] Update team documentation

## Notes

- **Never delete migrations** that have been applied to production
- **Always backup** before running migrations
- **Test migrations** in development first
- **Document breaking changes** in migration files
- **Keep migration files** in version control

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Array Types](https://www.postgresql.org/docs/current/arrays.html)

