'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatNotificationCount } from '@/lib/utils'
import Logo from '@/components/ui/Logo'
import LayoutToggle from '@/components/layout/LayoutToggle'
import { createClient } from '@/lib/supabase/client'
import { useAdmin } from '@/lib/admin/hooks'
import { createContributionNotificationService } from '@/lib/notifications/contribution-notifications'
import { User } from '@supabase/supabase-js'
import { 
  X, 
  Home, 
  User as UserIcon, 
  Bell, 
  LogOut, 
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Heart,
  BarChart3,
  Users,
  CreditCard,
  Plus,
  UserPlus,
  Settings,
  Search,
  MoreVertical,
  Maximize2,
  Columns,
  Globe
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useLayoutOptional } from '@/components/layout/LayoutProvider'
import type { AdminMenuItem } from '@/lib/admin/types'
import { getIcon } from '@/lib/icons/registry'

import { defaultLogger as logger } from '@/lib/logger'

interface SimpleSidebarProps {
  isOpen: boolean
  onToggle: () => void
  collapsed?: boolean
  onCollapseToggle?: () => void
}

export default function SimpleSidebar({ 
  isOpen, 
  onToggle, 
  collapsed = false,
  onCollapseToggle 
}: SimpleSidebarProps) {
  const t = useTranslations('navigation')
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = params.locale as string

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [notificationCount, setNotificationCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()
  const { user, loading, menuItems } = useAdmin()
  const layoutContext = useLayoutOptional()
  
  // Store user in state to prevent footer from disappearing during re-renders
  // Use state instead of refs to avoid accessing refs during render
  const [stableUser, setStableUser] = useState<User | null>(null)
  
  useEffect(() => {
    if (user) {
      // Defer state update to avoid setState in effect
      Promise.resolve().then(() => {
        setStableUser(user)
      })
    }
    // Only clear stableUser if user is explicitly null (not just undefined/loading)
    // This prevents the footer from disappearing during loading states
  }, [user])
  
  // Menu items are already in tree structure from useAdmin hook
  // They are filtered by permissions and sorted by sort_order

  const fetchUnreadNotifications = useCallback(async (userId: string) => {
    try {
      const notificationService = createContributionNotificationService(supabase)
      const count = await notificationService.getUnreadNotificationCount(userId)
      setNotificationCount(count)
    } catch (error) {
      logger.error('Error fetching unread notifications:', { error: error })
      setNotificationCount(0)
    }
  }, [supabase])

  useEffect(() => {
    if (user) {
      // Defer async call to avoid setState in effect
      Promise.resolve().then(() => {
        fetchUnreadNotifications(user.id)
      })
    } else {
      // Defer state update to avoid setState in effect
      Promise.resolve().then(() => {
        setNotificationCount(0)
      })
    }
  }, [user, fetchUnreadNotifications])

  // Icon resolver - uses icon registry with fallback
  const getIconComponent = useMemo(() => {
    return (iconName: string) => {
      const Icon = getIcon(iconName)
      return Icon || Heart // Fallback to Heart if icon not found
    }
  }, [])

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push(`/${locale}/landing`)
    } catch (error) {
      logger.error('Error signing out:', { error: error })
    }
  }

  // Toggle module expansion
  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  // Check if path is active
  // For items with children, only exact match (to prevent parent highlighting when child is active)
  // For items without children, allow startsWith for nested routes
  const isActive = (href: string, hasChildren: boolean = false) => {
    const fullPath = `/${locale}${href}`
    if (hasChildren) {
      // For parent items, only highlight on exact match
      return pathname === fullPath
    }
    // For leaf items, allow exact match or starts with
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`)
  }

  // Helper to check if any child is active
  const hasActiveChild = (item: AdminMenuItem): boolean => {
    if (!item.children || item.children.length === 0) {
      return false
    }
    return item.children.some(child => {
      const childPath = `/${locale}${child.href}`
      const childIsActive = pathname === childPath || pathname.startsWith(`${childPath}/`)
      // Recursively check grandchildren
      return childIsActive || hasActiveChild(child)
    })
  }

  // Filter menu items based on search query
  const filterMenuItems = (items: AdminMenuItem[], query: string): AdminMenuItem[] => {
    if (!query.trim()) return items

    const lowerQuery = query.toLowerCase()
    
    const filtered: AdminMenuItem[] = []
    
    for (const item of items) {
      // Check if item label matches
      const labelMatch = item.label.toLowerCase().includes(lowerQuery) ||
        (item.label_ar && item.label_ar.toLowerCase().includes(lowerQuery))
      
      // Filter children recursively
      const filteredChildren = item.children ? filterMenuItems(item.children, query) : undefined
      
      // Check if any child matches
      const childrenMatch = filteredChildren && filteredChildren.length > 0
      
      // If parent matches, include all children (or filtered children if query matches)
      if (labelMatch) {
        filtered.push({
          ...item,
          children: filteredChildren && filteredChildren.length > 0 ? filteredChildren : item.children
        })
      } else if (childrenMatch) {
        // If any child matches, include parent with filtered children
        filtered.push({
          ...item,
          children: filteredChildren
        })
      }
    }
    
    return filtered
  }

  // Get filtered menu items
  const filteredMenuItems = useMemo(() => {
    return filterMenuItems(menuItems, searchQuery)
  }, [menuItems, searchQuery])

  // Show loading only on initial load, not on every re-render
  // But still show the footer even during loading
  if (loading && menuItems.length === 0) {
    return (
      <>
        {/* Overlay for mobile */}
        {isOpen && (
          <div 
            className="fixed inset-0 z-40 lg:hidden backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            onClick={onToggle}
          />
        )}

        {/* Sidebar - Always fixed, never scrolls with page */}
        <div className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform transition-all duration-300 flex flex-col h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${
          collapsed ? 'w-20' : 'w-64'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
            {!collapsed && (
              <Logo size="md" href={`/${locale}/dashboard`} />
            )}
            {collapsed && (
              <Logo size="sm" href={`/${locale}/dashboard`} showText={false} />
            )}
            
            <div className="flex items-center gap-2">
              {onCollapseToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCollapseToggle}
                  className="hidden lg:flex"
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {locale === 'ar' ? (
                    <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                  ) : (
                    <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                  )}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="lg:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Loading Content - Scrollable area */}
          <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>

          {/* Footer - Fixed at bottom, always visible */}
          <div className={`border-t-2 border-gray-200/60 bg-gradient-to-b from-white via-gray-50/30 to-white ${collapsed ? 'p-3' : 'p-5'} space-y-4 flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]`}>
            {!collapsed && (
              <div className="flex justify-center w-full">
                <div className="w-full bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-gray-200/60 shadow-sm">
                  <LayoutToggle />
                </div>
              </div>
            )}
            <div className="flex justify-center w-full">
              <div className="w-full bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-gray-200/60 shadow-sm">
                <LanguageSwitcher />
              </div>
            </div>
            <div className={`bg-gradient-to-br from-white to-gray-50/50 rounded-xl p-3 border border-gray-200/60 shadow-sm ${collapsed ? 'flex justify-center' : ''}`}>
              <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} w-full`}>
                {stableUser ? (
                  <>
                    <Link 
                      href={`/${locale}/dashboard`}
                      className="w-10 h-10 bg-gradient-to-br from-[#6B8E7E] to-[#6B8E7E]/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <UserIcon className="w-5 h-5 text-white" />
                    </Link>
                  {!collapsed && (
                    <Link 
                      href={`/${locale}/dashboard`}
                      className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {stableUser.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {stableUser.email || 'Loading...'}
                      </p>
                    </Link>
                  )}
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse ring-2 ring-white">
                      <UserIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-1.5"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={!stableUser}
              className={`w-full ${collapsed ? 'px-2 h-10' : 'h-11'} bg-white/80 backdrop-blur-sm border-red-200/60 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-50/50 hover:border-red-300 hover:text-[#E74C3C] transition-all duration-200 shadow-sm font-medium`}
              title={collapsed ? t('signOut') : undefined}
            >
              <LogOut className={`${collapsed ? '' : 'mr-2'} h-4 w-4`} />
              {!collapsed && <span>{t('signOut')}</span>}
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={onToggle}
        />
      )}

      {/* Sidebar - Always fixed, never scrolls with page */}
      <div className={`fixed inset-y-0 z-50 bg-gradient-to-b from-white via-gray-50/50 to-white shadow-xl transform transition-all duration-300 flex flex-col h-screen ${
        locale === 'ar' 
          ? `right-0 border-l border-gray-200/80 ${isOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0`
          : `left-0 border-r border-gray-200/80 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`
      } ${
        collapsed ? 'w-20' : 'w-64'
      }`}>
        
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between h-20 px-4 border-b border-gray-200/80 bg-white flex-shrink-0">
          {!collapsed && (
            <Logo size="md" href={`/${locale}/dashboard`} />
          )}
          {collapsed && (
            <Logo size="sm" href={`/${locale}/dashboard`} showText={false} />
          )}
          
          <div className="flex items-center gap-2">
            {/* Collapse Toggle - Desktop only */}
            {onCollapseToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCollapseToggle}
                className="hidden lg:flex hover:bg-[#6B8E7E]/10 hover:text-[#6B8E7E] transition-colors"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {locale === 'ar' ? (
                  <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                ) : (
                  <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
                )}
              </Button>
            )}
            
            {/* Close Button - Mobile only */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="lg:hidden hover:bg-red-50 hover:text-[#E74C3C] transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation - Scrollable area, takes remaining space */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <nav className={`${collapsed ? 'p-2' : 'p-4'} space-y-1`}>
            {/* Search Input - Only show when not collapsed */}
            {!collapsed && (
              <div className="mb-4">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#6B8E7E] transition-colors" />
                  <Input
                    type="text"
                    placeholder={t('searchMenu') || 'Search menu...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9 h-10 text-sm bg-gray-50/50 border-gray-200 focus:bg-white focus:border-[#6B8E7E] focus:ring-2 focus:ring-[#6B8E7E]/20 transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-0.5 transition-all"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* All Menu Items from Database */}
            {!loading && filteredMenuItems.length > 0 ? (
              filteredMenuItems.map((item) => (
                <MenuItemComponent
                  key={item.id}
                  item={item}
                  locale={locale}
                  pathname={pathname}
                  expandedModules={expandedModules}
                  toggleModule={toggleModule}
                  isActive={isActive}
                  hasActiveChild={hasActiveChild}
                  getIcon={getIconComponent}
                  notificationCount={notificationCount}
                  level={0}
                  collapsed={collapsed}
                />
              ))
            ) : (
              // Fallback while loading or if no menu items
              <>
            <Link
              href={`/${locale}`}
              className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('') 
                  ? 'bg-gradient-to-r from-[#6B8E7E] to-[#6B8E7E]/90 text-white shadow-md shadow-[#6B8E7E]/20' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-[#6B8E7E] hover:shadow-sm active:scale-[0.98]'
              }`}
              title={collapsed ? t('home') : undefined}
            >
              <Home className={`h-4 w-4 ${collapsed ? '' : locale === 'ar' ? 'ml-3' : 'mr-3'}`} />
              {!collapsed && <span>{t('home')}</span>}
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/dashboard') 
                  ? 'bg-gradient-to-r from-[#6B8E7E] to-[#6B8E7E]/90 text-white shadow-md shadow-[#6B8E7E]/20' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-[#6B8E7E] hover:shadow-sm active:scale-[0.98]'
              }`}
              title={collapsed ? t('dashboard') : undefined}
            >
              <BarChart3 className={`h-4 w-4 ${collapsed ? '' : locale === 'ar' ? 'ml-3' : 'mr-3'}`} />
              {!collapsed && <span>{t('dashboard')}</span>}
            </Link>
              </>
            )}
          </nav>
        </div>

        {/* Footer - Fixed at bottom, always visible */}
        <div className={`border-t border-gray-200/80 bg-white ${collapsed ? 'p-3' : 'p-4'} flex-shrink-0 z-10`}>
          {/* User Info Card with 3-dots menu */}
          <div className={`bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow ${collapsed ? 'flex justify-center' : ''}`}>
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} w-full`}>
              {stableUser ? (
                <>
                  <Link 
                    href={`/${locale}/dashboard`}
                    className="w-10 h-10 bg-gradient-to-br from-[#6B8E7E] to-[#6B8E7E]/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white cursor-pointer hover:opacity-90 hover:scale-105 transition-all"
                  >
                    <UserIcon className="w-5 h-5 text-white" />
                  </Link>
                  {!collapsed && (
                    <>
                      <Link 
                        href={`/${locale}/dashboard`}
                        className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {stableUser.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {stableUser.email || 'Loading...'}
                        </p>
                      </Link>
                      {/* 3-dots menu with Layout, Language, and Sign Out */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full transition-all hover:scale-110 active:scale-95"
                            aria-label="Settings menu"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="end" 
                          sideOffset={8}
                          className="w-64 shadow-xl border border-gray-200/80 bg-white rounded-xl p-2 z-[100]"
                        >
                          <DropdownMenuLabel className="text-xs font-semibold text-gray-900 px-3 py-2 mb-1">
                            Settings
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-gray-200/60 my-2" />
                          
                          {/* Layout Toggle in Menu */}
                          {layoutContext && (
                            <>
                              <DropdownMenuLabel className="text-xs font-medium text-gray-600 px-3 py-1.5 uppercase tracking-wide">
                                Layout
                              </DropdownMenuLabel>
                              <div className="px-3 pb-3">
                                <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg border border-gray-200/80 p-1.5 shadow-sm">
                                  {(['full', 'boxed'] as const).map((variant) => {
                                    const Icon = variant === 'full' ? Maximize2 : Columns
                                    const isActive = layoutContext.containerVariant === variant
                                    
                                    return (
                                      <Button
                                        key={variant}
                                        variant={isActive ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => layoutContext.setContainerVariant(variant)}
                                        className={`h-8 px-3 flex-1 transition-all duration-200 ${
                                          isActive
                                            ? 'bg-[#6B8E7E] text-white hover:bg-[#5a7a6b] shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                                        }`}
                                      >
                                        <Icon className="h-4 w-4" />
                                        <span className="ml-1.5 text-xs font-semibold">
                                          {variant === 'full' ? 'Full' : 'Boxed'}
                                        </span>
                                      </Button>
                                    )
                                  })}
                                </div>
                              </div>
                              <DropdownMenuSeparator className="bg-gray-200/60 my-2" />
                            </>
                          )}
                          
                          {/* Language Switcher in Menu */}
                          <DropdownMenuLabel className="text-xs font-medium text-gray-600 px-3 py-1.5 uppercase tracking-wide">
                            Language
                          </DropdownMenuLabel>
                          <div className="px-3 pb-3">
                            <div className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200/80 overflow-hidden shadow-sm">
                              {(['en', 'ar'] as const).map((loc) => {
                                const currentLoc = pathname.split('/')[1] || 'en'
                                const isActive = currentLoc === loc
                                
                                return (
                                  <button
                                    key={loc}
                                    onClick={() => {
                                      let pathWithoutLocale = pathname
                                      ;['en', 'ar'].forEach(l => {
                                        pathWithoutLocale = pathWithoutLocale.replace(new RegExp(`^/${l}(/|$)`), '/')
                                      })
                                      pathWithoutLocale = pathWithoutLocale.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
                                      const newPath = pathWithoutLocale === '/' ? `/${loc}/landing` : `/${loc}${pathWithoutLocale}`
                                      window.location.href = newPath
                                    }}
                                    className={`relative flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-all duration-200 flex-1 ${
                                      isActive
                                        ? 'bg-[#E74C3C] text-white shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                                    }`}
                                  >
                                    <span className="text-lg leading-none">
                                      {loc === 'en' ? '🇬🇧' : '🇪🇬'}
                                    </span>
                                    <span className="font-bold">
                                      {loc === 'en' ? 'EN' : 'AR'}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                          <DropdownMenuSeparator className="bg-gray-200/60 my-2" />
                          
                          {/* Sign Out */}
                          <DropdownMenuItem
                            onClick={handleSignOut}
                            disabled={!stableUser}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50/80 cursor-pointer font-semibold px-3 py-2.5 rounded-lg mx-1 my-1 transition-colors"
                          >
                            <LogOut className="mr-2.5 h-4 w-4" />
                            <span>{t('signOut')}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                  {collapsed && (
                    <div className="relative w-full flex justify-center mt-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full transition-all hover:scale-110 active:scale-95"
                            aria-label="Settings menu"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                          </Button>
                        </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        sideOffset={8}
                        className="w-64 shadow-xl border border-gray-200/80 bg-white rounded-xl p-2 z-[100]"
                      >
                        <DropdownMenuLabel className="text-xs font-semibold text-gray-900 px-3 py-2 mb-1">
                          Settings
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-200/60 my-2" />
                        {layoutContext && (
                          <>
                            <DropdownMenuLabel className="text-xs font-medium text-gray-600 px-3 py-1.5 uppercase tracking-wide">
                              Layout
                            </DropdownMenuLabel>
                            <div className="px-3 pb-3">
                              <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg border border-gray-200/80 p-1.5 shadow-sm">
                                {(['full', 'boxed'] as const).map((variant) => {
                                  const Icon = variant === 'full' ? Maximize2 : Columns
                                  const isActive = layoutContext.containerVariant === variant
                                  
                                  return (
                                    <Button
                                      key={variant}
                                      variant={isActive ? 'default' : 'ghost'}
                                      size="sm"
                                      onClick={() => layoutContext.setContainerVariant(variant)}
                                      className={`h-8 px-3 flex-1 transition-all duration-200 ${
                                        isActive
                                          ? 'bg-[#6B8E7E] text-white hover:bg-[#5a7a6b] shadow-sm'
                                          : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                                      }`}
                                    >
                                      <Icon className="h-4 w-4" />
                                      <span className="ml-1.5 text-xs font-semibold">
                                        {variant === 'full' ? 'Full' : 'Boxed'}
                                      </span>
                                    </Button>
                                  )
                                })}
                              </div>
                            </div>
                            <DropdownMenuSeparator className="bg-gray-200/60 my-2" />
                          </>
                        )}
                        <DropdownMenuLabel className="text-xs font-medium text-gray-600 px-3 py-1.5 uppercase tracking-wide">
                          Language
                        </DropdownMenuLabel>
                        <div className="px-3 pb-3">
                          <div className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200/80 overflow-hidden shadow-sm">
                            {(['en', 'ar'] as const).map((loc) => {
                              const currentLoc = pathname.split('/')[1] || 'en'
                              const isActive = currentLoc === loc
                              
                              return (
                                <button
                                  key={loc}
                                  onClick={() => {
                                    let pathWithoutLocale = pathname
                                    ;['en', 'ar'].forEach(l => {
                                      pathWithoutLocale = pathWithoutLocale.replace(new RegExp(`^/${l}(/|$)`), '/')
                                    })
                                    pathWithoutLocale = pathWithoutLocale.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
                                    const newPath = pathWithoutLocale === '/' ? `/${loc}/landing` : `/${loc}${pathWithoutLocale}`
                                    window.location.href = newPath
                                  }}
                                  className={`relative flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-all duration-200 flex-1 ${
                                    isActive
                                      ? 'bg-[#E74C3C] text-white shadow-sm'
                                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                                  }`}
                                >
                                  <span className="text-lg leading-none">
                                    {loc === 'en' ? '🇬🇧' : '🇪🇬'}
                                  </span>
                                  <span className="font-bold">
                                    {loc === 'en' ? 'EN' : 'AR'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <DropdownMenuSeparator className="bg-gray-200/60 my-2" />
                        <DropdownMenuItem
                          onClick={handleSignOut}
                          disabled={!stableUser}
                          className="text-red-600 focus:text-red-700 focus:bg-red-50/80 cursor-pointer font-semibold px-3 py-2.5 rounded-lg mx-1 my-1 transition-colors"
                        >
                          <LogOut className="mr-2.5 h-4 w-4" />
                          <span>{t('signOut')}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Placeholder while loading user */}
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse ring-2 ring-white">
                    <UserIcon className="w-5 h-5 text-gray-600" />
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-1.5"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Menu Item Component - Recursive rendering
function MenuItemComponent({
  item,
  locale,
  pathname,
  expandedModules,
  toggleModule,
  isActive,
  hasActiveChild,
  getIcon,
  notificationCount = 0,
  level = 0,
  collapsed = false
}: {
  item: AdminMenuItem
  locale: string
  pathname: string
  expandedModules: Set<string>
  toggleModule: (id: string) => void
  isActive: (href: string, hasChildren?: boolean) => boolean
  hasActiveChild: (item: AdminMenuItem) => boolean
  getIcon: (iconName: string) => React.ComponentType<any>
  notificationCount?: number
  level?: number
  collapsed?: boolean
}) {
  // Memoize icon component to avoid creating it during render
  const IconComponent = useMemo(() => getIcon(item.icon || 'Heart'), [item.icon, getIcon])
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedModules.has(item.id)
  const itemPath = `/${locale}${item.href}`
  // For parent items, check if any child is active
  const childIsActive = hasChildren ? hasActiveChild(item) : false
  // Only highlight parent if it's exactly active AND no child is active
  const itemIsActive = hasChildren 
    ? (isActive(item.href, true) && !childIsActive)
    : isActive(item.href, false)
  const isNotifications = item.href === '/notifications'
  // Use Arabic label if available and locale is Arabic
  const displayLabel = locale === 'ar' && item.label_ar ? item.label_ar : item.label

  if (hasChildren) {
    // When collapsed, don't show expandable items with children
    if (collapsed) {
      return null
    }
    
    return (
      <div className="space-y-1">
        <button
          onClick={() => toggleModule(item.id)}
          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            itemIsActive
              ? 'bg-gradient-to-r from-[#6B8E7E] to-[#6B8E7E]/90 text-white shadow-md shadow-[#6B8E7E]/20'
              : 'text-gray-700 hover:bg-gray-50 hover:text-[#6B8E7E] hover:shadow-sm active:scale-[0.98]'
          }`}
          title={displayLabel}
        >
          <div className="flex items-center min-w-0 flex-1">
            <IconComponent className={`h-4 w-4 flex-shrink-0 ${locale === 'ar' ? 'ml-3' : 'mr-3'}`} />
            <span className="truncate">{displayLabel}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className={`h-4 w-4 flex-shrink-0 ${locale === 'ar' ? 'mr-2' : 'ml-2'}`} />
          ) : (
            <ChevronRight className={`h-4 w-4 flex-shrink-0 ${locale === 'ar' ? 'mr-2' : 'ml-2'}`} />
          )}
        </button>

        {isExpanded && (
          <div className={`space-y-0.5 mt-1 ${locale === 'ar' ? 'mr-6' : 'ml-6'} border-l-2 border-gray-100 ${locale === 'ar' ? 'border-r-2 border-l-0' : ''}`}>
            {item.children!.map((child) => (
              <MenuItemComponent
                key={child.id}
                item={child}
                locale={locale}
                pathname={pathname}
                expandedModules={expandedModules}
                toggleModule={toggleModule}
                isActive={isActive}
                hasActiveChild={hasActiveChild}
                getIcon={getIcon}
                notificationCount={notificationCount}
                level={level + 1}
                collapsed={collapsed}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={itemPath}
      className={`relative flex items-center ${collapsed ? 'justify-center px-2' : isNotifications ? 'justify-between px-3' : 'px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        itemIsActive
          ? 'bg-gradient-to-r from-[#6B8E7E] to-[#6B8E7E]/90 text-white shadow-md shadow-[#6B8E7E]/20'
          : 'text-gray-700 hover:bg-gray-50 hover:text-[#6B8E7E] hover:shadow-sm active:scale-[0.98]'
      }`}
      title={displayLabel}
    >
      <div className={`flex items-center ${collapsed ? '' : 'flex-1 min-w-0'}`}>
        <IconComponent className={`h-4 w-4 flex-shrink-0 ${collapsed ? '' : locale === 'ar' ? 'ml-3' : 'mr-3'}`} />
        {!collapsed && <span className="truncate">{displayLabel}</span>}
      </div>
      {!collapsed && isNotifications && notificationCount > 0 && (
        <Badge variant="destructive" className={`bg-[#E74C3C] text-white shadow-sm flex-shrink-0 min-w-[1.75rem] px-1.5 ${locale === 'ar' ? 'mr-2' : 'ml-2'}`}>
          {formatNotificationCount(notificationCount)}
        </Badge>
      )}
      {collapsed && isNotifications && notificationCount > 0 && (
        <Badge variant="destructive" className={`absolute -top-1 min-w-[1.25rem] h-5 px-1 flex items-center justify-center text-xs rounded-full bg-[#E74C3C] text-white shadow-md ${locale === 'ar' ? '-left-1' : '-right-1'}`}>
          {formatNotificationCount(notificationCount)}
        </Badge>
      )}
    </Link>
  )
}
