# Server-Side Menu Integration Guide

This guide shows how to integrate the server-side menu system into your existing application.

## Quick Start

### 1. Run the Database Migration

First, run the migration to set up the menu modules and permissions:

```sql
-- Run this in your Supabase SQL Editor
-- File: supabase/migrations/setup_server_menu_modules.sql
```

### 2. Replace Your Current Layout

Replace your current layout with the server-side menu system:

```tsx
// In your layout file (e.g., src/app/[locale]/layout.tsx)
import ServerLayout from '@/components/layout/ServerLayout'

export default async function Layout({
  children,
  params
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  return (
    <ServerLayout locale={params.locale}>
      {children}
    </ServerLayout>
  )
}
```

### 3. Test the Integration

Visit `/test-server-menu` to see the menu system in action with your actual data.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Server Components                        │
├─────────────────────────────────────────────────────────────┤
│  ServerLayout                                              │
│  ├── getMenuModules() - Fetches from rbac_modules table   │
│  └── ClientLayout - Renders the UI                         │
│                                                             │
│  ClientLayout                                              │
│  ├── ClientSidebarNavigation - Interactive sidebar        │
│  └── useMenuState - Manages UI state                      │
└─────────────────────────────────────────────────────────────┘
```

## Key Benefits

1. **Server-Side Rendering**: Menu data is fetched on the server
2. **Permission-Based**: Only shows modules/items user has access to
3. **Performance**: No client-side API calls for menu data
4. **Security**: Permissions checked on server-side
5. **Scalable**: Easy to add new modules and permissions

## Customization

### Adding New Menu Items

1. Add the item to the `getModuleItems` function in `src/lib/server/menu.ts`
2. Create the corresponding permission in the database
3. Assign the permission to appropriate roles

### Styling

The menu uses Tailwind CSS. Customize by modifying the component styles:

- `ClientSidebarNavigation.tsx` - Main sidebar styling
- `ClientLayout.tsx` - Layout and responsive behavior

### Icons

Icons are handled by the `getIconWithFallback` function. Add new icons to the icon registry.

## Migration from Client-Side Menu

If you're migrating from the old `useSimpleRBAC` system:

1. Replace `useSimpleRBAC` with `getMenuModules` in Server Components
2. Use `ServerLayout` instead of client-side layout components
3. Remove old client-side menu fetching logic
4. Update your layout files to use the new Server Components

## Troubleshooting

### Menu Not Showing
- Check if user has proper permissions
- Verify `rbac_modules` table has data
- Check browser console for errors

### Performance Issues
- Use `getCachedMenuModules` for better caching
- Check database query performance
- Monitor server-side rendering times

### Permission Issues
- Verify user roles are correctly assigned
- Check permission names match exactly
- Ensure `rbac_role_permissions` table has correct data

## Example Usage

```tsx
// Basic usage
import ServerLayout from '@/components/layout/ServerLayout'

export default async function MyPage({ params }) {
  return (
    <ServerLayout locale={params.locale}>
      <div>Your page content</div>
    </ServerLayout>
  )
}

// Advanced usage with custom data
import { getMenuModules } from '@/lib/server/menu'
import { createClient } from '@/lib/supabase/server'
import ClientLayout from '@/components/layout/ClientLayout'

export default async function MyPage({ params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const modules = await getMenuModules(user)

  return (
    <ClientLayout locale={params.locale} modules={modules} user={user}>
      <div>Your page content</div>
    </ClientLayout>
  )
}
```

## Database Schema

The system uses these tables:

- `rbac_modules` - Menu modules (Dashboard, Cases, etc.)
- `rbac_permissions` - Individual permissions
- `rbac_roles` - User roles (admin, donor, etc.)
- `rbac_user_roles` - User role assignments
- `rbac_role_permissions` - Role permission assignments

## Next Steps

1. Run the migration script
2. Test with `/test-server-menu`
3. Integrate into your main layout
4. Customize styling and behavior as needed
5. Add new modules and permissions as required
