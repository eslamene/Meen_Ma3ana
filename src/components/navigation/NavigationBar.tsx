'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatNotificationCount } from '@/lib/utils'
import Logo from '@/components/ui/Logo'
import LayoutToggle from '@/components/layout/LayoutToggle'
import { createClient } from '@/lib/supabase/client'
import { createContributionNotificationService } from '@/lib/notifications/contribution-notifications'
import { User } from '@supabase/supabase-js'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useAdmin } from '@/lib/admin/hooks'
import GuestPermissionGuard from '@/components/auth/GuestPermissionGuard'
import { getPublicNavItems } from '@/lib/navigation/public-nav-config'
import { getIcon } from '@/lib/icons/registry'
import type { AdminMenuItem } from '@/lib/admin/types'

import { defaultLogger as logger } from '@/lib/logger'

/**
 * Helper function to check if a menu item is an admin module
 * Admin modules are identified by:
 * 1. Being the admin parent menu itself (href === '/admin')
 * 2. Having a parent_id that points to an admin parent menu
 * 3. Being a descendant of an admin parent menu in the hierarchy
 */
function isAdminModule(item: AdminMenuItem, allItems: AdminMenuItem[]): boolean {
  // Check if item is the admin parent menu itself
  if (item.href === '/admin' && !item.parent_id) {
    return true
  }
  
  // Build a map of all items for efficient lookup
  const itemMap = new Map(allItems.map(i => [i.id, i]))
  
  // Check if item has admin parent in its hierarchy
  let currentItem: AdminMenuItem | undefined = item
  const visited = new Set<string>()
  
  while (currentItem?.parent_id && !visited.has(currentItem.id)) {
    visited.add(currentItem.id)
    const parent = itemMap.get(currentItem.parent_id)
    if (parent) {
      // If parent is admin menu, this is an admin module
      if (parent.href === '/admin' && !parent.parent_id) {
        return true
      }
      currentItem = parent
    } else {
      break
    }
  }
  
  return false
}

