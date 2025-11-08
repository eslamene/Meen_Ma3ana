#!/bin/bash

# Script to clear all cases and related data from the database
# WARNING: This will DELETE ALL cases and related data!

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  WARNING: This will DELETE ALL cases and related data!${NC}"
echo ""
echo "This includes:"
echo "  - All cases"
echo "  - All case-related contributions"
echo "  - All contribution approval statuses"
echo "  - All case files, images, updates, status history"
echo "  - All case-related notifications"
echo "  - All case-related sponsorships and recurring contributions"
echo ""
echo -e "${YELLOW}Tables that will be KEPT:${NC}"
echo "  - case_categories (reference data)"
echo "  - users (user accounts)"
echo "  - payment_methods (reference data)"
echo "  - projects (separate from cases)"
echo "  - Other system tables"
echo ""

# Confirmation prompt
read -p "Are you sure you want to proceed? Type 'YES' to confirm: " confirmation

if [ "$confirmation" != "YES" ]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Clearing all cases and related data...${NC}"
echo ""

# Get the project root directory (two levels up from this script)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
ENV_FILE="$PROJECT_ROOT/.env.local"

# Try to load DATABASE_URL from .env.local file
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}✓ Found .env.local file at: $ENV_FILE${NC}"
    # Extract DATABASE_URL from .env.local file (handles comments and empty lines)
    # Remove quotes if present
    DATABASE_URL_RAW=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f2- | sed 's/^["'\'']//;s/["'\'']$//' | head -1)
    
    if [ -n "$DATABASE_URL_RAW" ]; then
        # Check if the URL needs password encoding
        # If it contains unencoded special characters in the password, we need to encode them
        # Extract the password part and encode special characters
        if echo "$DATABASE_URL_RAW" | grep -q '://.*:.*@'; then
            # URL has password, check if it needs encoding
            # Extract password (between : and @)
            PASSWORD_PART=$(echo "$DATABASE_URL_RAW" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
            # Check if password contains unencoded special chars that need encoding
            if echo "$PASSWORD_PART" | grep -qE '[!@#$%^&*()+=|\\`~]'; then
                # Password needs encoding - use Python to properly URL-encode it
                if command -v python3 &> /dev/null; then
                    ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PASSWORD_PART', safe=''))")
                    # Replace the password in the URL
                    DATABASE_URL=$(echo "$DATABASE_URL_RAW" | sed "s|:$PASSWORD_PART@|:$ENCODED_PASSWORD@|")
                    echo -e "${GREEN}✓ Loaded and encoded DATABASE_URL from .env.local file${NC}"
                else
                    # Fallback: try to encode common special characters manually
                    ENCODED_PASSWORD=$(echo "$PASSWORD_PART" | sed 's/!/%21/g; s/#/%23/g; s/\$/%24/g; s/%/%25/g; s/&/%26/g; s/+/%2B/g; s/=/%3D/g')
                    DATABASE_URL=$(echo "$DATABASE_URL_RAW" | sed "s|:$PASSWORD_PART@|:$ENCODED_PASSWORD@|")
                    echo -e "${GREEN}✓ Loaded DATABASE_URL from .env.local file (basic encoding applied)${NC}"
                fi
            else
                DATABASE_URL="$DATABASE_URL_RAW"
                echo -e "${GREEN}✓ Loaded DATABASE_URL from .env.local file${NC}"
            fi
        else
            DATABASE_URL="$DATABASE_URL_RAW"
            echo -e "${GREEN}✓ Loaded DATABASE_URL from .env.local file${NC}"
        fi
        # Add connection parameters to disable GSSAPI (Supabase pooler doesn't support it)
        # Check if URL already has query parameters
        if echo "$DATABASE_URL" | grep -q '?'; then
            # URL already has parameters, append gssencmode
            if echo "$DATABASE_URL" | grep -qv 'gssencmode'; then
                DATABASE_URL="${DATABASE_URL}&gssencmode=disable"
            fi
        else
            # No query parameters, add them
            DATABASE_URL="${DATABASE_URL}?gssencmode=disable"
        fi
        export DATABASE_URL
    else
        echo -e "${YELLOW}⚠ DATABASE_URL not found in .env.local file${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env.local file not found at: $ENV_FILE${NC}"
fi

# If DATABASE_URL is set from environment, also add gssencmode if not present
if [ -n "$DATABASE_URL" ] && echo "$DATABASE_URL" | grep -qv 'gssencmode'; then
    if echo "$DATABASE_URL" | grep -q '?'; then
        DATABASE_URL="${DATABASE_URL}&gssencmode=disable"
    else
        DATABASE_URL="${DATABASE_URL}?gssencmode=disable"
    fi
    export DATABASE_URL
fi

# Check if DATABASE_URL is set (either from .env.local or environment)
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL is not set.${NC}"
    echo ""
    echo "Please set it using one of these methods:"
    echo ""
    echo "Option 1: Add it to your .env.local file:"
    echo "  DATABASE_URL='postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres'"
    echo ""
    echo "Option 2: Export it in your terminal:"
    echo "  export DATABASE_URL='postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres'"
    echo ""
    exit 1
fi

# SQL file is in the same directory as this script
SQL_FILE="$SCRIPT_DIR/clear-all-cases-data.sql"

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}Error: SQL file not found at $SQL_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ SQL file found${NC}"
echo ""

# Run the SQL script with SSL mode
export PGSSLMODE=require
psql "$DATABASE_URL" -f "$SQL_FILE" 2>&1

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All cases and related data have been cleared!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Run the insert script to populate fresh data:"
    echo "     cd docs/cases && ./run-insert-script.sh"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Script execution failed. Check the error messages above.${NC}"
    exit 1
fi

