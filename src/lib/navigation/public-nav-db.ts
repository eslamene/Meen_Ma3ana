/**
 * Public Navigation Database Integration
 * Fetches public navigation items from the database menu system
 */

import { createClient } from '@/lib/supabase/client'
import { PublicNavItem } from './public-nav-config'
import { getIcon } from '@/lib/icons/registry'
import { LucideIcon } from 'lucide-react'
import { normalizeLandingPath } from '@/lib/utils/app-url'

import { defaultLogger as logger } from '@/lib/logger'

interface MenuItemFromDB {
  id: string
  parent_id?: string
  label: string
  label_ar?: string
  href: string
  icon?: string
  sort_order: number
  permission_id?: string
  permission?: {
    name: string
  }
  nav_metadata?: {
    isHashLink?: boolean
    showOnLanding?: boolean
    showOnOtherPages?: boolean
  }
}

/**
 * Fetch public navigation items from database
 * Includes children/sub-items in tree structure
 */
export async function getPublicNavItemsFromDB(
  isLandingPage: boolean,
  locale: string
): Promise<PublicNavItem[]> {
  try {
    const supabase = createClient()
    
    // Fetch ALL public navigation items (including children) from database with permission info
    const { data: allMenuItems, error } = await supabase
      .from('admin_menu_items')
      .select(`
        id, 
        parent_id,
        label, 
        label_ar, 
        href, 
        icon, 
        sort_order, 
        permission_id,
        nav_metadata,
        permission:admin_permissions(name)
      `)
      .eq('is_public_nav', true)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      logger.error('Error fetching public nav items:', { error: error })
      return []
    }

    if (!allMenuItems || allMenuItems.length === 0) {
      return []
    }

    // Transform database items to PublicNavItem format
    const transformItem = (item: MenuItemFromDB): PublicNavItem | null => {
      const metadata = item.nav_metadata || {}
      const showOnLanding = metadata.showOnLanding !== false // Default to true
      const showOnOtherPages = metadata.showOnOtherPages !== false // Default to true

      // Filter based on page context
      if (isLandingPage && !showOnLanding) return null
      if (!isLandingPage && !showOnOtherPages) return null

      // Get icon component if icon name is provided
      let iconComponent: LucideIcon | undefined
      if (item.icon) {
        const Icon = getIcon(item.icon)
        if (Icon) iconComponent = Icon as LucideIcon
      }

      // Process href - handle locale and hash links
      let href = item.href
      if (metadata.isHashLink) {
        // Hash links work on landing page, navigate to landing on other pages
        if (!isLandingPage) {
          href = `/${locale}/landing${item.href}`
        }
      } else {
        // Regular links - add locale if not present
        if (!href.startsWith('/')) href = `/${href}`
        
        // Only normalize landing page hrefs using utility function
        // This handles cases like /, /landing, /landing/landing, /en/landing/landing, etc.
        if (href.includes('/landing') || href === '/' || href === '') {
          href = normalizeLandingPath(href, locale)
        } else {
          // For other paths (like /cases), ensure locale is prepended if not already present
          if (locale && !href.startsWith(`/${locale}/`)) {
            // Remove any existing locale prefix first
            const pathWithoutLocale = href.replace(/^\/[a-z]{2}\//, '/')
            href = `/${locale}${pathWithoutLocale}`
          }
        }
      }

      // Use label based on locale - convert to translation key
      const labelText = locale === 'ar' && item.label_ar ? item.label_ar : item.label
      // Map common labels to translation keys
      const labelKeyMap: Record<string, string> = {
        'Home': 'home',
        'الرئيسية': 'home',
        'Cases': 'cases',
        'الحالات': 'cases',
        'Features': 'features',
        'المميزات': 'features',
        'Contact': 'contact',
        'اتصل بنا': 'contact',
      }
      const translationKey = labelKeyMap[labelText] || labelText.toLowerCase().replace(/\s+/g, '')

      // Get permission name if exists
      const permissionName = item.permission?.name

      return {
        key: item.id,
        labelKey: translationKey,
        href,
        icon: iconComponent,
        showOnLanding: showOnLanding,
        showOnOtherPages: showOnOtherPages,
        requiresPermission: permissionName,
        isHashLink: metadata.isHashLink || false,
      } as PublicNavItem
    }

    // Build tree structure
    const itemMap = new Map<string, PublicNavItem>()
    const rootItems: PublicNavItem[] = []

    // First pass: transform all items and create map
    allMenuItems.forEach((item: any) => {
      const transformed = transformItem(item)
      if (transformed) {
        itemMap.set(item.id, { ...transformed, children: [] })
      }
    })

    // Second pass: build tree structure
    allMenuItems.forEach((item: any) => {
      const navItem = itemMap.get(item.id)
      if (!navItem) return

      if (item.parent_id) {
        const parent = itemMap.get(item.parent_id)
        if (parent) {
          if (!parent.children) parent.children = []
          parent.children.push(navItem)
        }
      } else {
        rootItems.push(navItem)
      }
    })

    // Sort items recursively
    const sortItems = (items: PublicNavItem[]) => {
      items.sort((a, b) => {
        const aItem = allMenuItems.find(m => m.id === a.key)
        const bItem = allMenuItems.find(m => m.id === b.key)
        return (aItem?.sort_order || 0) - (bItem?.sort_order || 0)
      })
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortItems(item.children)
        }
      })
    }

    sortItems(rootItems)
    return rootItems
  } catch (error) {
    logger.error('Error in getPublicNavItemsFromDB:', { error: error })
    return []
  }
}