export default function NavigationBar() {
  const t = useTranslations('navigation')
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = params.locale as string
  
  const [user, setUser] = useState<User | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [publicNavItems, setPublicNavItems] = useState<Awaited<ReturnType<typeof getPublicNavItems>>>([])
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)

  const supabase = createClient()
  
  // Check if we're on the reset password page
  const isResetPasswordPage = pathname?.includes('/auth/reset-password') || false
  
  // Check for recovery mode - optimized to check less frequently
  useEffect(() => {
    const checkRecoveryMode = () => {
      if (typeof window !== 'undefined') {
        const recoveryMode = document.cookie
          .split('; ')
          .find(row => row.startsWith('recovery_mode='))
          ?.split('=')[1] === 'true'
        setIsRecoveryMode(prev => {
          // Only update state if it changed to prevent unnecessary re-renders
          if (prev !== recoveryMode) {
            return recoveryMode
          }
          return prev
        })
      }
    }
    
    checkRecoveryMode()
    
    // Check periodically in case cookie changes (reduced frequency for better performance)
    const interval = setInterval(checkRecoveryMode, 5000) // Changed from 1000ms to 5000ms
    return () => clearInterval(interval)
  }, [])
  
  // Use the new admin hook
  const { menuItems, loading: modulesLoading } = useAdmin()
  
  // Memoize filtered menu items for top navigation with smart prioritization
  const { topNavItems, overflowItems } = useMemo(() => {
    const filtered = menuItems.filter(item => {
      // Only include top-level items (items without parent_id)
      if (item.parent_id) {
        return false
      }
      
      // Exclude notifications - handled separately in right side with badge
      if (item.href === '/notifications') {
        return false
      }
      
      // Exclude profile - Dashboard and My Contributions will be in user profile dropdown
      if (item.href === '/profile') {
        return false
      }
      
      // Exclude admin-specific modules that should only be in sidebar
      // Use dynamic system operation instead of hardcoded list
      if (isAdminModule(item, menuItems)) {
        return false
      }
      
      return true
    })
    
    // Sort by sort_order
    const sorted = [...filtered].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    
    // Define priority items that should always be visible (Home, Cases)
    const priorityHrefs = ['/', '/cases']
    const priorityItems = sorted.filter(item => priorityHrefs.includes(item.href))
    const otherItems = sorted.filter(item => !priorityHrefs.includes(item.href))
    
    // Combine: priority items first, then others
    const allItems = [...priorityItems, ...otherItems]
    
    // For responsive design: show first 3-4 items, rest go to "More" dropdown
    // Priority items always show, then up to 2 more items
    const visibleItems = allItems.slice(0, Math.max(priorityItems.length, 4))
    const overflow = allItems.slice(visibleItems.length)
    
    return {
      topNavItems: visibleItems,
      overflowItems: overflow
    }
  }, [menuItems])
  
  // Memoize Dashboard and My Contributions lookups to prevent unnecessary re-renders
  const { dashboardItemFallback, contributionsItemFallback } = useMemo(() => {
    // Find Dashboard and My Contributions from menuItems to add to user profile dropdown
    // Check top-level items first, then check children of any parent items
    let dashboardItem = menuItems.find(item => item.href === '/dashboard' && !item.parent_id)
    let contributionsItem = menuItems.find(item => item.href === '/contributions' && !item.parent_id)
    
    // If not found, check children of Profile or other parent items
    if (!dashboardItem) {
      const profileItem = menuItems.find(item => item.href === '/profile')
      dashboardItem = profileItem?.children?.find(child => child.href === '/dashboard')
    }
    
    if (!contributionsItem) {
      const profileItem = menuItems.find(item => item.href === '/profile')
      contributionsItem = profileItem?.children?.find(child => child.href === '/contributions')
    }
    
    // Fallback: Create items if not found in menuItems (always show in profile dropdown)
    const dashboardItemFallback = dashboardItem || {
      id: 'dashboard-fallback',
      label: 'Dashboard',
      label_ar: 'لوحة التحكم',
      href: '/dashboard',
      icon: 'BarChart3',
      sort_order: 1
    }
    
    const contributionsItemFallback = contributionsItem || {
      id: 'contributions-fallback',
      label: 'My Contributions',
      label_ar: 'مساهماتي',
      href: '/contributions',
      icon: 'DollarSign',
      sort_order: 2
    }
    
    return { dashboardItemFallback, contributionsItemFallback }
  }, [menuItems])

  const fetchUnreadNotifications = useCallback(async (userId: string) => {
    try {
      const notificationService = createContributionNotificationService(supabase)
      const count = await notificationService.getUnreadNotificationCount(userId)
      setUnreadNotifications(count)
    } catch (error) {
      logger.error('Error fetching unread notifications:', { error: error })
      // Don't set error state, just keep count at 0
      setUnreadNotifications(0)
    }
  }, [supabase])

  const fetchUserAndNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await fetchUnreadNotifications(user.id)
      }
    } catch (error) {
      logger.error('Error fetching user:', { error: error })
    }
  }, [supabase.auth, fetchUnreadNotifications])

  useEffect(() => {
    // Defer async call to avoid setState in effect
    Promise.resolve().then(() => {
      fetchUserAndNotifications()
    })
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchUnreadNotifications(session.user.id)
        // Permissions are handled automatically by useAdmin
      } else {
        setUser(null)
        setUnreadNotifications(0)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, fetchUserAndNotifications, fetchUnreadNotifications])

  // Memoize conditions to prevent unnecessary re-renders
  const isLandingPage = useMemo(() => pathname?.includes('/landing') || false, [pathname])
  const shouldShowPublicNav = useMemo(() => 
    !user || isRecoveryMode || (isResetPasswordPage && !isRecoveryMode),
    [user, isRecoveryMode, isResetPasswordPage]
  )

  // Fetch public navigation items from database
  useEffect(() => {
    const fetchNavItems = async () => {
      if (shouldShowPublicNav) {
        const items = await getPublicNavItems(isLandingPage, locale)
        setPublicNavItems(items)
      } else {
        // Clear nav items when user is authenticated (and not in recovery)
        setPublicNavItems([])
      }
    }
    fetchNavItems()
  }, [shouldShowPublicNav, isLandingPage, locale])

  // Note: useAdmin handles permission refresh automatically

  // Note: useAdmin handles cross-tab synchronization automatically

  // Note: useAdmin handles admin system update events automatically


  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      router.push(`/${locale}/landing`)
    } catch (error) {
      logger.error('Error signing out:', { error: error })
    }
  }, [supabase.auth, router, locale])

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  // Memoize navigation link class calculation to prevent unnecessary re-renders
  const getNavLinkClass = useCallback((href: string) => {
    // Handle hash links - they're never active
    if (href.startsWith('#')) {
      return 'text-gray-800 hover:text-[#6B8E7E] hover:bg-[#6B8E7E]/10 transition-all duration-200'
    }
    
    // Extract the path from full href (e.g., /en/cases -> /cases)
    const path = href.replace(new RegExp(`^/${locale}`), '') || '/'
    const currentPath = pathname.replace(new RegExp(`^/${locale}`), '') || '/'
    
    // Check if current path matches
    const isActive = currentPath === path || currentPath.startsWith(path + '/')
    
    // Use theme colors: #6B8E7E (meen green) for primary brand color
    return isActive
      ? 'text-[#6B8E7E] font-semibold bg-[#6B8E7E]/10 border-b-2 border-[#6B8E7E]' 
      : 'text-gray-800 hover:text-[#6B8E7E] hover:bg-[#6B8E7E]/10 transition-all duration-200'
  }, [pathname, locale])

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50 overflow-visible">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 overflow-visible">
        <div className="flex justify-between items-center h-16 md:h-16 gap-2 overflow-visible">
          {/* Logo and Brand */}
          <div className="flex items-center flex-shrink-0 min-w-0">
            <Logo size="lg" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-0.5 xl:space-x-1 flex-1 justify-center max-w-5xl mx-2 xl:mx-4 overflow-visible">
            {!user || isRecoveryMode || (isResetPasswordPage && !isRecoveryMode) ? (
              // Public user navigation - uses database with config fallback
              <>
                {publicNavItems.slice(0, 4).map((item) => {
                  const Icon = item.icon
                  const isHashLink = item.isHashLink
                  const hasChildren = item.children && item.children.length > 0
                  
                  // Render parent item with dropdown if it has children
                  if (hasChildren) {
                    return (
                      <div key={item.key} className="relative group overflow-visible">
                        <button
                          className={`${getNavLinkClass(item.href)} px-3 xl:px-4 py-2 text-sm font-medium rounded-lg mx-0.5 xl:mx-1 flex items-center gap-1.5 whitespace-nowrap`}
                        >
                          {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                          <span className="hidden xl:inline">{t(item.labelKey)}</span>
                          <span className="xl:hidden">{t(item.labelKey).length > 10 ? t(item.labelKey).substring(0, 10) + '...' : t(item.labelKey)}</span>
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {item.children && item.children.length > 0 && (
                          <div className="absolute top-full left-0 pt-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none group-hover:pointer-events-auto">
                            <div className="bg-white rounded-md shadow-lg border border-gray-200 py-1">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon
                                const childIsHashLink = child.isHashLink
                                const childLinkContent = (
                                  <Link
                                    key={child.key}
                                    href={child.href}
                                    className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 ${childIsHashLink ? 'cursor-pointer' : ''}`}
                                    onClick={childIsHashLink ? (e) => {
                                      e.preventDefault()
                                      if (child.href.includes('/landing')) {
                                        router.push(child.href)
                                        setTimeout(() => {
                                          const hash = child.href.split('#')[1]
                                          const element = document.getElementById(hash)
                                          element?.scrollIntoView({ behavior: 'smooth' })
                                        }, 100)
                                      } else {
                                        const hash = child.href.replace('#', '')
                                        const element = document.getElementById(hash)
                                        element?.scrollIntoView({ behavior: 'smooth' })
                                      }
                                    } : undefined}
                                  >
                                    {ChildIcon && <ChildIcon className="h-4 w-4" />}
                                    {t(child.labelKey)}
                                  </Link>
                                )

                                if (child.requiresPermission) {
                                  return (
                                    <GuestPermissionGuard
                                      key={child.key}
                                      visitorPermissions={[child.requiresPermission]}
                                      showLoading={false}
                                      showAuthPrompt={false}
                                    >
                                      {childLinkContent}
                                    </GuestPermissionGuard>
                                  )
                                }

                                return childLinkContent
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }
                  
                  // Regular item without children
                  const linkClass = isHashLink
                    ? 'px-3 xl:px-4 py-2 text-sm font-medium rounded-lg mx-0.5 xl:mx-1 text-gray-800 hover:text-[#6B8E7E] hover:bg-[#6B8E7E]/10 transition-all duration-200 whitespace-nowrap'
                    : `${getNavLinkClass(item.href)} px-3 xl:px-4 py-2 text-sm font-medium rounded-lg mx-0.5 xl:mx-1 whitespace-nowrap`
                  
                  const linkContent = (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`${linkClass} ${Icon ? 'flex items-center gap-1.5' : ''}`}
                      onClick={isHashLink ? (e) => {
                        e.preventDefault()
                        // If href already includes landing page, just scroll
                        if (item.href.includes('/landing')) {
                          router.push(item.href)
                          // Wait for navigation then scroll
                          setTimeout(() => {
                            const hash = item.href.split('#')[1]
                            const element = document.getElementById(hash)
                            element?.scrollIntoView({ behavior: 'smooth' })
                          }, 100)
                        } else {
                          // On landing page, just scroll
                          const hash = item.href.replace('#', '')
                          const element = document.getElementById(hash)
                          element?.scrollIntoView({ behavior: 'smooth' })
                        }
                      } : undefined}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {t(item.labelKey)}
                    </Link>
                  )

                  // Wrap with permission guard if required
                  if (item.requiresPermission) {
                    return (
                      <GuestPermissionGuard
                        key={item.key}
                        visitorPermissions={[item.requiresPermission]}
                        showLoading={false}
                        showAuthPrompt={false}
                      >
                        {linkContent}
                      </GuestPermissionGuard>
                    )
                  }

                  return linkContent
                })}
              </>
            ) : (
              // Authenticated user navigation - uses menuItems from useAdmin()
              <>
                {!modulesLoading && (
                  <>
                    {/* Visible navigation items */}
                    {topNavItems.map((item) => {
                      const Icon = item.icon ? getIcon(item.icon) : undefined
                      const hasChildren = item.children && item.children.length > 0
                      const labelText = locale === 'ar' && item.label_ar ? item.label_ar : item.label
                      
                      // Render parent item with dropdown if it has children
                      if (hasChildren) {
                        return (
                          <div key={item.id} className="relative group overflow-visible">
                            <button
                              className={`${getNavLinkClass(item.href)} px-3 xl:px-4 py-2 text-sm font-medium rounded-lg mx-0.5 xl:mx-1 flex items-center gap-1.5 whitespace-nowrap`}
                            >
                              {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                              <span className="hidden xl:inline">{labelText}</span>
                              <span className="xl:hidden">{labelText.length > 10 ? labelText.substring(0, 10) + '...' : labelText}</span>
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {item.children && item.children.length > 0 && (
                              <div className="absolute top-full left-0 pt-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none group-hover:pointer-events-auto">
                                <div className="bg-white rounded-md shadow-lg border border-gray-200 py-1">
                                  {item.children.map((child) => {
                                    const ChildIcon = child.icon ? getIcon(child.icon) : undefined
                                    const childLabelText = locale === 'ar' && child.label_ar ? child.label_ar : child.label
                                    return (
                                      <Link
                                        key={child.id}
                                        href={`/${locale}${child.href}`}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                      >
                                        {ChildIcon && <ChildIcon className="h-4 w-4" />}
                                        {childLabelText}
                                      </Link>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      }
                      
                      // Regular item without children
                      const linkContent = (
                        <Link
                          key={item.id}
                          href={`/${locale}${item.href}`}
                          className={`${getNavLinkClass(item.href)} px-3 xl:px-4 py-2 text-sm font-medium rounded-lg mx-0.5 xl:mx-1 whitespace-nowrap ${Icon ? 'flex items-center gap-1.5' : ''}`}
                        >
                          {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                          <span className="hidden xl:inline">{labelText}</span>
                          <span className="xl:hidden">{labelText.length > 10 ? labelText.substring(0, 10) + '...' : labelText}</span>
                        </Link>
                      )
                      
                      // Wrap with permission guard if item has permission requirement
                      if (item.permission_id) {
                        // We need to check permission - but we don't have permission name here
                        // The useAdmin hook already filters by permissions, so items here should be accessible
                        // But we can add an extra check if needed
                        return linkContent
                      }
                      
                      return linkContent
                    })}
                    
                    {/* More dropdown for overflow items */}
                    {overflowItems.length > 0 && (
                      <div className="relative group overflow-visible">
                        <button
                          className={`${getNavLinkClass('')} px-3 xl:px-4 py-2 text-sm font-medium rounded-lg mx-0.5 xl:mx-1 flex items-center gap-1.5 whitespace-nowrap`}
                        >
                          <span>{locale === 'ar' ? 'المزيد' : 'More'}</span>
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <div className="absolute top-full right-0 pt-1 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none group-hover:pointer-events-auto">
                          <div className="bg-white rounded-md shadow-lg border border-gray-200 py-1">
                            {overflowItems.map((item) => {
                              const Icon = item.icon ? getIcon(item.icon) : undefined
                              const hasChildren = item.children && item.children.length > 0
                              const labelText = locale === 'ar' && item.label_ar ? item.label_ar : item.label
                              
                              if (hasChildren) {
                                return (
                                  <div key={item.id} className="px-2 py-1">
                                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      {labelText}
                                    </div>
                                    {item.children?.map((child) => {
                                      const ChildIcon = child.icon ? getIcon(child.icon) : undefined
                                      const childLabelText = locale === 'ar' && child.label_ar ? child.label_ar : child.label
                                      return (
                                        <Link
                                          key={child.id}
                                          href={`/${locale}${child.href}`}
                                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                        >
                                          {ChildIcon && <ChildIcon className="h-4 w-4" />}
                                          {childLabelText}
                                        </Link>
                                      )
                                    })}
                                  </div>
                                )
                              }
                              
                              return (
                                <Link
                                  key={item.id}
                                  href={`/${locale}${item.href}`}
                                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  {Icon && <Icon className="h-4 w-4" />}
                                  {labelText}
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Right side - Language Switcher, Auth and Notifications */}
          <div className="hidden lg:flex items-center space-x-3 xl:space-x-4 flex-shrink-0 overflow-visible">
            {/* Language Switcher */}
            <LanguageSwitcher />
            {user && !isRecoveryMode && !(isResetPasswordPage && !isRecoveryMode) ? (
              <>
                {/* Layout Toggle - Only for authenticated users */}
                <LayoutToggle />
                {/* Notifications */}
                <Link href={`/${locale}/notifications`} className="relative">
                  <Button variant="ghost" size="sm" className="relative p-2 hover:bg-[#6B8E7E]/10 hover:text-[#6B8E7E] transition-all duration-200 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {unreadNotifications > 0 && (
                      <Badge className="absolute -top-1 -right-1 min-w-[1.5rem] h-6 px-1.5 flex items-center justify-center text-xs bg-red-500 text-white border-2 border-white shadow-lg">
                        {formatNotificationCount(unreadNotifications)}
                      </Badge>
                    )}
                  </Button>
                </Link>

                {/* User Menu */}
                <div className="relative group overflow-visible">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-3 hover:bg-[#6B8E7E]/10 hover:text-[#6B8E7E] transition-all duration-200 rounded-lg px-3 py-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#6B8E7E] to-[#5A7A6B] rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white text-sm font-semibold">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="hidden lg:block text-sm text-gray-800 font-medium">
                      {user.email}
                    </span>
                    <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none group-hover:pointer-events-auto">
                    <div className="bg-white rounded-xl shadow-xl py-2 border border-gray-100">
                    {/* Dashboard */}
                    <Link 
                      href={`/${locale}${dashboardItemFallback.href}`}
                      className="block px-4 py-3 text-sm text-gray-800 hover:bg-[#6B8E7E]/10 hover:text-[#6B8E7E] transition-colors mx-2 rounded-lg"
                      onClick={closeMobileMenu}
                    >
                      <div className="flex items-center space-x-3">
                        {dashboardItemFallback.icon && (() => {
                          const DashboardIcon = getIcon(dashboardItemFallback.icon)
                          return DashboardIcon ? <DashboardIcon className="w-4 h-4" /> : null
                        })()}
                        <span>{locale === 'ar' && dashboardItemFallback.label_ar ? dashboardItemFallback.label_ar : dashboardItemFallback.label}</span>
                      </div>
                    </Link>
                    
                    {/* My Contributions */}
                    <Link 
                      href={`/${locale}${contributionsItemFallback.href}`}
                      className="block px-4 py-3 text-sm text-gray-800 hover:bg-[#6B8E7E]/10 hover:text-[#6B8E7E] transition-colors mx-2 rounded-lg"
                      onClick={closeMobileMenu}
                    >
                      <div className="flex items-center space-x-3">
                        {contributionsItemFallback.icon && (() => {
                          const ContributionsIcon = getIcon(contributionsItemFallback.icon)
                          return ContributionsIcon ? <ContributionsIcon className="w-4 h-4" /> : null
                        })()}
                        <span>{locale === 'ar' && contributionsItemFallback.label_ar ? contributionsItemFallback.label_ar : contributionsItemFallback.label}</span>
                      </div>
                    </Link>
                    
                    {/* Divider */}
                    <div className="border-t border-gray-200 my-2"></div>
                    
                    {/* Profile */}
                    <Link 
                      href={`/${locale}/profile`}
                      className="block px-4 py-3 text-sm text-gray-800 hover:bg-[#6B8E7E]/10 hover:text-[#6B8E7E] transition-colors mx-2 rounded-lg"
                      onClick={closeMobileMenu}
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{t('profile')}</span>
                      </div>
                    </Link>
                    
                    {/* Logout */}
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-3 text-sm text-gray-800 hover:bg-red-50 hover:text-red-700 transition-colors mx-2 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>{t('logout')}</span>
                      </div>
                    </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href={`/${locale}/auth/login`}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-gray-700 hover:text-[#6B8E7E] hover:bg-[#6B8E7E]/10 transition-all duration-200 font-medium"
                  >
                    {t('login')}
                  </Button>
                </Link>
                <Link href={`/${locale}/auth/register`}>
                  <Button 
                    size="sm"
                    className="bg-gradient-to-r from-[#6B8E7E] to-[#5a7a6b] hover:from-[#5a7a6b] hover:to-[#4a6a5b] text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    {t('register')}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: Language Switcher and Menu button */}
          <div className="lg:hidden flex items-center space-x-2 flex-shrink-0">
            {/* Compact Language Switcher for Mobile */}
            <LanguageSwitcher compact />
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="p-2 hover:bg-[#6B8E7E]/10 hover:text-[#6B8E7C] transition-all duration-200 rounded-lg"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden">
            <div className="px-4 pt-4 pb-4 space-y-1">
              {!user ? (
                // Public user mobile navigation - uses database with config fallback
                <>
                  {publicNavItems.map((item) => {
                    const Icon = item.icon
                    const isHashLink = item.isHashLink
                    const hasChildren = item.children && item.children.length > 0
                    
                    // Render parent item with children
                    if (hasChildren) {
                      return (
                        <div key={item.key} className="space-y-1">
                          <div className="px-4 py-2 text-sm font-semibold text-gray-900 flex items-center gap-2">
                            {Icon && <Icon className="h-4 w-4" />}
                            {t(item.labelKey)}
                          </div>
                          {item.children && (
                            <div className="pl-4 space-y-1">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon
                                const childIsHashLink = child.isHashLink
                                const childLinkClass = childIsHashLink
                                  ? 'block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors'
                                  : `${getNavLinkClass(child.href)} block px-4 py-2 text-sm rounded-lg transition-colors`
                                
                                const childLinkContent = (
                                  <Link
                                    key={child.key}
                                    href={child.href}
                                    className={`${childLinkClass} ${ChildIcon ? 'flex items-center gap-2' : ''}`}
                                    onClick={childIsHashLink ? (e) => {
                                      e.preventDefault()
                                      closeMobileMenu()
                                      if (child.href.includes('/landing')) {
                                        router.push(child.href)
                                        setTimeout(() => {
                                          const hash = child.href.split('#')[1]
                                          const element = document.getElementById(hash)
                                          element?.scrollIntoView({ behavior: 'smooth' })
                                        }, 100)
                                      } else {
                                        const hash = child.href.replace('#', '')
                                        const element = document.getElementById(hash)
                                        element?.scrollIntoView({ behavior: 'smooth' })
                                      }
                                    } : closeMobileMenu}
                                  >
                                    {ChildIcon && <ChildIcon className="h-4 w-4" />}
                                    {t(child.labelKey)}
                                  </Link>
                                )

                                if (child.requiresPermission) {
                                  return (
                                    <GuestPermissionGuard
                                      key={child.key}
                                      visitorPermissions={[child.requiresPermission]}
                                      showLoading={false}
                                      showAuthPrompt={false}
                                    >
                                      {childLinkContent}
                                    </GuestPermissionGuard>
                                  )
                                }

                                return childLinkContent
                              })}
                            </div>
                          )}
                        </div>
                      )
                    }
                    
                    // Regular item without children
                    const linkClass = isHashLink
                      ? 'block px-4 py-3 text-base font-medium rounded-lg transition-colors text-gray-800 hover:text-[#6B8E7E] hover:bg-[#6B8E7E]/10'
                      : `${getNavLinkClass(item.href)} block px-4 py-3 text-base font-medium rounded-lg transition-colors`
                    
                    const linkContent = (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={`${linkClass} ${Icon ? 'flex items-center gap-2' : ''}`}
                        onClick={isHashLink ? (e) => {
                          e.preventDefault()
                          closeMobileMenu()
                          // If href already includes landing page, navigate then scroll
                          if (item.href.includes('/landing')) {
                            router.push(item.href)
                            // Wait for navigation then scroll
                            setTimeout(() => {
                              const hash = item.href.split('#')[1]
                              const element = document.getElementById(hash)
                              element?.scrollIntoView({ behavior: 'smooth' })
                            }, 100)
                          } else {
                            // On landing page, just scroll
                            const hash = item.href.replace('#', '')
                            const element = document.getElementById(hash)
                            element?.scrollIntoView({ behavior: 'smooth' })
                          }
                        } : closeMobileMenu}
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        {t(item.labelKey)}
                      </Link>
                    )

                    // Wrap with permission guard if required
                    if (item.requiresPermission) {
                      return (
                        <GuestPermissionGuard
                          key={item.key}
                          visitorPermissions={[item.requiresPermission]}
                          showLoading={false}
                          showAuthPrompt={false}
                        >
                          {linkContent}
                        </GuestPermissionGuard>
                      )
                    }

                    return linkContent
                  })}

                  <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                    <Link 
                      href={`/${locale}/auth/login`}
                      className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-[#6B8E7E] rounded-lg hover:bg-[#6B8E7E]/10 transition-colors"
                      onClick={closeMobileMenu}
                    >
                      {t('login')}
                    </Link>
                    <Link 
                      href={`/${locale}/auth/register`}
                      className="block px-4 py-3 text-base font-medium text-white bg-gradient-to-r from-[#6B8E7E] to-[#5a7a6b] rounded-lg text-center hover:from-[#5a7a6b] hover:to-[#4a6a5b] transition-all duration-200 shadow-md"
                      onClick={closeMobileMenu}
                    >
                      {t('register')}
                    </Link>
                  </div>
                </>
              ) : (
                // Authenticated user mobile navigation - uses menuItems from useAdmin()
                <>
                  {!modulesLoading && topNavItems.map((item) => {
                    const Icon = item.icon ? getIcon(item.icon) : undefined
                    const hasChildren = item.children && item.children.length > 0
                    const labelText = locale === 'ar' && item.label_ar ? item.label_ar : item.label
                    
                    // Render parent item with children
                    if (hasChildren) {
                      return (
                        <div key={item.id} className="space-y-1">
                          <div className="px-4 py-2 text-sm font-semibold text-gray-900 flex items-center gap-2">
                            {Icon && <Icon className="h-4 w-4" />}
                            {labelText}
                          </div>
                          {item.children && (
                            <div className="pl-4 space-y-1">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon ? getIcon(child.icon) : undefined
                                const childLabelText = locale === 'ar' && child.label_ar ? child.label_ar : child.label
                                return (
                                  <Link
                                    key={child.id}
                                    href={`/${locale}${child.href}`}
                                    onClick={closeMobileMenu}
                                    className="block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                                  >
                                    {ChildIcon && <ChildIcon className="h-4 w-4" />}
                                    {childLabelText}
                                  </Link>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    }
                    
                    // Regular item without children
                    return (
                      <Link
                        key={item.id}
                        href={`/${locale}${item.href}`}
                        className={`${getNavLinkClass(item.href)} block px-4 py-3 text-base font-medium rounded-lg transition-colors ${Icon ? 'flex items-center gap-2' : ''}`}
                        onClick={closeMobileMenu}
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        <span>{labelText}</span>
                      </Link>
                    )
                  })}

                  {/* Notifications - shown separately in mobile with badge */}
                  {!modulesLoading && menuItems.find(item => item.href === '/notifications' && !item.parent_id) && (
                    <Link
                      href={`/${locale}/notifications`}
                      className={`${getNavLinkClass('/notifications')} block px-4 py-3 text-base font-medium rounded-lg transition-colors flex items-center gap-2`}
                      onClick={closeMobileMenu}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div className="flex items-center justify-between w-full">
                        <span>{t('notifications')}</span>
                        {unreadNotifications > 0 && (
                          <Badge className="ml-2 bg-red-500 text-white min-w-[1.75rem] px-1.5">
                            {formatNotificationCount(unreadNotifications)}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  )}

                  <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
                    <div className="px-4 py-2 text-sm text-gray-500">
                      {user.email}
                    </div>
                    
                    {/* Dashboard */}
                    <Link 
                      href={`/${locale}${dashboardItemFallback.href}`}
                      className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-[#6B8E7E] hover:bg-[#6B8E7E]/10 rounded-lg transition-colors flex items-center gap-2"
                      onClick={closeMobileMenu}
                    >
                      {dashboardItemFallback.icon && (() => {
                        const DashboardIcon = getIcon(dashboardItemFallback.icon)
                        return DashboardIcon ? <DashboardIcon className="h-4 w-4" /> : null
                      })()}
                      <span>{locale === 'ar' && dashboardItemFallback.label_ar ? dashboardItemFallback.label_ar : dashboardItemFallback.label}</span>
                    </Link>
                    
                    {/* My Contributions */}
                    <Link 
                      href={`/${locale}${contributionsItemFallback.href}`}
                      className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-[#6B8E7E] hover:bg-[#6B8E7E]/10 rounded-lg transition-colors flex items-center gap-2"
                      onClick={closeMobileMenu}
                    >
                      {contributionsItemFallback.icon && (() => {
                        const ContributionsIcon = getIcon(contributionsItemFallback.icon)
                        return ContributionsIcon ? <ContributionsIcon className="h-4 w-4" /> : null
                      })()}
                      <span>{locale === 'ar' && contributionsItemFallback.label_ar ? contributionsItemFallback.label_ar : contributionsItemFallback.label}</span>
                    </Link>
                    
                    {/* Divider */}
                    <div className="border-t border-gray-200 my-2"></div>
                    
                    {/* Profile */}
                    <Link 
                      href={`/${locale}/profile`}
                      className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-[#6B8E7E] hover:bg-[#6B8E7E]/10 rounded-lg transition-colors"
                      onClick={closeMobileMenu}
                    >
                      {t('profile')}
                    </Link>
                    
                    {/* Logout */}
                    <button
                      onClick={() => {
                        handleSignOut()
                        closeMobileMenu()
                      }}
                      className="block w-full text-left px-4 py-3 text-base font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      {t('logout')}
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        )}
      </div>
    </nav>
  )
} 