#!/bin/bash

# Migration Helper Script
# Helps migrate existing users to the new admin system

set -e

echo "🔄 Migrating existing users to new admin system..."
echo ""

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found"
    echo ""
    echo "Applying migration..."
    supabase db push
    
    echo ""
    echo "📊 Running user migration..."
    echo "This will assign 'donor' role to all existing users"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Apply the migration SQL
        supabase db execute -f supabase/migrations/002_migrate_existing_users.sql
        
        echo ""
        echo "✅ Migration complete!"
        echo ""
        echo "📋 Next steps:"
        echo "  1. Review role assignments in your database"
        echo "  2. Manually assign admin/moderator roles as needed"
        echo "  3. Test the new admin system"
    else
        echo "Migration cancelled"
    fi
else
    echo "⚠️  Supabase CLI not found"
    echo ""
    echo "To apply the migration manually:"
    echo "  1. Connect to your database"
    echo "  2. Run: psql -U postgres -d your_database -f supabase/migrations/002_migrate_existing_users.sql"
    echo ""
    echo "Or use your database management tool to execute the SQL file"
fi

