# Notification System - Donor Notifications Fix

## Issue
Donors were only seeing `contribution_approved` notifications, but not `contribution_pending` notifications for their contributions. They should see both types to track the full lifecycle of their contributions.

## Solution

### Updated Import Script
The `scripts/02-import-contributions-with-users.js` script now creates **both** notification types for donors:

1. **`contribution_pending`** - Created when contribution is submitted (uses contribution's `created_at`)
2. **`contribution_approved`** - Created when contribution is approved (uses `created_at + 1 minute`)

### Notification Flow

**For Admins:**
- Receive `contribution_pending` notifications for all new contributions

**For Donors:**
- Receive `contribution_pending` notification when they submit a contribution
- Receive `contribution_approved` notification when their contribution is approved

## Backfilling Existing Data

If you have existing contributions that only have `contribution_approved` notifications for donors, run:

```bash
node scripts/backfill-donor-pending-notifications.js
```

This script will:
- Find all approved contributions
- Create `contribution_pending` notifications for donors (if they don't already exist)
- Skip notifications that already exist to avoid duplicates

## Expected Results

After running the backfill script:
- **Admins**: Will see `contribution_pending` notifications (535 notifications)
- **Donors**: Will see both `contribution_pending` AND `contribution_approved` notifications for their contributions
  - Each donor will have 2 notifications per contribution (pending + approved)
  - Total donor notifications: 535 × 2 = 1,070 notifications

## Verification

Check notification counts:
```bash
# Check total notifications
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
(async () => {
  const { count: pending } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('type', 'contribution_pending');
  const { count: approved } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('type', 'contribution_approved');
  console.log('Pending:', pending);
  console.log('Approved:', approved);
  console.log('Total:', (pending || 0) + (approved || 0));
})();
"
```

Expected:
- Pending: ~1,070 (535 for admins + 535 for donors)
- Approved: ~535 (for donors)
- Total: ~1,605 notifications

## Future Imports

The updated import script (`02-import-contributions-with-users.js`) will automatically create both notification types for donors going forward. No manual backfill needed for new imports.

