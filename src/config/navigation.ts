/**
 * Dynamic Navigation System
 * 
 * This file re-exports icon utilities from the centralized icon registry.
 * All navigation structure comes from database (navigation_items table)
 * 
 * @deprecated For icon mapping, use @/lib/icons/registry instead
 * This file is kept for backward compatibility
 */

// Re-export icon utilities from the centralized registry
export { 
  ICON_MAP, 
  getIconComponent 
} from '@/lib/icons/registry'
