# Meen Ma3ana - Donation Platform

A comprehensive donation platform built with Next.js, Supabase, and TypeScript, featuring a robust Role-Based Access Control (RBAC) system.

## Features

- **Multi-language Support**: Arabic and English localization
- **Role-Based Access Control**: Database-driven permission system
- **Case Management**: Create and manage donation cases
- **Contribution Tracking**: Track donations and contributions
- **User Management**: Comprehensive user and role management
- **Analytics Dashboard**: Real-time analytics and reporting
- **File Management**: Secure file upload and storage
- **Audit Logging**: Complete audit trail for all actions

## RBAC System

This platform implements a sophisticated Role-Based Access Control system with the following features:

### Permission Model
- **Database-driven**: All permissions are stored in the database
- **Hierarchical modules**: Admin functions are organized into sub-modules
- **Granular permissions**: Fine-grained control over user actions
- **Dynamic menu**: Menu items are filtered based on user permissions

### Permission Naming Convention
Permissions follow the format `action:resource`:
- `view:cases` - View donation cases
- `create:cases` - Create new donation cases
- `update:cases` - Edit existing cases
- `delete:cases` - Delete cases
- `manage:rbac` - Manage roles and permissions
- `view:admin_dashboard` - View admin dashboard
- `manage:files` - Upload and manage files
- `approve:contributions` - Approve donation contributions

### Module Structure
- **Top-level modules**: admin, dashboard, cases, contributions
- **Admin sub-modules**:
  - `admin_rbac` - RBAC Management (Roles, Permissions, Users)
  - `admin_users` - User Management
  - `admin_cases` - Case Management
  - `admin_contributions` - Contribution Management
  - `admin_analytics` - Analytics & Reports
  - `admin_settings` - System Settings

### Security Features
- **Server-side guards**: All API routes are protected with permission guards
- **Client-side guards**: Components use PermissionGuard for UI protection
- **Audit logging**: All admin actions are logged for security
- **Environment controls**: Debug and test endpoints can be disabled

## Access Control Management

The platform provides a modern, clean CRUD interface for managing roles, permissions, users, and modules under the `/admin/access-control/` section. All pages require the `manage:rbac` permission.

### Roles Management (`/admin/access-control/roles`)
Manage user roles with a comprehensive data table interface:
- **Create Roles**: Click "Create Role" to open a modal with fields for name, display name, and description
- **Edit Roles**: Click the edit button on any role to modify details (system roles are protected)
- **Delete Roles**: Remove custom roles (prevents deletion if assigned to users or if system role)
- **Assign Permissions**: Use the permission assignment modal to select permissions grouped by modules
- **Search & Filter**: Filter by role type (system/custom) and search by name
- **Statistics**: View total roles, system/custom breakdown, and user assignment counts

### Permissions Management (`/admin/access-control/permissions`)
Organize and manage permissions within collapsible module sections:
- **Create Permissions**: Add new permissions with action:resource naming (e.g., `view:cases`)
- **Edit Permissions**: Modify permission details (system permissions are read-only)
- **Delete Permissions**: Remove custom permissions with confirmation
- **Module Organization**: Permissions are grouped by modules with expandable sections
- **View Roles**: See which roles have each permission assigned
- **Search & Filter**: Find permissions across modules or filter by specific module
- **Statistics**: Track total permissions, system/custom counts, and permissions per module

### User Role Assignment (`/admin/access-control/users`)
Assign and manage roles for users with bulk operations:
- **View Users**: Data table showing users, their assigned roles, and assignment history
- **Manage Roles**: Modal interface for assigning/removing roles from individual users
- **Bulk Assignment**: Select multiple users and assign roles in batch
- **Quick Assign**: Preset buttons for common roles (Admin, Moderator, Donor)
- **Search & Filter**: Find users by email/name or filter by role assignment status
- **Statistics**: Overview of total users, role assignment distribution, and breakdowns

### Modules Management (`/admin/access-control/modules`)
Organize permissions into logical groups with visual customization:
- **Create Modules**: Add new modules with custom icons, colors, and descriptions
- **Edit Modules**: Modify module appearance and settings (system modules are protected)
- **Delete Modules**: Remove custom modules (requires moving permissions first)
- **Drag & Drop Reordering**: Reorder modules to control menu appearance
- **Permission Management**: View and move permissions between modules
- **Visual Preview**: See how modules appear in the navigation menu
- **Statistics**: Track module usage and permission distribution

