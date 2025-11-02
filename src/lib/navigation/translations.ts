/**
 * Navigation Translation Utilities
 * 
 * This file provides utilities for translating navigation items
 * and managing translation keys consistently across the application.
 */

import { NavigationItem } from './config'

/**
 * Translation key mapping for navigation items
 * Maps navigation labels to their translation keys
 */
export const NAVIGATION_TRANSLATION_KEYS: Record<string, string> = {
  // Admin module
  'Dashboard': 'adminDashboard',
  'Analytics': 'adminAnalytics',
  
  // RBAC module
  'RBAC Management': 'rbacManagement',
  'User Management': 'rbacUserManagement',
  'Permissions': 'rbacPermissions',
  'Role Management': 'rbacRoleManagement',
  'Roles': 'rbacRoles',
  
  // Cases module
  'All Cases': 'allCases',
  'Create Case': 'createCase',
  'My Cases': 'myCases',
  
  // Contributions module
  'All Contributions': 'allContributions',
  'My Contributions': 'myContributions',
  'Pending Approvals': 'pendingApprovals',
  
  
  // Notifications module
  'All Notifications': 'allNotifications',
  'Notification Settings': 'notificationSettings',
  
  // Reports module
  'View Reports': 'viewReports',
  'Export Data': 'exportData',
  
  // Files module
  'File Manager': 'fileManager',
  'Upload Files': 'uploadFiles',
  
  // Payments module
  'Payment History': 'paymentHistory',
  'Process Payments': 'processPayments',
  
  // Profile module
  'My Profile': 'myProfile',
  'Account Settings': 'accountSettings',
  'Security Settings': 'securitySettings',
  
  // Common navigation items
  'Home': 'home',
  'Notifications': 'notifications',
  'Settings': 'settings',
  'Profile': 'profile',
  'Sign Out': 'signOut',
  'Logout': 'logout'
}

/**
 * Get translation key for a navigation item label
 * @param label - The navigation item label
 * @returns The translation key or the original label if no key is found
 */
export function getTranslationKey(label: string): string {
  return NAVIGATION_TRANSLATION_KEYS[label] || label.toLowerCase().replace(/\s+/g, '')
}

/**
 * Create a translated navigation item
 * @param item - The navigation item
 * @param t - The translation function from next-intl
 * @returns Navigation item with translated label
 */
export function translateNavigationItem(
  item: NavigationItem, 
  t: (key: string) => string
): NavigationItem {
  const translationKey = getTranslationKey(item.label)
  
  return {
    ...item,
    label: t(translationKey)
  }
}

/**
 * Translate an array of navigation items
 * @param items - Array of navigation items
 * @param t - The translation function from next-intl
 * @returns Array of translated navigation items
 */
export function translateNavigationItems(
  items: NavigationItem[], 
  t: (key: string) => string
): NavigationItem[] {
  return items.map(item => translateNavigationItem(item, t))
}

/**
 * Get all required translation keys for navigation
 * @returns Array of all translation keys used in navigation
 */
export function getRequiredTranslationKeys(): string[] {
  return Object.values(NAVIGATION_TRANSLATION_KEYS)
}

/**
 * Validate that all navigation translation keys exist in messages
 * @param messages - The messages object from next-intl
 * @param locale - The locale to check
 * @returns Array of missing translation keys
 */
export function validateNavigationTranslations(
  messages: Record<string, any>, 
  locale: string
): string[] {
  const requiredKeys = getRequiredTranslationKeys()
  const navigationMessages = messages.navigation || {}
  
  return requiredKeys.filter(key => !(key in navigationMessages))
}
