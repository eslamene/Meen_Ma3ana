# Running the Large SQL Insert Script

The `insert-cases-from-csv.sql` file is **1.0MB with 35,132 lines**, which is too large to run via Supabase SQL Editor. You need to run it directly via `psql`.

## Quick Start

### Option 1: Using the provided script (Recommended)

The script automatically reads `DATABASE_URL` from your `.env.local` file.

1. **Make sure your `.env.local` file has DATABASE_URL:**

   ```env
   DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

   Or if you prefer to export it manually:
   ```bash
   export DATABASE_URL='postgresql://postgres:[YOUR-PASSWORD]@[HOST]:[PORT]/postgres'
   ```

2. **Run the script:**

   ```bash
   cd docs/cases
   ./run-insert-script.sh
   ```

### Option 2: Using psql directly

```bash
psql "$DATABASE_URL" -f docs/cases/insert-cases-from-csv.sql
```

### Option 3: Get connection string from Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** > **Database**
3. Under **Connection string**, copy the connection string
4. Replace `[YOUR-PASSWORD]` with your actual database password
5. Use it in the command:

```bash
psql 'postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres' -f docs/cases/insert-cases-from-csv.sql
```

## What the Script Does

The script will:
- ✅ Insert 157 cases
- ✅ Insert 535 contributions (all approved)
- ✅ Insert 535 records into `contribution_approval_status` (all approved)
- ✅ Insert 535 notifications (type: 'contribution_approved')
- ✅ Verify the data after insertion

## Troubleshooting

### Error: "DATABASE_URL is not set"
- Make sure your `.env.local` file has `DATABASE_URL` set
- Or export it: `export DATABASE_URL='...'`
- Check that the connection string is correct

### Error: "psql: command not found"
- Install PostgreSQL client tools:
  - **macOS**: `brew install postgresql`
  - **Ubuntu/Debian**: `sudo apt-get install postgresql-client`
  - **Windows**: Download from [PostgreSQL website](https://www.postgresql.org/download/)

### Error: "password authentication failed"
- Double-check your database password
- Make sure the connection string format is correct

### Error: "connection refused"
- Verify the host and port are correct
- Check if your IP is allowed in Supabase firewall settings

## Verification

After running the script, you should see:
- Total cases: 157
- Total contributions: 535
- Total raised: ~1,207,920 EGP
- Unique contributors: 148
- Approval status records: 535
- Notifications: 535

## Notes

- The script uses a transaction (`BEGIN`/`COMMIT`), so if it fails, all changes will be rolled back
- The script takes approximately 1-2 minutes to complete
- All contributions are automatically approved with admin comments
- All notifications are created for each approved contribution

