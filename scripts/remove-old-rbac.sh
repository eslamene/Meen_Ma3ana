#!/bin/bash

# Remove Old RBAC Code Script
# This script removes old RBAC code after migration to new admin system

set -e

echo "🗑️  Removing old RBAC code..."
echo ""

# Directories to remove
DIRS_TO_REMOVE=(
  "src/lib/rbac"
  "src/components/admin/rbac"
  "src/app/api/admin/rbac"
  "src/app/api/debug/rbac-data"
  "src/app/api/debug/rbac"
  "src/app/[locale]/admin/rbac-modular"
  "src/app/admin/rbac-modular"
)

# Files to remove
FILES_TO_REMOVE=(
  "src/lib/hooks/useSimpleRBAC.ts"
  "src/lib/hooks/useDatabasePermissions.ts"
  "src/lib/hooks/usePermissions.ts"
  "src/hooks/useRBACData.ts"
  "src/lib/utils/rbac-helpers.ts"
  "src/lib/server/menu.ts"
  "src/app/api/admin/rbac/route.ts"
  "src/app/api/admin/permission-modules/route.ts"
  "src/app/api/admin/assign-user-roles/route.ts"
  "src/app/api/admin/permissions/options/route.ts"
  "src/app/api/test-role/route.ts"
  "src/app/[locale]/test-server-menu/page.tsx"
  "src/app/[locale]/example-server-menu/page.tsx"
)

# Migrations to remove (keep for reference, but mark as deprecated)
MIGRATIONS_TO_REMOVE=(
  "supabase/migrations/step1_create_rbac_tables.sql"
  "supabase/migrations/step2_migrate_data.sql"
  "supabase/migrations/step3_fix_donor_permissions.sql"
  "supabase/migrations/step4_add_indexes_and_rls.sql"
  "supabase/migrations/fix_rbac_system.sql"
  "supabase/migrations/diagnose_rbac_issue.sql"
  "supabase/migrations/enhance_rbac_audit_logging.sql"
  "supabase/migrations/add_admin_contributions_rbac.sql"
  "supabase/migrations/safe_old_rbac_removal.sql"
  "supabase/migrations/complete_old_rbac_removal.sql"
  "supabase/migrations/cleanup_old_rbac_simple.sql"
  "supabase/migrations/cleanup_old_rbac_tables.sql"
  "drizzle/migrations/0005_create_rbac_tables.sql"
  "drizzle/migrations/0006_add_permission_modules.sql"
  "drizzle/migrations/0007_add_visitor_role.sql"
  "drizzle/migrations/0008_add_permission_constraints.sql"
)

echo "📁 Removing directories..."
for dir in "${DIRS_TO_REMOVE[@]}"; do
  if [ -d "$dir" ]; then
    echo "  Removing: $dir"
    rm -rf "$dir"
  fi
done

echo ""
echo "📄 Removing files..."
for file in "${FILES_TO_REMOVE[@]}"; do
  if [ -f "$file" ]; then
    echo "  Removing: $file"
    rm -f "$file"
  fi
done

echo ""
echo "📚 Migrations (keeping for reference, but deprecated)..."
echo "  Note: Old migrations are kept for reference but are no longer used"
echo "  New system uses: supabase/migrations/001_create_clean_admin_system.sql"

echo ""
echo "✅ Old RBAC code removed!"
echo ""
echo "⚠️  Next steps:"
echo "  1. Update components that import old RBAC hooks"
echo "  2. Update pages that use old RBAC system"
echo "  3. Test the application thoroughly"
echo "  4. Remove old migration files if you're sure they're not needed"

