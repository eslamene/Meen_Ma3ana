'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { contributionNotificationService } from '@/lib/notifications/contribution-notifications'
import { User } from '@supabase/supabase-js'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useModularRBAC } from '@/lib/hooks/useModularRBAC'
import { 
  Menu, 
  X, 
  Home, 
  User as UserIcon, 
  Bell, 
  LogOut, 
  ChevronDown,
  ChevronRight,
  Heart,
  BarChart3
} from 'lucide-react'
import { getIconWithFallback } from '@/lib/icons/registry'
import { 
  getModuleNavigationItems,
  filterNavigationItemsByPermissions
} from '@/lib/navigation/config'

// Helper function to get user permissions as array
const getUserPermissions = (userRoles: { permissions?: { name: string }[] } | null): string[] => {
  if (!userRoles?.permissions) return []
  return userRoles.permissions.map((p) => p.name)
}

interface SidebarNavigationProps {
  isOpen: boolean
  onToggle: () => void
}

export default function SidebarNavigation({ isOpen, onToggle }: SidebarNavigationProps) {
  const t = useTranslations('navigation')
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = params.locale as string
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [canScrollDown, setCanScrollDown] = useState(false)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()
  
  // Use ONLY useModularRBAC - it already includes useDatabaseRBAC internally
  // Using both hooks creates duplicate instances with separate loading states!
  const { 
    modules, 
    loading: modulesLoading, 
    refreshModules,
    userRoles,
    userPermissions 
  } = useModularRBAC()
  
  // Memoize the refresh function to prevent unnecessary re-renders
  const handleRefreshRoles = useCallback(async () => {
    await refreshModules()
  }, [refreshModules])

  useEffect(() => {
    fetchUserAndNotifications()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchUnreadNotifications(session.user.id)
        handleRefreshRoles()
      } else {
        setUser(null)
        setUnreadNotifications(0)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [handleRefreshRoles])

  // Auto-expand module based on current path
  useEffect(() => {
    try {
      if (!modulesLoading && modules.length > 0 && pathname && locale) {
        const currentModule = modules.find(module => {
          if (!module?.name) return false
          const navigationItems = getModuleNavigationItems(module.name)
          if (!navigationItems || navigationItems.length === 0) return false
          
          return navigationItems.some(item => {
            if (!item?.href) return false
            return pathname === `/${locale}${item.href}` || 
                   (item.href !== '/' && pathname.startsWith(`/${locale}${item.href}`))
          })
        })
        
        if (currentModule && !expandedModules.has(currentModule.id)) {
          setExpandedModules(prev => new Set([...prev, currentModule.id]))
        }
      }
    } catch (error) {
      console.error('Error in SidebarNavigation useEffect:', error)
    }
  }, [pathname, locale, modules, modulesLoading, expandedModules])

  // Listen for RBAC updates
  useEffect(() => {
    const handleRBACUpdate = () => {
      if (user) {
        handleRefreshRoles()
      }
    }

    window.addEventListener('rbac-updated', handleRBACUpdate)
    return () => window.removeEventListener('rbac-updated', handleRBACUpdate)
  }, [user, handleRefreshRoles])

  const fetchUserAndNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await fetchUnreadNotifications(user.id)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadNotifications = async (userId: string) => {
    try {
      const count = await contributionNotificationService.getUnreadNotificationCount(userId)
      setUnreadNotifications(count)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push(`/${locale}`)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Memoize navigation link class calculation to prevent unnecessary re-renders
  const getNavLinkClass = useCallback((path: string) => {
    const isActive = pathname === `/${locale}${path}` || 
                    (path !== '/' && pathname.startsWith(`/${locale}${path}`))
    return isActive 
      ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-4 border-blue-600 shadow-sm' 
      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
  }, [pathname, locale])

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
    }
    setExpandedModules(newExpanded)
  }

  // Check scroll position to show/hide scroll indicators
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    setCanScrollUp(scrollTop > 0)
    setCanScrollDown(scrollTop < scrollHeight - clientHeight - 1)
  }, [])

  // Add scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => checkScrollPosition()
    container.addEventListener('scroll', handleScroll)
    
    // Check initial scroll position
    checkScrollPosition()

    return () => container.removeEventListener('scroll', handleScroll)
  }, [checkScrollPosition])

  // Recheck scroll position when modules change
  useEffect(() => {
    const timer = setTimeout(checkScrollPosition, 100)
    return () => clearTimeout(timer)
  }, [modules, expandedModules, checkScrollPosition])

  if (loading) {
    return (
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        
        {/* Header - Fixed */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
          <Link href={`/${locale}`} className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Meen Ma3ana</span>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation - Scrollable */}
        <div className="flex-1 relative min-h-0">
          {/* Scroll Up Indicator */}
          {canScrollUp && (
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white via-white/80 to-transparent z-10 pointer-events-none transition-opacity duration-300" />
          )}
          
          <div 
            ref={scrollContainerRef}
            className="h-full overflow-y-auto py-4 scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db #f3f4f6',
              WebkitOverflowScrolling: 'touch' // Smooth scrolling on iOS
            }}
          >
            <nav className="px-2 space-y-1">
            
            {/* Main Navigation Items */}
            <Link
              href={`/${locale}`}
              className={`${getNavLinkClass('/')} flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
            >
              <Home className="mr-3 h-4 w-4" />
              {t('home')}
            </Link>

            <Link
              href={`/${locale}/dashboard`}
              className={`${getNavLinkClass('/dashboard')} flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors`}
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              {t('dashboard')}
            </Link>

            {/* Modular Navigation */}
            {!modulesLoading && modules.map((module) => {
              const IconComponent = getIconWithFallback(module.icon)
              if (!module.name) return null // Ensure module name is present for navigation item retrieval

              const navigationItems = getModuleNavigationItems(module.name) || [] // Ensure navigation items is an array
              // userPermissions is now memoized above
              const filteredItems = filterNavigationItemsByPermissions(navigationItems, userPermissions?.map(p => p.name) || [])
              const isExpanded = expandedModules.has(module.id)

              if (filteredItems.length === 0) return null

              return (
                <div key={module.id} className="space-y-1">
                  {/* Module Header */}
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <div className="flex items-center">
                      <IconComponent className="mr-3 h-4 w-4" />
                      <span>{module.display_name}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {/* Module Items */}
                  <div className={`ml-6 space-y-1 overflow-hidden transition-all duration-300 ${
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    {filteredItems.map((item, index) => (
                      <Link
                        key={index}
                        href={`/${locale}${item.href}`}
                        className={`${getNavLinkClass(item.href)} block px-3 py-2 text-sm rounded-md transition-all duration-200 transform hover:translate-x-1`}
                        title={item.description}
                      >
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 transition-colors duration-200 ${
                            pathname === `/${locale}${item.href}` || 
                            (item.href !== '/' && pathname.startsWith(`/${locale}${item.href}`))
                              ? 'bg-blue-600' 
                              : 'bg-gray-300'
                          }`} />
                          {item.label}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Notifications */}
            <Link
              href={`/${locale}/notifications`}
              className={`${getNavLinkClass('/notifications')} flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors`}
            >
              <div className="flex items-center">
                <Bell className="mr-3 h-4 w-4" />
                {t('notifications')}
              </div>
              {unreadNotifications > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadNotifications}
                </Badge>
              )}
            </Link>

            </nav>
          </div>
          
          {/* Scroll Down Indicator */}
          {canScrollDown && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white via-white/80 to-transparent z-10 pointer-events-none transition-opacity duration-300" />
          )}
        </div>

        {/* Footer - Fixed */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          {/* Language Switcher */}
          <div className="mb-4">
            <LanguageSwitcher />
          </div>

          {/* User Info */}
          {user && (
            <div className="space-y-2">
              <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-md">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-gray-700 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t('signOut')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
