/**
 * Navigation Library - Centralized Navigation System
 * 
 * This module provides a centralized navigation system that eliminates
 * code duplication and provides consistent navigation across the application.
 */

// Export configuration
export {
  MODULE_NAVIGATION_ITEMS,
  getModuleNavigationItems,
  getAvailableModules,
  filterNavigationItemsByPermissions,
  hasModuleAccess,
  type NavigationItem,
  type ModuleNavigationConfig
} from './config'

// Export icon registry
export {
  ICON_REGISTRY,
  getIcon,
  getIconWithFallback,
  hasIcon,
  getAvailableIcons,
  IconComponent,
  isValidIconName,
  type IconProps,
  type IconComponentProps
} from '../icons/registry'

// Export translation utilities
export {
  NAVIGATION_TRANSLATION_KEYS,
  getTranslationKey,
  translateNavigationItem,
  translateNavigationItems,
  getRequiredTranslationKeys,
  validateNavigationTranslations
} from './translations'

// Re-export commonly used types
export type { LucideIcon } from 'lucide-react'



