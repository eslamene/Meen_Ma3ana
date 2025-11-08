# Complete Admin System Setup - Ready to Run! 🚀

## ✅ Comprehensive SQL Script Created

**File**: `supabase/migrations/000_complete_admin_setup.sql`

This single SQL script does **EVERYTHING**:

1. ✅ Creates all admin system tables
2. ✅ Creates indexes for performance
3. ✅ Inserts default roles (visitor, donor, moderator, admin, super_admin)
4. ✅ Inserts default permissions (17 permissions)
5. ✅ Assigns permissions to roles
6. ✅ Creates menu items
7. ✅ Sets up RLS policies
8. ✅ Creates helper functions
9. ✅ Migrates existing users (assigns 'donor' role)
10. ✅ Runs comprehensive verification queries

## 🚀 How to Run

### Option 1: Using the Helper Script (Easiest)

```bash
./scripts/setup-admin-system.sh
```

### Option 2: Using Supabase CLI

```bash
supabase db execute -f supabase/migrations/000_complete_admin_setup.sql
```

### Option 3: Manual Execution

1. Open your database management tool
2. Connect to your database
3. Open `supabase/migrations/000_complete_admin_setup.sql`
4. Execute the entire script

## 📊 What Gets Verified

The script includes 8 verification queries that check:

1. ✅ Roles created correctly
2. ✅ Permissions created correctly
3. ✅ Role-permission assignments
4. ✅ Menu items created
5. ✅ User role assignments
6. ⚠️ Users without roles (should be minimal)
7. 📋 Sample user role assignments
8. 🧪 Helper functions working

## 🔍 After Running

The script will show you:
- How many roles were created
- How many permissions were created
- How many users got roles assigned
- Sample user assignments
- Any issues that need attention

## 📝 Next Steps After Setup

1. ✅ Review the verification output
2. ⏳ Manually assign admin/moderator roles to specific users
3. ⏳ Test the new admin system
4. ⏳ Update components to use new hooks
5. ⏳ Remove old RBAC code

## 🎯 Quick Role Assignment

To assign admin role to a specific user:

```sql
INSERT INTO admin_user_roles (user_id, role_id, is_active)
SELECT u.id, r.id, true
FROM auth.users u
CROSS JOIN admin_roles r
WHERE u.email = 'admin@example.com'
AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;
```

## ⚡ Ready to Go!

Run the script and everything will be set up automatically with verification!

