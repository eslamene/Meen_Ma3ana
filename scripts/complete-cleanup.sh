#!/bin/bash

# Complete Cleanup Script - Remove All Old RBAC Files
# This removes old RBAC migrations, docs, and code files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧹 Complete cleanup of old RBAC system..."
echo ""

cd "$PROJECT_DIR"

# Step 1: Remove old RBAC documentation (keep new admin system docs)
echo "📚 Removing old RBAC documentation..."
OLD_DOCS=(
    "docs/RBAC_USER_GUIDE.md"
    "docs/RBAC_MANAGEMENT_GUIDE.md"
    "docs/DATABASE_RBAC_MIGRATION.md"
    "docs/RBAC_NAVIGATION_SPLIT.md"
    "docs/RBAC_SYSTEM.md"
)

for doc in "${OLD_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo "  Removing: $doc"
        rm -f "$doc"
    fi
done

# Step 2: Remove old migration files (already done, but verify)
echo ""
echo "📁 Verifying old migrations are removed..."
if [ -f "supabase/migrations/step1_create_rbac_tables.sql" ]; then
    echo "  ⚠️  Some old migrations still exist, running cleanup..."
    ./scripts/cleanup-old-migrations.sh
else
    echo "  ✅ Old migrations already cleaned up"
fi

# Step 3: List what's kept
echo ""
echo "✅ Cleanup Summary:"
echo ""
echo "📋 Essential files kept:"
echo "  ✅ supabase/migrations/000_complete_admin_setup.sql"
echo "  ✅ supabase/migrations/000_cleanup_old_rbac.sql"
echo "  ✅ docs/ADMIN_SYSTEM_MIGRATION.md"
echo "  ✅ docs/ADMIN_SYSTEM_SUMMARY.md"
echo "  ✅ docs/COMPLETE_SETUP_READY.md"
echo ""
echo "📝 Next steps:"
echo "  1. Test the new admin system"
echo "  2. Update components to use new hooks"
echo "  3. Run: ./scripts/remove-old-rbac.sh (to remove old code files)"
echo ""
echo "⚠️  Note: Old RBAC code files in src/ will be removed after testing"
echo "   This includes:"
echo "   - src/lib/rbac/"
echo "   - src/components/admin/rbac/"
echo "   - src/app/api/admin/rbac/"
echo "   - Old hooks and services"

