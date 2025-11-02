# Server-Side Menu System

This document explains how to use the new server-side menu system that fetches menu data from the `rbac_modules` table using App Router Server Components.

## Architecture

The menu system consists of several components:

1. **Server Components**: Fetch data from the database
2. **Client Components**: Handle interactive UI state
3. **Server Functions**: Database queries and data processing
4. **Hooks**: Client-side state management

## Components

### Server Components

#### `ServerLayout` (`src/components/layout/ServerLayout.tsx`)
- Fetches user data and menu modules from the database
- Passes data to client components
- Runs on the server

#### `ServerSidebarNavigation` (`src/components/navigation/ServerSidebarNavigation.tsx`)
- Fetches menu modules based on user permissions
- Renders the sidebar navigation
- Runs on the server

### Client Components

#### `ClientLayout` (`src/components/layout/ClientLayout.tsx`)
- Handles sidebar toggle state
- Manages responsive layout
- Runs on the client

#### `ClientSidebarNavigation` (`src/components/navigation/ClientSidebarNavigation.tsx`)
- Renders the actual sidebar UI
- Handles module expansion/collapse
- Runs on the client

### Server Functions

#### `getMenuModules` (`src/lib/server/menu.ts`)
- Fetches user's accessible menu modules from `rbac_modules` table
- Filters modules based on user permissions
- Returns structured menu data

#### `getCachedMenuModules` (`src/lib/server/menu-cache.ts`)
- Cached version of `getMenuModules` for better performance
- Uses React's `cache` function

### Hooks

#### `useMenuState` (`src/lib/hooks/useMenuState.ts`)
- Manages sidebar open/close state
- Handles module expansion state
- Auto-closes sidebar on mobile when route changes

## Usage

### Basic Usage

```tsx
// In your layout file
import ServerLayout from '@/components/layout/ServerLayout'

export default async function Layout({ children, params }) {
  return (
    <ServerLayout locale={params.locale}>
      {children}
    </ServerLayout>
  )
}
```

### Advanced Usage

```tsx
// If you need more control over the menu data
import { getMenuModules } from '@/lib/server/menu'
import { createClient } from '@/lib/supabase/server'
import ClientLayout from '@/components/layout/ClientLayout'

export default async function CustomLayout({ children, locale }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const modules = await getMenuModules(user)

  return (
    <ClientLayout locale={locale} modules={modules} user={user}>
      {children}
    </ClientLayout>
  )
}
```

### Using Cached Menu Data

```tsx
import { getCachedMenuModules } from '@/lib/server/menu-cache'

export default async function Layout({ children, locale }) {
  const modules = await getCachedMenuModules()
  
  // Use modules...
}
```

## Database Schema

The menu system uses the `rbac_modules` table:

```sql
CREATE TABLE rbac_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'folder',
    color VARCHAR(20) DEFAULT 'blue',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Menu Configuration

Menu items are configured in `src/lib/server/menu.ts` in the `getModuleItems` function:

```typescript
const moduleConfigs: Record<string, MenuItem[]> = {
  dashboard: [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: 'BarChart3',
      description: 'View dashboard and analytics',
      sortOrder: 1,
      permission: 'view:dashboard'
    }
  ],
  // ... other modules
}
```

## Permissions

The menu system respects user permissions:

1. **Authenticated Users**: See modules and items based on their role permissions
2. **Unauthenticated Users**: See only public/visitor modules
3. **Permission Filtering**: Items are filtered based on user's actual permissions

## Performance

- **Server-Side Rendering**: Menu data is fetched on the server
- **Caching**: Uses React's `cache` function for request-level caching
- **Client-Side State**: Only interactive state is managed on the client
- **Database Optimization**: Efficient queries with proper joins

## Customization

### Adding New Modules

1. Add the module to the `rbac_modules` table
2. Add the module configuration to `getModuleItems` function
3. Add permissions for the module
4. Assign permissions to appropriate roles

### Styling

The menu uses Tailwind CSS classes. You can customize the appearance by modifying the component styles.

### Icons

Icons are handled by the `getIconWithFallback` function. Add new icons to the icon registry.

## Migration from Client-Side Menu

To migrate from the old client-side menu system:

1. Replace `useSimpleRBAC` with `getMenuModules` in Server Components
2. Use `ServerLayout` instead of client-side layout components
3. Update your layout files to use the new Server Components
4. Remove old client-side menu fetching logic

## Troubleshooting

### Common Issues

1. **Menu not showing**: Check if user has proper permissions
2. **Modules not expanding**: Ensure `useMenuState` hook is properly used
3. **Performance issues**: Use `getCachedMenuModules` for better caching

### Debug Mode

Enable debug logging by setting `DEBUG_MENU=true` in your environment variables.

## Future Enhancements

- [ ] Menu state persistence across page reloads
- [ ] Dynamic menu updates without page refresh
- [ ] Menu search functionality
- [ ] Menu customization by users
- [ ] Menu analytics and usage tracking
