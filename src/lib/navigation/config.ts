/**
 * Navigation Configuration
 * 
 * This file contains navigation configuration types and utilities.
 */

export interface NavigationItem {
  label: string
  href: string
  icon?: string
  description?: string
  sortOrder?: number
  permission?: string
  children?: NavigationItem[]
}

export interface ModuleNavigationConfig {
  id: string
  name: string
  display_name: string
  description?: string
  icon: string
  color: string
  sort_order: number
  items: NavigationItem[]
}

// Placeholder for navigation items - to be populated from database
export const MODULE_NAVIGATION_ITEMS: ModuleNavigationConfig[] = []

/**
 * Get navigation items for a specific module
 */
export function getModuleNavigationItems(moduleId: string): NavigationItem[] {
  const module = MODULE_NAVIGATION_ITEMS.find(m => m.id === moduleId)
  return module?.items || []
}

/**
 * Get all available modules
 */
export function getAvailableModules(): ModuleNavigationConfig[] {
  return MODULE_NAVIGATION_ITEMS
}

/**
 * Filter navigation items by permissions
 */
export function filterNavigationItemsByPermissions(
  items: NavigationItem[],
  hasPermission: (permission: string) => boolean
): NavigationItem[] {
  return items
    .filter(item => !item.permission || hasPermission(item.permission))
    .map(item => ({
      ...item,
      children: item.children
        ? filterNavigationItemsByPermissions(item.children, hasPermission)
        : undefined
    }))
}

/**
 * Check if user has access to a module
 */
export function hasModuleAccess(
  moduleId: string,
  hasPermission: (permission: string) => boolean
): boolean {
  const module = MODULE_NAVIGATION_ITEMS.find(m => m.id === moduleId)
  if (!module) return false
  
  // If module has items, check if user has permission for at least one item
  if (module.items.length > 0) {
    return module.items.some(
      item => !item.permission || hasPermission(item.permission)
    )
  }
  
  return true
}

