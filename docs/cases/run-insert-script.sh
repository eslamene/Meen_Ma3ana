#!/bin/bash

# Script to run the large SQL insert script directly via psql
# This bypasses the SQL Editor size limitations

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running large SQL insert script via psql...${NC}"
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
    echo "Option 3: Get it from Supabase Dashboard:"
    echo "  1. Go to Project Settings > Database"
    echo "  2. Copy the 'Connection string' under 'Connection pooling'"
    echo "  3. Replace [YOUR-PASSWORD] with your database password"
    echo ""
    echo "Option 4: Use Supabase connection string format:"
    echo "  postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
    echo ""
    exit 1
fi

# SQL file is in the same directory as this script
SQL_FILE="$SCRIPT_DIR/insert-cases-from-csv.sql"

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}Error: SQL file not found at $SQL_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ SQL file found${NC}"
echo -e "${GREEN}✓ File size: $(du -h "$SQL_FILE" | cut -f1)${NC}"
echo -e "${GREEN}✓ Line count: $(wc -l < "$SQL_FILE")${NC}"
echo ""
echo -e "${YELLOW}Connecting to database and running script...${NC}"
echo ""

# Run the SQL script with SSL mode
# Supabase requires SSL, and we've already disabled GSSAPI in the connection string
export PGSSLMODE=require
psql "$DATABASE_URL" -f "$SQL_FILE" 2>&1

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Script executed successfully!${NC}"
    echo ""
    echo "Verifying data..."
    PGSSLMODE=require psql "$DATABASE_URL" -c "
        SELECT COUNT(*) as total_cases FROM cases WHERE status = 'published';
        SELECT COUNT(*) as total_contributions FROM contributions WHERE status = 'approved';
        SELECT SUM(amount) as total_raised FROM contributions WHERE status = 'approved';
        SELECT COUNT(DISTINCT donor_id) as unique_contributors FROM contributions WHERE status = 'approved';
        SELECT COUNT(*) as approval_status_records FROM contribution_approval_status;
        SELECT COUNT(*) as notifications_count FROM notifications WHERE type = 'contribution_approved';
    "
else
    echo ""
    echo -e "${RED}✗ Script execution failed. Check the error messages above.${NC}"
    exit 1
fi

