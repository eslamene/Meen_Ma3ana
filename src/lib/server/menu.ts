import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export interface MenuModule {
  id: string
  name: string
  display_name: string
  description?: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
  items: MenuItem[]
}

export interface MenuItem {
  id: string
  label: string
  label_ar?: string
  href: string
  icon?: string
  description?: string
  permission?: string
  sort_order: number
  is_active: boolean
}

// Transformed type for client components (uses camelCase)
export interface TransformedMenuModule {
  id: string
  name: string
  display_name: string
  description?: string
  icon: string
  color: string
  sort_order: number
  items: Array<{
    label: string
    href: string
    icon: string
    description?: string
    sortOrder: number
    permission?: string
  }>
}

/**
 * Get menu modules for a user based on their permissions
 */
export async function getMenuModules(user: User | null): Promise<TransformedMenuModule[]> {
  const supabase = await createClient()

  if (!user) {
    // Return empty array for non-authenticated users
    return []
  }

  // Get user's accessible menu items via RPC function
  const { data: menuItems, error } = await supabase.rpc('get_user_menu_items', {
    user_id: user.id
  })

  if (error) {
    console.error('Error fetching menu items:', error)
    return []
  }

  // Get modules
  const { data: modules } = await supabase
    .from('admin_modules')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (!modules) {
    return []
  }

  // Group menu items by module and transform to match component expectations
  const modulesWithItems: TransformedMenuModule[] = modules.map((moduleData) => ({
    id: moduleData.id,
    name: moduleData.name,
    display_name: moduleData.display_name,
    description: moduleData.description,
    icon: moduleData.icon || 'folder',
    color: moduleData.color || 'blue',
    sort_order: moduleData.sort_order || 0,
    items: (menuItems || [])
      .filter((item: any) => item.module_id === moduleData.id)
      .map((item: any) => ({
        label: item.label,
        href: item.href,
        icon: item.icon || '',
        description: item.description,
        permission: item.permission_id,
        sortOrder: item.sort_order || 0
      }))
      .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)
  }))

  return modulesWithItems.filter((moduleData) => 
    moduleData.items !== undefined && moduleData.items.length > 0
  )
}

