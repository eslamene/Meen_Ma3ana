/**
 * Centralized Navigation Configuration
 * 
 * This file contains all navigation items and their configurations
 * to eliminate code duplication across navigation components.
 */

export interface NavigationItem {
  label: string
  href: string
  permissions: string[]
  requireAll?: boolean
  icon?: string
  description?: string
  sortOrder?: number
}

export interface ModuleNavigationConfig {
  [moduleKey: string]: NavigationItem[]
}

/**
 * Main navigation configuration for all modules
 * Each module contains an array of navigation items with their permissions
 */
export const MODULE_NAVIGATION_ITEMS: ModuleNavigationConfig = {
  admin: [
    {
      label: 'Dashboard',
      href: '/admin',
      permissions: ['admin:dashboard'],
      icon: 'BarChart3',
      description: 'Admin dashboard overview',
      sortOrder: 1
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      permissions: ['admin:analytics', 'admin:dashboard'],
      requireAll: false,
      icon: 'TrendingUp',
      description: 'View detailed analytics and reports',
      sortOrder: 2
    }
  ],

  rbac: [
    {
      label: 'Roles',
      href: '/admin/rbac/roles',
      permissions: ['admin:rbac', 'rbac:roles:manage'],
      requireAll: false,
      icon: 'Shield',
      description: 'Manage user roles and their permissions',
      sortOrder: 1
    },
    {
      label: 'Permissions',
      href: '/admin/rbac/permissions',
      permissions: ['admin:rbac', 'rbac:permissions:manage'],
      requireAll: false,
      icon: 'Key',
      description: 'Create and manage system permissions',
      sortOrder: 2
    },
    {
      label: 'User Management',
      href: '/admin/rbac/users',
      permissions: ['admin:rbac', 'rbac:users:manage'],
      requireAll: false,
      icon: 'Users',
      description: 'Assign roles to users',
      sortOrder: 3
    }
  ],
  
  cases: [
    {
      label: 'All Cases',
      href: '/admin/cases',
      permissions: ['cases:update', 'cases:delete', 'admin:dashboard'],
      requireAll: false,
      icon: 'FolderOpen',
      description: 'View and manage all cases',
      sortOrder: 1
    },
    {
      label: 'My Cases',
      href: '/cases/my',
      permissions: ['cases:read'],
      icon: 'User',
      description: 'View cases assigned to me',
      sortOrder: 2
    },
    {
      label: 'Create Case',
      href: '/cases/create',
      permissions: ['cases:create'],
      icon: 'Plus',
      description: 'Create a new case',
      sortOrder: 3
    }
  ],
  
  contributions: [
    {
      label: 'All Contributions',
      href: '/admin/contributions',
      permissions: ['admin:dashboard', 'contributions:approve'],
      requireAll: false,
      icon: 'CreditCard',
      description: 'Manage all contributions',
      sortOrder: 1
    },
    {
      label: 'Pending Approvals',
      href: '/admin/contributions/pending',
      permissions: ['contributions:approve'],
      icon: 'Clock',
      description: 'Review pending contributions',
      sortOrder: 2
    },
    {
      label: 'My Contributions',
      href: '/contributions',
      permissions: ['contributions:read'],
      icon: 'Wallet',
      description: 'View my contribution history',
      sortOrder: 3
    }
  ],
  
  projects: [
    {
      label: 'All Projects',
      href: '/projects',
      permissions: ['projects:read', 'projects:view_public'],
      requireAll: false,
      icon: 'FolderOpen',
      description: 'View all charity projects',
      sortOrder: 1
    },
    {
      label: 'Manage Projects',
      href: '/admin/projects',
      permissions: ['projects:manage', 'projects:update'],
      requireAll: false,
      icon: 'Settings',
      description: 'Manage and moderate projects',
      sortOrder: 2
    },
    {
      label: 'Create Project',
      href: '/projects/create',
      permissions: ['projects:create'],
      icon: 'Plus',
      description: 'Create a new charity project',
      sortOrder: 3
    }
  ],
  
  notifications: [
    {
      label: 'All Notifications',
      href: '/notifications',
      permissions: ['notifications:read'],
      icon: 'Bell',
      description: 'View all notifications',
      sortOrder: 1
    },
    {
      label: 'Notification Settings',
      href: '/notifications/settings',
      permissions: ['notifications:manage'],
      icon: 'Settings',
      description: 'Configure notification preferences',
      sortOrder: 2
    }
  ],
  
  reports: [
    {
      label: 'View Reports',
      href: '/reports',
      permissions: ['reports:view'],
      icon: 'FileText',
      description: 'Access system reports',
      sortOrder: 1
    },
    {
      label: 'Export Data',
      href: '/reports/export',
      permissions: ['reports:export'],
      icon: 'Download',
      description: 'Export data and reports',
      sortOrder: 2
    }
  ],
  
  files: [
    {
      label: 'File Manager',
      href: '/files',
      permissions: ['files:view'],
      icon: 'Folder',
      description: 'Manage uploaded files',
      sortOrder: 1
    },
    {
      label: 'Upload Files',
      href: '/files/upload',
      permissions: ['files:upload'],
      icon: 'Upload',
      description: 'Upload new files',
      sortOrder: 2
    }
  ],
  
  payments: [
    {
      label: 'Payment History',
      href: '/payments',
      permissions: ['payments:view'],
      icon: 'CreditCard',
      description: 'View payment transactions',
      sortOrder: 1
    },
    {
      label: 'Process Payments',
      href: '/payments/process',
      permissions: ['payments:process'],
      icon: 'DollarSign',
      description: 'Process pending payments',
      sortOrder: 2
    }
  ],
  
  profile: [
    {
      label: 'My Profile',
      href: '/profile',
      permissions: ['profile:read'],
      icon: 'User',
      description: 'View and edit profile',
      sortOrder: 1
    },
    {
      label: 'Account Settings',
      href: '/profile/settings',
      permissions: ['profile:update'],
      icon: 'Settings',
      description: 'Manage account settings',
      sortOrder: 2
    },
    {
      label: 'Security Settings',
      href: '/profile/security',
      permissions: ['profile:update'],
      icon: 'Lock',
      description: 'Security and privacy settings',
      sortOrder: 3
    }
  ]
}