### Permission Guards

**Client-side (Components):**
```tsx
import PermissionGuard from '@/components/auth/PermissionGuard'

export default function AdminPage() {
  return (
    <PermissionGuard permission="manage:rbac">
      <div>Access Control content here</div>
    </PermissionGuard>
  )
}
```

**Server-side (API Routes):**
```typescript
import { requirePermission } from '@/lib/security/guards'

export async function GET(request: NextRequest) {
  const guardResult = await requirePermission('manage:rbac')(request)
  if (guardResult instanceof NextResponse) {
    return guardResult
  }

  const { user, supabase } = guardResult
  // Your protected logic here
}
```

### Menu Filtering
The admin menu automatically shows/hides items based on user permissions. The Access Control section only appears for users with `manage:rbac` permission, and individual pages within it are also protected.

## Best Practices

### Security Best Practices
- **Don't delete system roles/permissions**: These are required for platform functionality
- **Test permission changes**: Always verify changes in a non-production environment first
- **Use descriptive display names**: Make role and permission names clear and understandable
- **Regular audits**: Periodically review user role assignments and permission usage
- **Principle of least privilege**: Only assign the minimum permissions required for each role

### Organization Best Practices
- **Logical permission grouping**: Organize permissions into modules by functional area
- **Consistent naming**: Follow the `action:resource` convention consistently
- **Role hierarchy**: Design roles with clear permission escalation paths
- **Documentation**: Keep role descriptions and permission purposes up-to-date

## Getting Started

### Prerequisites
- Node.js 22.x
- Supabase account
- PostgreSQL database

### Environment Setup

Create a `.env.local` file with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database
DATABASE_URL=your_database_connection_string

# Security (NEVER enable in production)
ENABLE_DEBUG_ENDPOINTS=false
ENABLE_TEST_ENDPOINTS=false

