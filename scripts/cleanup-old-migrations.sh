#!/bin/bash

# Cleanup Unwanted Old RBAC Files
# This script removes old RBAC migration files and scripts that are no longer needed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧹 Cleaning up unwanted old RBAC files..."
echo ""

cd "$PROJECT_DIR"

# Old migration files to remove (superseded by 000_complete_admin_setup.sql)
OLD_MIGRATIONS=(
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
    "supabase/migrations/001_create_clean_admin_system.sql"  # Superseded by 000_complete_admin_setup.sql
    "supabase/migrations/002_migrate_existing_users.sql"      # Included in 000_complete_admin_setup.sql
)

# Old drizzle migrations to remove
OLD_DRIZZLE_MIGRATIONS=(
    "drizzle/migrations/0005_create_rbac_tables.sql"
    "drizzle/migrations/0006_add_permission_modules.sql"
    "drizzle/migrations/0007_add_visitor_role.sql"
    "drizzle/migrations/0008_add_permission_constraints.sql"
)

echo "📁 Removing old migration files..."
for file in "${OLD_MIGRATIONS[@]}"; do
    if [ -f "$file" ]; then
        echo "  Removing: $file"
        rm -f "$file"
    fi
done

echo ""
echo "📁 Removing old drizzle migrations..."
for file in "${OLD_DRIZZLE_MIGRATIONS[@]}"; do
    if [ -f "$file" ]; then
        echo "  Removing: $file"
        rm -f "$file"
    fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Files kept (essential):"
echo "  ✅ supabase/migrations/000_complete_admin_setup.sql (complete setup)"
echo "  ✅ supabase/migrations/000_cleanup_old_rbac.sql (standalone cleanup if needed)"
echo ""
echo "📝 Note: Old RBAC code files in src/ will be removed separately"
echo "   Run: ./scripts/remove-old-rbac.sh (after testing new system)"

