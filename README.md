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
- Node.js 18+
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
