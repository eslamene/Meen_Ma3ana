/**
 * Public Navigation Configuration
 * Centralized configuration for unauthenticated user navigation items
 */

import { Heart, Mail } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

import { defaultLogger as logger } from '@/lib/logger'

export interface PublicNavItemConfig {
  key: string
  labelKey: string // Translation key
  href: string | ((locale: string) => string)
  icon?: LucideIcon
  showOnLanding?: boolean // Show on landing page
  showOnOtherPages?: boolean // Show on other pages
  requiresPermission?: string // Permission required (e.g., "cases:view_public")
  isHashLink?: boolean // If true, href is a hash link (#features, #contact)
}

export interface PublicNavItem {
  key: string
  labelKey: string // Translation key
  href: string // Always a string after processing
  icon?: LucideIcon
  showOnLanding?: boolean // Show on landing page
  showOnOtherPages?: boolean // Show on other pages
  requiresPermission?: string // Permission required (e.g., "cases:view_public")
  isHashLink?: boolean // If true, href is a hash link (#features, #contact)
  children?: PublicNavItem[] // Sub-items
}

/**
 * Public navigation items configuration
 * All items are shown on all pages for unauthenticated users
 */
export const PUBLIC_NAV_ITEMS: PublicNavItemConfig[] = [
  {
    key: 'home',
    labelKey: 'home',
    href: (locale) => `/${locale}/landing`,
    showOnLanding: true,
    showOnOtherPages: true,
  },
  {
    key: 'features',
    labelKey: 'features',
    href: '#features',
    showOnLanding: true,
    showOnOtherPages: true,
    isHashLink: true,
  },
  {
    key: 'cases',
    labelKey: 'cases',
    href: (locale) => `/${locale}/cases`,
    icon: Heart,
    showOnLanding: true,
    showOnOtherPages: true,
    requiresPermission: 'cases:view',
  },
  {
    key: 'contact',
    labelKey: 'contact',
    href: '#contact',
    icon: Mail,
    showOnLanding: true,
    showOnOtherPages: true,
    isHashLink: true,
  },
]

/**
 * Get navigation items for a specific page context
 * Note: Hash links (#features, #contact) only work on landing page
 * On other pages, they will navigate to landing page with hash
 * 
 * This function now tries to fetch from database first, with fallback to config
 */
export async function getPublicNavItems(
  isLandingPage: boolean,
  locale: string
): Promise<PublicNavItem[]> {
  // Try to fetch from database first
  try {
    const { getPublicNavItemsFromDB } = await import('./public-nav-db')
    const dbItems = await getPublicNavItemsFromDB(isLandingPage, locale)
    
    // If we got items from database, use them
    if (dbItems && dbItems.length > 0) {
      return dbItems
    }
  } catch (error) {
    // If database fetch fails, fall back to config
    logger.warn('Failed to fetch nav items from database, using config fallback:', error)
  }
  
  // Fallback to hardcoded config
  return PUBLIC_NAV_ITEMS.map((item) => {
    let href = typeof item.href === 'function' ? item.href(locale) : item.href
    
    // If it's a hash link and we're not on landing page, navigate to landing with hash
    if (item.isHashLink && !isLandingPage) {
      href = `/${locale}/landing${href}`
    }
    
    return {
      ...item,
      href,
    }
  })
}

