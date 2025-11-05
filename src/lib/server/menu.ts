import { createClient } from '../supabase/server'
import { User } from '@supabase/supabase-js'

import { defaultLogger } from '../logger'

export interface MenuModule {
  id: string
  name: string
  display_name: string
  description: string
  icon: string
  color: string
  sort_order: number
  items: MenuItem[]
}

export interface MenuItem {
  label: string
  href: string
  icon: string
  description: string
  sortOrder: number
  permission?: string
  children?: MenuItem[]
}

// Types for Supabase query result structure
interface RbacModule {
  id: string
  name: string
  display_name: string
  description: string
  icon: string
  color: string
  sort_order: number
}

interface RbacPermission {
  name: string
  rbac_modules: RbacModule | null
}

interface RbacRolePermission {
  rbac_permissions: RbacPermission | null
}

interface RbacRole {
  name: string
  rbac_role_permissions: RbacRolePermission[] | null
}

interface UserRole {
  rbac_roles: RbacRole | null
}

/**
 * Fetch user's accessible menu modules from the database
 * This is a server-side function that runs on the server
 */
export async function getMenuModules(user: User | null): Promise<MenuModule[]> {
  const supabase = await createClient()

  if (!user) {
    // Return public/visitor modules only
    return getVisitorMenuModules()
  }

  try {
    // Get user's roles and permissions
    const { data: userRoles, error: rolesError } = await supabase
      .from('rbac_user_roles')
      .select(`
        rbac_roles (
          name,
          rbac_role_permissions (
            rbac_permissions (
              name,
              rbac_modules (
                id,
                name,
                display_name,
                description,
                icon,
                color,
                sort_order
              )
            )
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (rolesError) {
      defaultLogger.error('Error fetching user roles:', rolesError)
      return getVisitorMenuModules()
    }

    // Extract permissions and group by module
    const modulePermissions = new Map<string, string[]>()
    const moduleDataMap = new Map<string, { id: string; name: string; display_name: string; description: string; icon: string; color: string; sort_order: number }>()

    // Cast to our typed structure (Supabase returns nested relationships as arrays)
    const typedUserRoles = (userRoles || []) as unknown as UserRole[]

    typedUserRoles.forEach((userRole: UserRole) => {
      const roles: RbacRole[] = (userRole.rbac_roles || []) as RbacRole[]
      
      roles.forEach((role: RbacRole) => {
        const rolePermissions: RbacRolePermission[] = (role.rbac_role_permissions || []) as RbacRolePermission[]
        
        rolePermissions.forEach((rp: RbacRolePermission) => {
          const permissions: RbacPermission[] = (rp.rbac_permissions || []) as RbacPermission[]
          
          permissions.forEach((permission: RbacPermission) => {
            const modules: RbacModule[] = (permission.rbac_modules || []) as RbacModule[]
            
            modules.forEach((moduleInfo: RbacModule) => {
              const moduleName = moduleInfo.name
              if (!modulePermissions.has(moduleName)) {
                modulePermissions.set(moduleName, [])
                moduleDataMap.set(moduleName, moduleInfo)
              }
              modulePermissions.get(moduleName)?.push(permission.name)
            })
          })
        })
      })
    })

    // Build menu modules with their items
    const menuModules: MenuModule[] = []
    
    for (const [moduleName, permissions] of modulePermissions) {
      const moduleInfo = moduleDataMap.get(moduleName)
      const items = getModuleItems(moduleName, permissions)
      
      if (!moduleInfo) {
        continue
      }
      
      if (items.length > 0) {
        menuModules.push({
          id: moduleInfo.id,
          name: moduleInfo.name,
          display_name: moduleInfo.display_name,
          description: moduleInfo.description,
          icon: moduleInfo.icon,
          color: moduleInfo.color,
          sort_order: moduleInfo.sort_order,
          items
        })
      }
    }

    // Sort modules by sort_order
    return menuModules.sort((a, b) => a.sort_order - b.sort_order)

  } catch (error) {
    defaultLogger.error('Error building menu modules:', error)
    return getVisitorMenuModules()
  }
}

/**
 * Get visitor/public menu modules (for unauthenticated users)
 */
function getVisitorMenuModules(): MenuModule[] {
  return [
    {
      id: 'public',
      name: 'public',
      display_name: 'Public',
      description: 'Public pages and information',
      icon: 'globe',
      color: 'blue',
      sort_order: 0,
      items: [
        {
          label: 'Home',
          href: '/',
          icon: 'home',
          description: 'Go to homepage',
          sortOrder: 1
        },
        {
          label: 'About',
          href: '/about',
          icon: 'info',
          description: 'Learn about our mission',
          sortOrder: 2
        },
        {
          label: 'Contact',
          href: '/contact',
          icon: 'mail',
          description: 'Get in touch',
          sortOrder: 3
        }
      ]
    }
  ]
}

/**
 * Get menu items for a specific module based on permissions
 */
function getModuleItems(moduleName: string, permissions: string[]): MenuItem[] {
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
    cases: [
      {
        label: 'All Cases',
        href: '/cases',
        icon: 'Heart',
        description: 'Browse all donation cases',
        sortOrder: 1,
        permission: 'view:cases'
      },
      {
        label: 'Create Case',
        href: '/cases/create',
        icon: 'Plus',
        description: 'Create a new case',
        sortOrder: 2,
        permission: 'create:cases'
      }
    ],
    contributions: [
      {
        label: 'My Contributions',
        href: '/contributions',
        icon: 'CreditCard',
        description: 'View my contributions',
        sortOrder: 1,
        permission: 'view:own_contributions'
      }
    ],
    beneficiaries: [
      {
        label: 'All Beneficiaries',
        href: '/beneficiaries',
        icon: 'Users',
        description: 'Manage beneficiaries',
        sortOrder: 1,
        permission: 'view:beneficiaries'
      },
      {
        label: 'Add Beneficiary',
        href: '/beneficiaries/create',
        icon: 'UserPlus',
        description: 'Add new beneficiary',
        sortOrder: 2,
        permission: 'create:beneficiaries'
      }
    ],
    projects: [
      {
        label: 'All Projects',
        href: '/projects',
        icon: 'Package',
        description: 'View all projects',
        sortOrder: 1,
        permission: 'view:projects'
      },
      {
        label: 'Create Project',
        href: '/projects/create',
        icon: 'Plus',
        description: 'Create new project',
        sortOrder: 2,
        permission: 'create:projects'
      }
    ],
    admin: [
      {
        label: 'Admin Dashboard',
        href: '/admin',
        icon: 'Settings',
        description: 'Admin panel',
        sortOrder: 1,
        permission: 'view:admin_dashboard'
      },
      {
        label: 'Cases Management',
        href: '/admin/cases',
        icon: 'Heart',
        description: 'Manage all cases',
        sortOrder: 2,
        permission: 'view:admin_cases'
      },
      {
        label: 'Contributions Management',
        href: '/admin/contributions',
        icon: 'CreditCard',
        description: 'Manage all contributions',
        sortOrder: 3,
        permission: 'view:admin_contributions'
      },
      {
        label: 'Access Control',
        href: '#',
        icon: 'Shield',
        description: 'Manage roles, permissions, and user access',
        sortOrder: 4,
        permission: 'manage:rbac',
        children: [
          {
            label: 'Roles Management',
            href: '/admin/access-control/roles',
            icon: 'UserCheck',
            description: 'Create and manage user roles',
            sortOrder: 1,
            permission: 'manage:rbac'
          },
          {
            label: 'Permissions Management',
            href: '/admin/access-control/permissions',
            icon: 'Key',
            description: 'Manage system permissions',
            sortOrder: 2,
            permission: 'manage:rbac'
          },
          {
            label: 'User Roles',
            href: '/admin/access-control/users',
            icon: 'Users',
            description: 'Assign roles to users',
            sortOrder: 3,
            permission: 'manage:rbac'
          },
          {
            label: 'Modules',
            href: '/admin/access-control/modules',
            icon: 'Package',
            description: 'Organize permissions into modules',
            sortOrder: 4,
            permission: 'manage:rbac'
          }
        ]
      },
      {
        label: 'Analytics',
        href: '/admin/analytics',
        icon: 'BarChart3',
        description: 'View reports and analytics',
        sortOrder: 5,
        permission: 'view:analytics'
      },
      {
        label: 'Settings',
        href: '/admin/settings',
        icon: 'Settings',
        description: 'System settings',
        sortOrder: 6,
        permission: 'view:admin_settings'
      }
    ],
    payments: [
      {
        label: 'Payment Methods',
        href: '/admin/payments',
        icon: 'CreditCard',
        description: 'Manage payment methods',
        sortOrder: 1,
        permission: 'view:admin_payments'
      }
    ],
    files: [
      {
        label: 'File Manager',
        href: '/admin/files',
        icon: 'FileText',
        description: 'Manage system files',
        sortOrder: 1,
        permission: 'view:admin_files'
      }
    ],
    reports: [
      {
        label: 'Analytics',
        href: '/admin/reports',
        icon: 'BarChart3',
        description: 'View reports and analytics',
        sortOrder: 1,
        permission: 'view:admin_reports'
      }
    ],
    profile: [
      {
        label: 'My Profile',
        href: '/profile',
        icon: 'User',
        description: 'Manage your profile',
        sortOrder: 1,
        permission: 'view:profile'
      },
      {
        label: 'Settings',
        href: '/profile/settings',
        icon: 'Settings',
        description: 'Account settings',
        sortOrder: 2,
        permission: 'view:profile'
      }
    ],
    notifications: [
      {
        label: 'Notifications',
        href: '/notifications',
        icon: 'Bell',
        description: 'View system notifications',
        sortOrder: 1,
        permission: 'view:notifications'
      }
    ]
  }

  const items = moduleConfigs[moduleName] || []
  
  // Filter items based on user permissions and handle nested items
  return items.filter(item => {
    if (!item.permission) return true // If no permission required, allow access
    
    const hasPermission = permissions.includes(item.permission)
    
    // If item has children, filter them too
    if (item.children) {
      const filteredChildren = item.children.filter(child => {
        if (!child.permission) return true
        return permissions.includes(child.permission)
      })
      
      // Only include parent if it has permission OR has visible children
      return hasPermission || filteredChildren.length > 0
    }
    
    return hasPermission
  }).map(item => {
    // Filter children if they exist
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(child => {
          if (!child.permission) return true
          return permissions.includes(child.permission)
        })
      }
    }
    return item
  })
}