# Optional AI Services
ANTHROPIC_API_KEY=your_anthropic_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key
```

> **Note:** For production deployment, refer to `.env.production.example` for the complete list of required environment variables. The above configuration is for local development only. Never commit actual `.env.production` files to version control, as they contain sensitive credentials.

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   # Run migrations
   npm run db:migrate

   # Apply RBAC migration
   npm run db:migrate:rbac
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Documentation

All project documentation is organized in the `docs/` directory. See **[docs/README.md](./docs/README.md)** for a complete index.

### Quick Links

**Getting Started:**
- **[Quick Setup Guide](./docs/setup/QUICK_SETUP.md)** - Get started quickly
- **[Tech Stack Overview](./docs/architecture/TECH_STACK_OVERVIEW.md)** - Technology stack and architecture
- **[Business Requirements Document](./docs/architecture/Meen-Ma3ana_BRD.md)** - Project requirements

**Setup & Configuration:**
- **[Database Setup](./docs/setup/DATABASE_SETUP.md)** - Database configuration and migrations
- **[Storage Setup](./docs/setup/STORAGE_SETUP.md)** - Supabase Storage configuration
- **[Landing Page Setup](./docs/setup/LANDING_PAGE_SETUP.md)** - Marketing page configuration

**Deployment:**
- **[Vercel Deployment](./docs/deployment/VERCEL_DEPLOYMENT.md)** - Complete deployment guide

**Development:**
- **[Integration Guide](./docs/development/integration-guide.md)** - Third-party integrations
- **[Server Menu System](./docs/development/server-menu-system.md)** - Navigation system documentation

**Features:**
- **[Activity Logging](./docs/features/ACTIVITY_LOGGING_SYSTEM.md)** - Activity logging system
- **[Storage System](./docs/features/STORAGE_CONFIGURATION_MODULE.md)** - Storage configuration
- **[Performance Optimization](./docs/features/PERFORMANCE_OPTIMIZATION.md)** - Performance best practices

**Data Import:**
- **[Cases Import Guide](./docs/cases/IMPORT_GUIDE.md)** - Import contribution data

For complete documentation, see **[docs/README.md](./docs/README.md)**.

## Deployment to Vercel

This project is optimized for Vercel deployment and includes specific configuration in `vercel.json`. For complete deployment instructions, see **[VERCEL_DEPLOYMENT.md](./docs/deployment/VERCEL_DEPLOYMENT.md)**.

**Important**: The `package-lock.json` file must be kept in sync with `package.json` (using `npm install` after any dependency changes) to ensure successful deployments. This prevents lock file synchronization issues during the build process.

### Prerequisites
- Vercel account (free or paid)
- GitHub/GitLab/Bitbucket repository connected to Vercel
- Supabase project set up and configured
- All environment variables ready (reference `.env.production.example`)

### Quick Deployment Steps
1. Connect repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set build settings (usually auto-detected)
4. Deploy

### Step-by-Step Deployment

1. **Connect Repository to Vercel:**
   - Log in to your Vercel dashboard at [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your repository from GitHub, GitLab, or Bitbucket
   - Vercel will automatically detect Next.js

2. **Configure Project Settings:**
   - Review and confirm build settings (auto-detected)
   - Ensure build command is `npm run build`
   - Output directory should be `.next`

### Environment Variables Configuration

- Link to `.env.production.example` file for complete list
- In Vercel dashboard, navigate to **Project Settings > Environment Variables**
- Click **Add** for each variable from `.env.production.example`
- Set appropriate environment scope (Production, Preview, Development):
  - **Production**: Live deployments
  - **Preview**: Pull request previews
  - **Development**: Local development (if using Vercel CLI)
- Critical variables that must be set:
  - All Supabase variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
  - DATABASE_URL
  - Security flags (ENABLE_DEBUG_ENDPOINTS=false, ENABLE_TEST_ENDPOINTS=false)
- PRELAUNCH mode configuration:
  - Set `PRELAUNCH=true` to enable landing-page-only mode
  - Set `PRELAUNCH=false` or omit to enable full application
  - Reference `proxy.ts` for implementation details

### Build Configuration

- The `vercel.json` file contains build settings
- Vercel auto-detects Next.js projects
- Build command: `npm run build` (from `package.json`)
- Output directory: `.next`

### Domain Configuration

- In Vercel dashboard, navigate to **Project Settings > Domains**
- Click **Add** to add a custom domain
- Follow DNS configuration steps provided by Vercel
- SSL certificate is automatically provisioned by Vercel

### Database Setup for Production

- Ensure Supabase project is in production mode
- Run database migrations if needed
- Verify RLS (Row Level Security) policies are enabled
- Reference existing database setup documentation in `docs/setup/DATABASE_SETUP.md`

### Post-Deployment Checklist

- Verify environment variables are set correctly in Vercel dashboard
- Test authentication flow end-to-end
- Verify file uploads work (Supabase Storage)
- Test i18n functionality (both English and Arabic)
- Verify RTL layout for Arabic language
- Test RBAC permissions and role-based access
- Check that debug/test endpoints are disabled (ENABLE_DEBUG_ENDPOINTS=false, ENABLE_TEST_ENDPOINTS=false)
- Verify PRELAUNCH mode if applicable

### Monitoring and Logs

- Access Vercel deployment logs: **Project Dashboard > Deployments > [Deployment] > Logs**
- View runtime logs: **Project Dashboard > Logs**
- Vercel Analytics (available on Pro plan): **Project Dashboard > Analytics**
- Supabase dashboard for database monitoring: **Supabase Dashboard > Logs**

### Troubleshooting

Common issues and solutions:

- **Build failures**: Check environment variables are set correctly in Vercel dashboard
- **Database connection issues**: Verify DATABASE_URL is correct and connection pooler is configured (port 6543)
- **Authentication issues**: Verify Supabase keys (NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- **File upload issues**: Check Supabase Storage configuration and bucket policies
- **i18n issues**: Verify locale configuration in `src/i18n/request.ts`

#### Troubleshooting: npm ci Failures

**Symptom Description:**
- Build fails on Vercel with `npm ci` error
- Error message shows lock file out of sync with package.json
- Specific version mismatches listed in error (e.g., TypeScript 5.9.2 ≠ 5.8.3, @neondatabase/serverless mismatch, missing @types/node@22.18.13)

**Root Cause:**
- `package.json` was updated without regenerating `package-lock.json`
- Lock file contains outdated or conflicting dependency versions
- `npm ci` requires exact synchronization (by design)

**Solution Steps:**
1. Delete `package-lock.json` locally
2. Run `npm install` to regenerate the lock file
3. Verify with `npm ci` locally (this simulates Vercel's build)
4. Test build with `npm run build`
5. Commit and push the updated lock file:
   ```bash
   git add package-lock.json
   git commit -m "fix: sync package-lock.json"
   git push
   ```

**Prevention:**
- Always run `npm install` after updating `package.json`
- Never manually edit `package-lock.json`
- Use `npm run validate:lockfile` before committing (validates lock file sync without installing)
- Consider setting up pre-commit hooks to run validation automatically

**Why We Use `npm ci` in Production:**
- Ensures deterministic builds (exact same dependency versions every time)
- Faster than `npm install` (optimized for CI/CD environments)
- Prevents unexpected dependency updates that could introduce bugs or vulnerabilities
- Industry best practice for CI/CD pipelines
- Guarantees local and production environments match exactly

**Quick Reference Commands:**
```bash
# Fix lock file drift
rm package-lock.json
npm install
npm ci  # Verify it works
npm run build  # Test build
git add package-lock.json
git commit -m "fix: sync package-lock.json"
git push
```

**When to Seek Help:**
- If regenerating lock file causes dependency conflicts
- If `npm install` fails with errors
- If build succeeds locally but fails on Vercel
- If you see peer dependency warnings that can't be resolved

### Rollback Procedure

- **Rollback to previous deployment**: 
  - Navigate to **Project Dashboard > Deployments**
  - Click the three dots menu on the deployment you want to restore
  - Select **Promote to Production**
- **Redeploy specific commit**:
  - In **Project Dashboard > Deployments**, find the deployment from the desired commit
  - Click **Redeploy**
- **Emergency procedures**:
  - Use Vercel's instant rollback feature from the deployments page
  - Can also temporarily disable the deployment in project settings

## API Documentation

### RBAC Endpoints
- `GET /api/admin/rbac/roles` - Get all roles
- `POST /api/admin/rbac/roles` - Create new role
- `PUT /api/admin/rbac/roles/[id]` - Update role
- `DELETE /api/admin/rbac/roles/[id]` - Delete role
- `GET /api/admin/rbac/permissions` - Get permissions by module
- `POST /api/admin/rbac/permissions` - Create new permission
- `DELETE /api/admin/rbac/permissions/[id]` - Delete permission
- `GET /api/admin/rbac/users` - Get users with roles
- `POST /api/admin/rbac/users` - Assign roles to users
- `GET /api/admin/rbac/modules` - Get all modules
- `POST /api/admin/rbac/modules` - Create new module
- `PUT /api/admin/rbac/modules/[id]` - Update module
- `DELETE /api/admin/rbac/modules/[id]` - Delete module

### Security Endpoints
- `GET /api/debug/rbac-data` - Debug RBAC data (requires debug mode)
- `GET /api/test-rls` - Test RLS policies (requires test mode)

## Development

### Project Structure
```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── [locale]/          # Localized pages
│   │   └── admin/
│   │       └── access-control/  # New RBAC management pages
│   │           ├── roles/       # Roles management
│   │           ├── permissions/ # Permissions management
│   │           ├── users/       # User role assignment
│   │           └── modules/     # Modules management
├── components/            # React components
│   ├── admin/
│   │   └── rbac/          # RBAC management components
│   ├── auth/              # Authentication components
│   └── navigation/         # Navigation components
├── lib/                   # Utility libraries
│   ├── security/          # Security and RBAC utilities
│   └── services/          # Business logic services
└── types/                 # TypeScript type definitions
```

### Key Files
- `src/lib/security/guards.ts` - Server-side permission guards
- `src/lib/server/menu.ts` - Dynamic menu generation
- `src/components/auth/PermissionGuard.tsx` - Client-side permission guard
- `src/hooks/useRBACData.ts` - RBAC data fetching hooks
- `supabase/migrations/add_admin_submodule_structure.sql` - RBAC migration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
