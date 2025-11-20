'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Logo from '@/components/ui/Logo'
import LayoutToggle from '@/components/layout/LayoutToggle'
import { createClient } from '@/lib/supabase/client'
import { createContributionNotificationService } from '@/lib/notifications/contribution-notifications'
import { User } from '@supabase/supabase-js'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useAdmin } from '@/lib/admin/hooks'
import { 
  X, 
  Home, 
  User as UserIcon, 
  LogOut, 
  ChevronDown,
  ChevronRight,
  Heart,
  BarChart3
} from 'lucide-react'
import { getIconWithFallback } from '@/lib/icons/registry'
import type { AdminMenuItem } from '@/lib/admin/types'

// Note: useAdmin handles permissions internally

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
  const stableUser = user || (hasLoadedUserRef.current ? userRef.current : null)

  const supabase = createClient()
  
  // Use the new admin hook
  const { 
    menuItems, 
    loading: modulesLoading
  } = useAdmin()
  
  // Menu items are already in tree structure from useAdmin hook
  // They are filtered by permissions and sorted by sort_order

  const fetchUnreadNotifications = useCallback(async (userId: string) => {
    try {
      const notificationService = createContributionNotificationService(supabase)
      const count = await notificationService.getUnreadNotificationCount(userId)
      setUnreadNotifications(count)
    } catch (error) {
      console.error('Error fetching notifications:', error)
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
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase.auth, fetchUnreadNotifications])

  useEffect(() => {
    fetchUserAndNotifications()
    
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
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchUserAndNotifications, fetchUnreadNotifications, supabase.auth])

  // Auto-expand menu items based on current path
  useEffect(() => {
    try {
      if (!modulesLoading && menuItems.length > 0 && pathname && locale) {
        const findActiveItem = (items: typeof menuItems): string | null => {
          for (const item of items) {
            const itemPath = `/${locale}${item.href}`
            if (pathname === itemPath || (item.href !== '/' && pathname.startsWith(itemPath))) {
              return item.id
            }
            if (item.children && item.children.length > 0) {
              const childId = findActiveItem(item.children)
              if (childId) {
                // Expand parent if child is active
                if (!expandedModules.has(item.id)) {
                  setExpandedModules(prev => new Set([...prev, item.id]))
        }
                return childId
              }
            }
          }
          return null
        }
        
        findActiveItem(menuItems)
      }
    } catch (error) {
      console.error('Error in SidebarNavigation useEffect:', error)
    }
  }, [pathname, locale, menuItems, modulesLoading, expandedModules])

  // Note: useAdmin handles admin system update events automatically

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push(`/${locale}/landing`)
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

  // Recheck scroll position when menu items count or expanded modules change
  useEffect(() => {
    const timer = setTimeout(checkScrollPosition, 100)
    return () => clearTimeout(timer)
  }, [menuItems.length, expandedModules, checkScrollPosition])

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
          className="fixed inset-0 z-40 lg:hidden backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        
        {/* Header - Fixed */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
          <Logo size="md" href={`/${locale}/dashboard`} />
          
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
            {/* All Menu Items from Database */}
            {!modulesLoading && menuItems.length > 0 ? (
              menuItems.map((item) => (
                <MenuItemComponent
                  key={item.id}
                  item={item}
                  locale={locale}
                  pathname={pathname}
                  expandedModules={expandedModules}
                  toggleModule={toggleModule}
                  getNavLinkClass={getNavLinkClass}
                  unreadNotifications={unreadNotifications}
                />
              ))
            ) : (
              // Fallback while loading or if no menu items
              <>
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
              </>
            )}
            </nav>
          </div>
          
          {/* Scroll Down Indicator */}
          {canScrollDown && (
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white via-white/80 to-transparent z-10 pointer-events-none transition-opacity duration-300" />
          )}
        </div>

        {/* Footer - Always visible */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          {/* Layout Toggle - Always visible */}
          <div className="mb-4 flex justify-center">
            <LayoutToggle />
          </div>
          
          {/* Language Switcher - Always visible */}
          <div className="mb-4">
            <LanguageSwitcher />
          </div>

          {/* User Info - Show if we have a user, otherwise show placeholder */}
          {stableUser ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-md">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {stableUser.user_metadata?.full_name || stableUser.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {stableUser.email}
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
          ) : (
            // Placeholder while loading user
            <div className="space-y-2">
              <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-md">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center animate-pulse">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                </div>
              </div>

              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                disabled
                className="w-full justify-start text-gray-400"
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

// Menu Item Component - Recursive rendering
function MenuItemComponent({
  item,
  locale,
  pathname,
  expandedModules,
  toggleModule,
  getNavLinkClass,
  unreadNotifications = 0,
  level = 0
}: {
  item: AdminMenuItem
  locale: string
  pathname: string
  expandedModules: Set<string>
  toggleModule: (id: string) => void
  getNavLinkClass: (path: string) => string
  unreadNotifications?: number
  level?: number
}) {
  const IconComponent = getIconWithFallback(item.icon || 'FileText')
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedModules.has(item.id)
  const itemPath = `/${locale}${item.href}`
  const isActive = pathname === itemPath || (item.href !== '/' && pathname.startsWith(itemPath))
  // Check if this is the notifications item to show badge
  const isNotifications = item.href === '/notifications'

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => toggleModule(item.id)}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive
              ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-r-4 border-blue-600 shadow-sm'
              : 'text-gray-700 hover:bg-gray-50'
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
                getNavLinkClass={getNavLinkClass}
                unreadNotifications={unreadNotifications}
                level={level + 1}
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
      className={`${getNavLinkClass(item.href)} flex items-center ${isNotifications ? 'justify-between' : ''} px-3 py-2 text-sm rounded-md transition-all duration-200 transform hover:translate-x-1`}
      title={item.label || item.description}
    >
      <div className="flex items-center min-w-0 flex-1">
        <div className={`w-2 h-2 rounded-full mr-3 transition-colors duration-200 flex-shrink-0 ${
          isActive ? 'bg-blue-600' : 'bg-gray-300'
        }`} />
        {item.icon && <IconComponent className="mr-2 h-4 w-4 flex-shrink-0" />}
        <span className="truncate">{item.label}</span>
      </div>
      {isNotifications && unreadNotifications > 0 && (
        <Badge variant="destructive" className="ml-2 flex-shrink-0">
          {unreadNotifications}
        </Badge>
      )}
    </Link>
  )
}
