#!/bin/bash

# Complete Admin System Setup Script (Updated)
# This script runs the comprehensive SQL migration and verifies everything
# Works even if not in a Supabase project directory

set -e

echo "🚀 Starting Complete Admin System Setup..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATION_FILE="$PROJECT_DIR/supabase/migrations/000_complete_admin_setup.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "✅ Migration file found: $MIGRATION_FILE"
echo ""

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found"
    echo ""
    
    # Check if we're in a Supabase project
    if [ -f "$PROJECT_DIR/supabase/config.toml" ]; then
        echo "✅ Supabase project detected"
        echo ""
        echo "📋 This will:"
        echo "   1. Create all admin system tables"
        echo "   2. Insert default roles and permissions"
        echo "   3. Set up menu items"
        echo "   4. Create helper functions"
        echo "   5. Migrate existing users (assign 'donor' role)"
        echo "   6. Run verification queries"
        echo ""
        read -p "Continue? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo "🔄 Applying migration..."
            cd "$PROJECT_DIR"
            supabase db execute -f "$MIGRATION_FILE"
            
            echo ""
            echo "✅ Migration complete!"
            echo ""
            echo "📊 Check the output above for verification results"
        else
            echo "Migration cancelled"
        fi
    else
        echo "⚠️  Not in a Supabase project directory"
        echo ""
        echo "You can still apply the migration manually:"
        echo ""
        echo "Option 1: Using Supabase CLI with connection string"
        echo "  supabase db execute --db-url 'your-connection-string' -f $MIGRATION_FILE"
        echo ""
        echo "Option 2: Using psql directly"
        echo "  psql -U postgres -d your_database -f $MIGRATION_FILE"
        echo ""
        echo "Option 3: Copy SQL and run in Supabase Dashboard"
        echo "  1. Open Supabase Dashboard > SQL Editor"
        echo "  2. Copy contents of: $MIGRATION_FILE"
        echo "  3. Paste and execute"
        echo ""
        echo "Option 4: Initialize Supabase project"
        echo "  cd $PROJECT_DIR"
        echo "  supabase init"
        echo "  Then run this script again"
        echo ""
        read -p "Would you like to see the SQL file location? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo "📄 Migration file location:"
            echo "   $MIGRATION_FILE"
            echo ""
            echo "You can open it with:"
            echo "   cat $MIGRATION_FILE"
            echo "   or"
            echo "   code $MIGRATION_FILE"
        fi
    fi
else
    echo "⚠️  Supabase CLI not found"
    echo ""
    echo "To apply manually:"
    echo ""
    echo "Option 1: Install Supabase CLI"
    echo "  brew install supabase/tap/supabase"
    echo ""
    echo "Option 2: Using psql directly"
    echo "  psql -U postgres -d your_database -f $MIGRATION_FILE"
    echo ""
    echo "Option 3: Copy SQL and run in Supabase Dashboard"
    echo "  1. Open Supabase Dashboard > SQL Editor"
    echo "  2. Copy contents of: $MIGRATION_FILE"
    echo "  3. Paste and execute"
    echo ""
    echo "📄 Migration file location:"
    echo "   $MIGRATION_FILE"
fi
