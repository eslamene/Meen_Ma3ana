'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Settings
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import type { AdminMenuItem } from '@/lib/admin/types'

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

  const supabase = createClient()
  const { user, loading, menuItems } = useAdmin()
  
  // Store user in ref to prevent footer from disappearing during re-renders
  const userRef = useRef<User | null>(null)
  const hasLoadedUserRef = useRef<boolean>(false)
  
  useEffect(() => {
    if (user) {
      userRef.current = user
      hasLoadedUserRef.current = true
    }
  }, [user])
  
  // Use ref value for footer rendering to ensure stability
  // Always use ref if we've previously loaded a user, otherwise use current user
  const stableUser = user || (hasLoadedUserRef.current ? userRef.current : null)
  
  // Menu items are already in tree structure from useAdmin hook
  // They are filtered by permissions and sorted by sort_order

  const fetchUnreadNotifications = useCallback(async (userId: string) => {
    try {
      const notificationService = createContributionNotificationService(supabase)
      const count = await notificationService.getUnreadNotificationCount(userId)
      setNotificationCount(count)
    } catch (error) {
      console.error('Error fetching unread notifications:', error)
      setNotificationCount(0)
    }
  }, [supabase])

  useEffect(() => {
    if (user) {
      fetchUnreadNotifications(user.id)
    } else {
      setNotificationCount(0)
    }
  }, [user, fetchUnreadNotifications])

  // Icon mapping - memoized to prevent re-creation
  const getIcon = useMemo(() => {
    const icons: Record<string, React.ComponentType<any>> = {
      'BarChart3': BarChart3,
      'Heart': Heart,
      'Users': Users,
      'CreditCard': CreditCard,
      'Plus': Plus,
      'UserPlus': UserPlus,
      'Settings': Settings,
      'Bell': Bell,
      'Home': Home
    }
    return (iconName: string) => icons[iconName] || Heart
  }, [])

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push(`/${locale}/auth/signin`)
    } catch (error) {
      console.error('Error signing out:', error)
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
  const isActive = (href: string) => {
    return pathname === `/${locale}${href}` || pathname.startsWith(`/${locale}${href}/`)
  }

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
                  <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
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
                    <div className="w-10 h-10 bg-gradient-to-br from-[#6B8E7E] to-[#6B8E7E]/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white">
                      <UserIcon className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {stableUser.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {stableUser.email || 'Loading...'}
                        </p>
                      </div>
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
      <div className={`fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-white via-gray-50/50 to-white shadow-xl border-r border-gray-200/80 transform transition-all duration-300 flex flex-col h-screen ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}>
        
        {/* Header - Fixed at top */}
        <div className="flex items-center justify-between h-20 px-4 border-b border-gray-200/60 bg-gradient-to-r from-[#6B8E7E]/5 via-white to-[#E74C3C]/5 flex-shrink-0 backdrop-blur-sm">
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
                <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
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
          <nav className={`${collapsed ? 'p-2' : 'p-4'} space-y-1.5`}>
            {/* All Menu Items from Database */}
            {!loading && menuItems.length > 0 ? (
              menuItems.map((item) => (
                <MenuItemComponent
                  key={item.id}
                  item={item}
                  locale={locale}
                  pathname={pathname}
                  expandedModules={expandedModules}
                  toggleModule={toggleModule}
                  isActive={isActive}
                  getIcon={getIcon}
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
              className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive('') 
                  ? 'bg-gradient-to-r from-[#6B8E7E] to-[#6B8E7E]/90 text-white shadow-md shadow-[#6B8E7E]/20' 
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-[#6B8E7E]/10 hover:to-[#6B8E7E]/5 hover:text-[#6B8E7E] hover:shadow-sm'
              }`}
              title={collapsed ? t('home') : undefined}
            >
              <Home className={`${collapsed ? '' : 'mr-3'} h-4 w-4`} />
              {!collapsed && <span>{t('home')}</span>}
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive('/dashboard') 
                  ? 'bg-gradient-to-r from-[#6B8E7E] to-[#6B8E7E]/90 text-white shadow-md shadow-[#6B8E7E]/20' 
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-[#6B8E7E]/10 hover:to-[#6B8E7E]/5 hover:text-[#6B8E7E] hover:shadow-sm'
              }`}
              title={collapsed ? t('dashboard') : undefined}
            >
              <BarChart3 className={`${collapsed ? '' : 'mr-3'} h-4 w-4`} />
              {!collapsed && <span>{t('dashboard')}</span>}
            </Link>
              </>
            )}
          </nav>
        </div>

        {/* Footer - Fixed at bottom, always visible */}
        <div className={`border-t-2 border-gray-200/60 bg-gradient-to-b from-white via-gray-50/30 to-white ${collapsed ? 'p-3' : 'p-5'} space-y-4 flex-shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]`}>
          {/* Layout Toggle - Always visible when not collapsed */}
          {!collapsed && (
            <div className="flex justify-center w-full">
              <div className="w-full bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-gray-200/60 shadow-sm">
                <LayoutToggle />
              </div>
            </div>
          )}
          
          {/* Language Switcher - Always visible */}
          <div className="flex justify-center w-full">
            <div className="w-full bg-white/80 backdrop-blur-sm rounded-xl p-2 border border-gray-200/60 shadow-sm">
              <LanguageSwitcher />
            </div>
          </div>

          {/* User Info Card - Enhanced styling */}
          <div className={`bg-gradient-to-br from-white to-gray-50/50 rounded-xl p-3 border border-gray-200/60 shadow-sm ${collapsed ? 'flex justify-center' : ''}`}>
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} w-full`}>
              {stableUser ? (
                <>
                  <div className="w-10 h-10 bg-gradient-to-br from-[#6B8E7E] to-[#6B8E7E]/80 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {stableUser.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {stableUser.email || 'Loading...'}
                      </p>
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

          {/* Sign Out - Enhanced button styling */}
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

// Menu Item Component - Recursive rendering
function MenuItemComponent({
  item,
  locale,
  pathname,
  expandedModules,
  toggleModule,
  isActive,
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
  isActive: (href: string) => boolean
  getIcon: (iconName: string) => React.ComponentType<any>
  notificationCount?: number
  level?: number
  collapsed?: boolean
}) {
  const IconComponent = getIcon(item.icon || 'FileText')
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedModules.has(item.id)
  const itemPath = `/${locale}${item.href}`
  const itemIsActive = isActive(item.href)
  const isNotifications = item.href === '/notifications'

  if (hasChildren) {
    // When collapsed, don't show expandable items with children
    if (collapsed) {
      return null
    }
    
    return (
      <div className="space-y-1">
        <button
          onClick={() => toggleModule(item.id)}
          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            itemIsActive
              ? 'bg-gradient-to-r from-[#6B8E7E] to-[#6B8E7E]/90 text-white shadow-md shadow-[#6B8E7E]/20'
              : 'text-gray-700 hover:bg-gradient-to-r hover:from-[#6B8E7E]/10 hover:to-[#6B8E7E]/5 hover:text-[#6B8E7E] hover:shadow-sm'
          }`}
          title={item.label}
        >
          <div className="flex items-center min-w-0 flex-1">
            <IconComponent className="mr-3 h-4 w-4 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0 ml-2" />
          )}
        </button>

        {isExpanded && (
          <div className="ml-6 space-y-1">
            {item.children!.map((child) => (
              <MenuItemComponent
                key={child.id}
                item={child}
                locale={locale}
                pathname={pathname}
                expandedModules={expandedModules}
                toggleModule={toggleModule}
                isActive={isActive}
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
      className={`relative flex items-center ${collapsed ? 'justify-center px-2' : isNotifications ? 'justify-between px-3' : 'px-3'} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        itemIsActive
          ? 'bg-gradient-to-r from-[#6B8E7E] to-[#6B8E7E]/90 text-white shadow-md shadow-[#6B8E7E]/20'
          : 'text-gray-700 hover:bg-gradient-to-r hover:from-[#6B8E7E]/10 hover:to-[#6B8E7E]/5 hover:text-[#6B8E7E] hover:shadow-sm'
      }`}
      title={item.label}
    >
      <div className={`flex items-center ${collapsed ? '' : 'flex-1 min-w-0'}`}>
        <IconComponent className={`${collapsed ? '' : 'mr-3'} h-4 w-4 flex-shrink-0`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </div>
      {!collapsed && isNotifications && notificationCount > 0 && (
        <Badge variant="destructive" className="ml-2 bg-[#E74C3C] text-white shadow-sm flex-shrink-0">
          {notificationCount}
        </Badge>
      )}
      {collapsed && isNotifications && notificationCount > 0 && (
        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full bg-[#E74C3C] text-white shadow-md">
          {notificationCount > 9 ? '9+' : notificationCount}
        </Badge>
      )}
    </Link>
  )
}