/**
 * Get navigation items for a specific module, sorted by sortOrder
 * @param moduleKey - The module identifier (e.g., 'admin', 'cases')
 * @returns Array of navigation items for the module, sorted by sortOrder
 */
export function getModuleNavigationItems(moduleKey: string): NavigationItem[] {
  const items = MODULE_NAVIGATION_ITEMS[moduleKey] || []
  return items.sort((a, b) => {
    const sortOrderA = a.sortOrder ?? 999
    const sortOrderB = b.sortOrder ?? 999
    return sortOrderA - sortOrderB
  })
}

/**
 * Get all available module keys
 * @returns Array of all module keys
 */
export function getAvailableModules(): string[] {
  return Object.keys(MODULE_NAVIGATION_ITEMS)
}

/**
 * Filter navigation items based on user permissions and maintain sorting
 * @param items - Array of navigation items
 * @param userPermissions - Array of user permissions
 * @returns Filtered and sorted array of navigation items
 */
export function filterNavigationItemsByPermissions(
  items: NavigationItem[],
  userPermissions: string[]
): NavigationItem[] {
  const filteredItems = items.filter(item => {
    if (item.requireAll) {
      // User must have ALL required permissions
      return item.permissions.every(permission => 
        userPermissions.includes(permission)
      )
    } else {
      // User must have at least ONE of the required permissions
      return item.permissions.some(permission => 
        userPermissions.includes(permission)
      )
    }
  })
  
  // Sort filtered items by sortOrder
  return filteredItems.sort((a, b) => {
    const sortOrderA = a.sortOrder ?? 999
    const sortOrderB = b.sortOrder ?? 999
    return sortOrderA - sortOrderB
  })
}

/**
 * Get sorted and filtered navigation items for a module
 * @param moduleKey - The module identifier
 * @param userPermissions - Array of user permissions
 * @returns Sorted and filtered array of navigation items
 */
export function getSortedModuleNavigationItems(
  moduleKey: string,
  userPermissions: string[]
): NavigationItem[] {
  const items = getModuleNavigationItems(moduleKey)
  return filterNavigationItemsByPermissions(items, userPermissions)
}

/**
 * Check if user has access to any items in a module
 * @param moduleKey - The module identifier
 * @param userPermissions - Array of user permissions
 * @returns Boolean indicating if user has access to the module
 */
export function hasModuleAccess(
  moduleKey: string, 
  userPermissions: string[]
): boolean {
  const items = getModuleNavigationItems(moduleKey)
  const filteredItems = filterNavigationItemsByPermissions(items, userPermissions)
  return filteredItems.length > 0
}
