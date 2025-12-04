# Application Map & Menu Structure

## Complete Application Structure

```
Meen Ma3ana Application
│
├── 🌐 Public Routes (No Authentication)
│   ├── / → redirects to /en/landing
│   ├── /[locale]/landing (Marketing landing page)
│   ├── /[locale] (Home page)
│   ├── /[locale]/cases (Browse cases)
│   ├── /[locale]/cases/[id] (Case details)
│   ├── /[locale]/projects (Browse projects)
│   └── /[locale]/projects/[id] (Project details)
│
├── 🔐 Authentication Routes
│   ├── /[locale]/auth/login
│   ├── /[locale]/auth/register
│   ├── /[locale]/auth/forgot-password
│   └── /[locale]/auth/reset-password
│
├── 👤 User Routes (Authenticated)
│   ├── /[locale]/dashboard (User dashboard)
│   ├── /[locale]/profile (User profile)
│   │   ├── /edit (Edit profile)
│   │   └── /role (View role info)
│   ├── /[locale]/notifications (Notifications)
│   ├── /[locale]/contributions (My contributions)
│   │   ├── /[id] (Contribution details)
│   │   └── /recurring (Recurring contributions)
│   └── /[locale]/cases/[id]/donate (Donate to case)
│
├── 📝 Case Management Routes
│   ├── /[locale]/case-management/create (Create case - unified form)
│   └── /[locale]/case-management/cases/[id]/edit (Edit case)
│
├── 🤝 Sponsor Routes
│   ├── /[locale]/sponsor/apply (Apply as sponsor)
│   ├── /[locale]/sponsor/dashboard (Sponsor dashboard)
│   ├── /[locale]/sponsor/communications
│   └── /[locale]/sponsor/request
│
├── 👥 Beneficiary Routes
│   ├── /[locale]/beneficiaries (List beneficiaries)
│   ├── /[locale]/beneficiaries/create
│   ├── /[locale]/beneficiaries/[id]
│   └── /[locale]/beneficiaries/[id]/edit
│
└── ⚙️ Admin Routes (Requires admin:dashboard)
    ├── /[locale]/admin (Admin dashboard)
    ├── /[locale]/admin/cases (Manage cases)
    ├── /[locale]/admin/contributions (Manage contributions)
    ├── /[locale]/admin/sponsorships (Manage sponsorships)
    ├── /[locale]/admin/analytics (Analytics)
    ├── /[locale]/admin/categories (Manage categories)
    ├── /[locale]/admin/users (Manage users)
    │   └── /roles (User role assignment)
    └── /[locale]/admin/access-control
        ├── /users (User role management)
        ├── /roles (Role management)
        ├── /permissions (Permission management)
        └── /modules (Module management)
```

## Complete Page → Permission Mapping

### Public Pages
| Page | Route | Permission Required |
|------|-------|---------------------|
| Landing Page | `/[locale]/landing` | None (public) |
| Home | `/[locale]` | None (public) |
| Cases Browse | `/[locale]/cases` | `cases:view` (or public visitor) |
| Case Details | `/[locale]/cases/[id]` | `cases:view` (or public visitor) |
| Projects Browse | `/[locale]/projects` | None (public) |
| Project Details | `/[locale]/projects/[id]` | None (public) |

### User Pages
| Page | Route | Permission Required |
|------|-------|---------------------|
| Dashboard | `/[locale]/dashboard` | `dashboard:view` |
| Profile | `/[locale]/profile` | `profile:view` |
| Edit Profile | `/[locale]/profile/edit` | `profile:update` |
| Notifications | `/[locale]/notifications` | None (authenticated) |
| My Contributions | `/[locale]/contributions` | `contributions:read` |
| Contribution Details | `/[locale]/contributions/[id]` | `contributions:read` |
| Recurring Contributions | `/[locale]/contributions/recurring` | `contributions:read` |

### Case Management
| Page | Route | Permission Required |
|------|-------|---------------------|
| Create Case | `/[locale]/case-management/create` | `cases:create` |
| Edit Case | `/[locale]/case-management/cases/[id]/edit` | `cases:update` |
| Donate to Case | `/[locale]/cases/[id]/donate` | `contributions:create` |

### Sponsor Pages
| Page | Route | Permission Required |
|------|-------|---------------------|
| Apply as Sponsor | `/[locale]/sponsor/apply` | `sponsorships:create` |
| Sponsor Dashboard | `/[locale]/sponsor/dashboard` | `sponsorships:read` |
| Sponsor Communications | `/[locale]/sponsor/communications` | `sponsorships:read` |
| Sponsor Request | `/[locale]/sponsor/request` | `sponsorships:create` |

