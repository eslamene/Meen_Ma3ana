'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatNotificationCount, cn } from '@/lib/utils'
import Logo from '@/components/ui/Logo'
import LayoutToggle from '@/components/layout/LayoutToggle'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useAdmin } from '@/lib/admin/hooks'
import GuestPermissionGuard from '@/components/auth/GuestPermissionGuard'
import { getPublicNavItems } from '@/lib/navigation/public-nav-config'
import { getIcon } from '@/lib/icons/registry'
import type { AdminMenuItem } from '@/lib/admin/types'
import { ChevronDown, LogOut, UserCircle } from 'lucide-react'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1440)

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

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  
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
    
    // Keep top nav single-line across laptop widths:
    // move more items into "More" when horizontal space is tight.
    const maxVisibleItems = viewportWidth < 1280 ? 3 : 4
    const visibleItems = allItems.slice(0, Math.max(priorityItems.length, maxVisibleItems))
    const overflow = allItems.slice(visibleItems.length)
    
    return {
      topNavItems: visibleItems,
      overflowItems: overflow
    }
  }, [menuItems, viewportWidth])
  
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

  const fetchUnreadNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count', {
        credentials: 'include',
      })
      if (!response.ok) {
        setUnreadNotifications(0)
        return
      }
      const data = await response.json()
      const count = typeof data.unreadCount === 'number' ? data.unreadCount : data.count ?? 0
      setUnreadNotifications(count)
    } catch (error) {
      logger.error('Error fetching unread notifications:', { error: error })
      setUnreadNotifications(0)
    }
  }, [])

  const fetchUserAndNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await fetchUnreadNotifications()
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
        fetchUnreadNotifications()
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
            <Logo size="md" />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-0.5 xl:space-x-1 flex-1 justify-center max-w-5xl mx-2 xl:mx-4 overflow-visible">
            {!user || isRecoveryMode || (isResetPasswordPage && !isRecoveryMode) ? (
              <NavigationMenu className="mx-auto max-w-none flex-1 justify-center">
                <NavigationMenuList className="flex flex-nowrap items-center justify-center gap-0.5 space-x-0 xl:gap-1">
                  {publicNavItems.slice(0, 4).map((item) => {
                    const Icon = item.icon ? getIcon(item.icon) : undefined
                    const isHashLink = item.isHashLink
                    const hasChildren = item.children && item.children.length > 0

                    if (hasChildren) {
                      const dropdownTriggerClass = cn(
                        navigationMenuTriggerStyle(),
                        getNavLinkClass(item.href),
                        'h-auto gap-1.5 rounded-lg border-0 bg-transparent px-3 py-2 text-sm font-medium shadow-none hover:bg-[#6B8E7E]/10 xl:px-4 data-[state=open]:bg-gray-100/90'
                      )

                      return (
                        <NavigationMenuItem key={item.key}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className={dropdownTriggerClass}>
                                {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                                <span className="hidden xl:inline">{t(item.labelKey)}</span>
                                <span className="xl:hidden">
                                  {t(item.labelKey).length > 10 ? t(item.labelKey).substring(0, 10) + '...' : t(item.labelKey)}
                                </span>
                                <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" sideOffset={8} className="w-64 p-2 z-[120]">
                              {item.children?.map((child) => {
                                const ChildIcon = child.icon ? getIcon(child.icon) : undefined
                                const childIsHashLink = child.isHashLink
                                const linkElement = (
                                  <Link
                                    href={child.href}
                                    className="flex items-center gap-2"
                                    onClick={
                                      childIsHashLink
                                        ? (e) => {
                                            e.preventDefault()
                                            if (child.href.includes('/landing')) {
                                              router.push(child.href)
                                              setTimeout(() => {
                                                const hash = child.href.split('#')[1]
                                                document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
                                              }, 100)
                                            } else {
                                              const hash = child.href.replace('#', '')
                                              document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
                                            }
                                          }
                                        : undefined
                                    }
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
                                      <DropdownMenuItem asChild className="cursor-pointer">
                                        {linkElement}
                                      </DropdownMenuItem>
                                    </GuestPermissionGuard>
                                  )
                                }
                                return (
                                  <DropdownMenuItem key={child.key} asChild className="cursor-pointer">
                                    {linkElement}
                                  </DropdownMenuItem>
                                )
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </NavigationMenuItem>
                      )
                    }

                    const linkClass = isHashLink
                      ? 'px-3 xl:px-4 py-2 text-sm font-medium rounded-lg mx-0.5 xl:mx-1 text-gray-800 hover:text-[#6B8E7E] hover:bg-[#6B8E7E]/10 transition-all duration-200 whitespace-nowrap'
                      : `${getNavLinkClass(item.href)} px-3 xl:px-4 py-2 text-sm font-medium rounded-lg mx-0.5 xl:mx-1 whitespace-nowrap`

                    const linkInner = (
                      <NavigationMenuLink
                        asChild
                        className={cn(
                          navigationMenuTriggerStyle(),
                          linkClass,
                          'h-auto justify-start gap-1.5 rounded-lg border-0 bg-transparent shadow-none'
                        )}
                      >
                        <Link
                          href={item.href}
                          className="flex w-full items-center gap-1.5"
                          onClick={
                            isHashLink
                              ? (e) => {
                                  e.preventDefault()
                                  if (item.href.includes('/landing')) {
                                    router.push(item.href)
                                    setTimeout(() => {
                                      const hash = item.href.split('#')[1]
                                      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
                                    }, 100)
                                  } else {
                                    const hash = item.href.replace('#', '')
                                    document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
                                  }
                                }
                              : undefined
                          }
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                          {t(item.labelKey)}
                        </Link>
                      </NavigationMenuLink>
                    )

                    return (
                      <NavigationMenuItem key={item.key}>
                        {item.requiresPermission ? (
                          <GuestPermissionGuard
                            visitorPermissions={[item.requiresPermission]}
                            showLoading={false}
                            showAuthPrompt={false}
                          >
                            {linkInner}
                          </GuestPermissionGuard>
                        ) : (
                          linkInner
                        )}
                      </NavigationMenuItem>
                    )
                  })}
                </NavigationMenuList>
              </NavigationMenu>
            ) : (
              <>
                {!modulesLoading && (
                  <NavigationMenu className="mx-auto max-w-none flex-1 justify-center">
                    <NavigationMenuList className="flex flex-nowrap items-center justify-center gap-0.5 space-x-0 xl:gap-1">
                      {topNavItems.map((item) => {
                        const Icon = item.icon ? getIcon(item.icon) : undefined
                        const hasChildren = item.children && item.children.length > 0
                        const labelText = locale === 'ar' && item.label_ar ? item.label_ar : item.label

                        if (hasChildren) {
                          const dropdownTriggerClass = cn(
                            navigationMenuTriggerStyle(),
                            getNavLinkClass(item.href),
                            'h-auto gap-1.5 rounded-lg border-0 bg-transparent px-3 py-2 text-sm font-medium shadow-none hover:bg-[#6B8E7E]/10 xl:px-4 data-[state=open]:bg-gray-100/90'
                          )

                          return (
                            <NavigationMenuItem key={item.id}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button type="button" className={dropdownTriggerClass}>
                                    {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                                    <span className="hidden xl:inline">{labelText}</span>
                                    <span className="xl:hidden">
                                      {labelText.length > 10 ? labelText.substring(0, 10) + '...' : labelText}
                                    </span>
                                    <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" sideOffset={8} className="w-64 p-2 z-[120]">
                                  {item.children!.map((child) => {
                                    const ChildIcon = child.icon ? getIcon(child.icon) : undefined
                                    const childLabelText =
                                      locale === 'ar' && child.label_ar ? child.label_ar : child.label
                                    return (
                                      <DropdownMenuItem key={child.id} asChild className="cursor-pointer">
                                        <Link
                                          href={`/${locale}${child.href}`}
                                          className="flex items-center gap-2"
                                        >
                                          {ChildIcon && <ChildIcon className="h-4 w-4" />}
                                          {childLabelText}
                                        </Link>
                                      </DropdownMenuItem>
                                    )
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </NavigationMenuItem>
                          )
                        }

                        return (
                          <NavigationMenuItem key={item.id}>
                            <NavigationMenuLink
                              asChild
                              className={cn(
                                navigationMenuTriggerStyle(),
                                getNavLinkClass(item.href),
                                'h-auto justify-start gap-1.5 rounded-lg border-0 bg-transparent px-3 py-2 text-sm font-medium shadow-none xl:px-4'
                              )}
                            >
                              <Link
                                href={`/${locale}${item.href}`}
                                className="flex w-full items-center gap-1.5"
                              >
                                {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                                <span className="hidden xl:inline">{labelText}</span>
                                <span className="xl:hidden">
                                  {labelText.length > 10 ? labelText.substring(0, 10) + '...' : labelText}
                                </span>
                              </Link>
                            </NavigationMenuLink>
                          </NavigationMenuItem>
                        )
                      })}

                      {overflowItems.length > 0 && (
                        <NavigationMenuItem>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  navigationMenuTriggerStyle(),
                                  getNavLinkClass(''),
                                  'h-auto gap-1.5 rounded-lg border-0 bg-transparent px-3 py-2 text-sm font-medium shadow-none xl:px-4 data-[state=open]:bg-gray-100/90'
                                )}
                              >
                                <span>{locale === 'ar' ? 'المزيد' : 'More'}</span>
                                <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" sideOffset={8} className="w-64 p-2 z-[120]">
                              {overflowItems.map((item) => {
                                const Icon = item.icon ? getIcon(item.icon) : undefined
                                const hasNested = item.children && item.children.length > 0
                                const labelText = locale === 'ar' && item.label_ar ? item.label_ar : item.label

                                if (hasNested) {
                                  return (
                                    <div key={item.id} className="py-1">
                                      <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {labelText}
                                      </div>
                                      <div className="space-y-0.5">
                                        {item.children!.map((child) => {
                                          const ChildIcon = child.icon ? getIcon(child.icon) : undefined
                                          const childLabelText =
                                            locale === 'ar' && child.label_ar ? child.label_ar : child.label
                                          return (
                                            <DropdownMenuItem key={child.id} asChild className="cursor-pointer">
                                              <Link
                                                href={`/${locale}${child.href}`}
                                                className="flex items-center gap-2"
                                              >
                                                {ChildIcon && <ChildIcon className="h-4 w-4" />}
                                                {childLabelText}
                                              </Link>
                                            </DropdownMenuItem>
                                          )
                                        })}
                                      </div>
                                      <DropdownMenuSeparator className="mt-1" />
                                    </div>
                                  )
                                }

                                return (
                                  <DropdownMenuItem key={item.id} asChild className="cursor-pointer">
                                    <Link
                                      href={`/${locale}${item.href}`}
                                      className="flex items-center gap-2"
                                    >
                                      {Icon && <Icon className="h-4 w-4" />}
                                      {labelText}
                                    </Link>
                                  </DropdownMenuItem>
                                )
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </NavigationMenuItem>
                      )}
                    </NavigationMenuList>
                  </NavigationMenu>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-3 hover:bg-[#6B8E7E]/10 hover:text-[#6B8E7E] transition-all duration-200 rounded-lg px-3 py-2 outline-none data-[state=open]:bg-gray-100/80"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-[#6B8E7E] to-[#5A7A6B] rounded-full flex items-center justify-center shadow-md">
                        <span className="text-white text-sm font-semibold">
                          {user.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <span className="hidden lg:inline text-sm text-gray-800 font-medium max-w-[160px] truncate">
                        {user.email}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 z-[100]" sideOffset={8}>
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link
                          href={`/${locale}${dashboardItemFallback.href}`}
                          className="flex items-center gap-3"
                          onClick={closeMobileMenu}
                        >
                          {dashboardItemFallback.icon && (() => {
                            const DashboardIcon = getIcon(dashboardItemFallback.icon)
                            return DashboardIcon ? <DashboardIcon className="h-4 w-4 shrink-0" /> : null
                          })()}
                          <span>
                            {locale === 'ar' && dashboardItemFallback.label_ar
                              ? dashboardItemFallback.label_ar
                              : dashboardItemFallback.label}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link
                          href={`/${locale}${contributionsItemFallback.href}`}
                          className="flex items-center gap-3"
                          onClick={closeMobileMenu}
                        >
                          {contributionsItemFallback.icon && (() => {
                            const ContributionsIcon = getIcon(contributionsItemFallback.icon)
                            return ContributionsIcon ? <ContributionsIcon className="h-4 w-4 shrink-0" /> : null
                          })()}
                          <span>
                            {locale === 'ar' && contributionsItemFallback.label_ar
                              ? contributionsItemFallback.label_ar
                              : contributionsItemFallback.label}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link
                        href={`/${locale}/profile`}
                        className="flex items-center gap-3"
                        onClick={closeMobileMenu}
                      >
                        <UserCircle className="h-4 w-4 shrink-0" />
                        <span>{t('profile')}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
                      onSelect={() => {
                        void handleSignOut()
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <LogOut className="h-4 w-4 shrink-0" />
                        {t('logout')}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                    const Icon = item.icon ? getIcon(item.icon) : undefined
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
                                const ChildIcon = child.icon ? getIcon(child.icon) : undefined
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