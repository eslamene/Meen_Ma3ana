#!/bin/bash

# Script to consolidate categories and recategorize cases
# This script runs both consolidation and recategorization SQL files

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Category Consolidation and Recategorization${NC}"
echo ""
echo "This script will:"
echo "  1. Consolidate duplicate categories (keep one canonical category per name)"
echo "  2. Update all cases to use canonical category IDs"
echo "  3. Recategorize cases based on their Arabic titles"
echo ""

# Confirmation prompt
read -p "Are you sure you want to proceed? Type 'YES' to confirm: " confirmation

if [ "$confirmation" != "YES" ]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting category consolidation and recategorization...${NC}"
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
        if echo "$DATABASE_URL_RAW" | grep -q '://.*:.*@'; then
            # URL has password, check if it needs encoding
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

# SQL files are in the same directory as this script
CONSOLIDATE_SQL="$SCRIPT_DIR/consolidate-categories.sql"
RECATEGORIZE_SQL="$SCRIPT_DIR/recategorize-cases.sql"

# Check if SQL files exist
if [ ! -f "$CONSOLIDATE_SQL" ]; then
    echo -e "${RED}Error: SQL file not found at $CONSOLIDATE_SQL${NC}"
    exit 1
fi

if [ ! -f "$RECATEGORIZE_SQL" ]; then
    echo -e "${RED}Error: SQL file not found at $RECATEGORIZE_SQL${NC}"
    exit 1
fi

echo -e "${GREEN}✓ SQL files found${NC}"
echo ""

# Step 1: Consolidate categories
echo -e "${YELLOW}Step 1: Consolidating duplicate categories...${NC}"
export PGSSLMODE=require
psql "$DATABASE_URL" -f "$CONSOLIDATE_SQL" 2>&1

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}✗ Category consolidation failed. Check the error messages above.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Category consolidation complete${NC}"
echo ""

# Step 2: Recategorize cases
echo -e "${YELLOW}Step 2: Recategorizing cases based on Arabic titles...${NC}"
psql "$DATABASE_URL" -f "$RECATEGORIZE_SQL" 2>&1

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}✗ Case recategorization failed. Check the error messages above.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Case recategorization complete${NC}"
echo ""
echo -e "${GREEN}✅ All operations completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo "  - Duplicate categories have been consolidated"
echo "  - All cases have been updated to use canonical category IDs"
echo "  - Cases have been recategorized based on their Arabic titles"
echo ""
echo "You should now have exactly 9 unique categories:"
echo "  1. Medical Support"
echo "  2. Educational Assistance"
echo "  3. Housing & Rent"
echo "  4. Home Appliances"
echo "  5. Emergency Relief"
echo "  6. Livelihood & Business"
echo "  7. Community & Social"
echo "  8. Basic Needs & Clothing"
echo "  9. Other Support"