### Beneficiary Pages
| Page | Route | Permission Required |
|------|-------|---------------------|
| List Beneficiaries | `/[locale]/beneficiaries` | `beneficiaries:view` |
| Create Beneficiary | `/[locale]/beneficiaries/create` | `beneficiaries:create` |
| Beneficiary Details | `/[locale]/beneficiaries/[id]` | `beneficiaries:view` |
| Edit Beneficiary | `/[locale]/beneficiaries/[id]/edit` | `beneficiaries:update` |

### Admin Pages
| Page | Route | Permission Required | Current Code Uses | Status |
|------|-------|---------------------|-------------------|--------|
| Admin Dashboard | `/[locale]/admin` | `admin:dashboard` | ✅ `admin:dashboard` | ✅ Correct |
| Manage Cases | `/[locale]/admin/cases` | `cases:manage` | ⚠️ `view:admin_cases` | ❌ Needs Fix |
| Manage Contributions | `/[locale]/admin/contributions` | `contributions:manage` | ⚠️ `view:admin_contributions` | ❌ Needs Fix |
| Manage Sponsorships | `/[locale]/admin/sponsorships` | `admin:dashboard` | ✅ `admin:dashboard` | ✅ Correct |
| Analytics | `/[locale]/admin/analytics` | `admin:analytics` | ⚠️ `view:analytics` | ❌ Needs Fix |
| Manage Categories | `/[locale]/admin/categories` | `cases:manage` | ⚠️ `admin:manage` | ❌ Needs Fix |
| Manage Users | `/[locale]/admin/users` | `admin:users` | ✅ `admin:users` | ✅ Correct |
| Access Control Users | `/[locale]/admin/access-control/users` | `admin:users` | ⚠️ `manage:rbac` | ❌ Needs Fix |
| Access Control Roles | `/[locale]/admin/access-control/roles` | `admin:roles` | ⚠️ `manage:rbac` | ❌ Needs Fix |
| Access Control Permissions | `/[locale]/admin/access-control/permissions` | `admin:roles` | ⚠️ `manage:rbac` | ❌ Needs Fix |
| Access Control Modules | `/[locale]/admin/access-control/modules` | `admin:roles` | ⚠️ `manage:rbac` | ❌ Needs Fix |

## Menu Structure (Clean - Based on Actual Pages)

### Top-Level Menu
```
1. Home (/)
2. Cases (/cases) - cases:view
3. Projects (/projects) - public
4. Dashboard (/dashboard) - dashboard:view
5. Notifications (/notifications) - authenticated
6. My Contributions (/contributions) - contributions:read
7. Profile (/profile) - profile:view
8. Administration (/admin) - admin:dashboard [PARENT]
   ├── Dashboard (/admin) - admin:dashboard
   ├── Cases (/admin/cases) - cases:manage
   ├── Contributions (/admin/contributions) - contributions:manage
   ├── Sponsorships (/admin/sponsorships) - admin:dashboard
   ├── Analytics (/admin/analytics) - admin:analytics
   ├── Categories (/admin/categories) - cases:manage
   ├── Users (/admin/users) - admin:users
   └── Access Control (/admin/access-control/users) - admin:roles [PARENT]
       ├── Users (/admin/access-control/users) - admin:users
       ├── Roles (/admin/access-control/roles) - admin:roles
       ├── Permissions (/admin/access-control/permissions) - admin:roles
       └── Modules (/admin/access-control/modules) - admin:roles
```

## Files Created

1. **`supabase/migrations/004_clean_menu_structure.sql`** - Clean menu migration
2. **`docs/APP_MAP_AND_MENU_STRUCTURE.md`** - Complete documentation

## Next Steps

1. **Apply clean menu migration:**
   ```bash
   # Run the migration
   supabase db push
   # Or manually execute: supabase/migrations/004_clean_menu_structure.sql
   ```

2. **Fix permission mismatches** in admin pages:
   - Update `view:admin_cases` → `cases:manage`
   - Update `view:admin_contributions` → `contributions:manage`
   - Update `view:analytics` → `admin:analytics`
   - Update `admin:manage` → `cases:manage`
   - Update `manage:rbac` → `admin:roles`

3. **Verify menu structure** - Test that menu items appear based on user permissions
