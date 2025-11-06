'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { createContributionNotificationService } from '@/lib/notifications/contribution-notifications'
import { User } from '@supabase/supabase-js'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useSimpleRBAC } from '@/lib/hooks/useSimpleRBAC'
import GuestPermissionGuard from '@/components/auth/GuestPermissionGuard'

export default function NavigationBar() {
  const t = useTranslations('navigation')
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = params.locale as string
  
  const [user, setUser] = useState<User | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const supabase = createClient()
  
  // Use the new simplified RBAC hook
  const { modules, loading: modulesLoading } = useSimpleRBAC()
  
  // Note: useSimpleRBAC handles refresh internally

  const fetchUnreadNotifications = useCallback(async (userId: string) => {
    try {
      const notificationService = createContributionNotificationService(supabase)
      const count = await notificationService.getUnreadNotificationCount(userId)
      setUnreadNotifications(count)
    } catch (error) {
      console.error('Error fetching unread notifications:', error)
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
      console.error('Error fetching user:', error)
    }
  }, [supabase.auth, fetchUnreadNotifications])

  useEffect(() => {
    fetchUserAndNotifications()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchUnreadNotifications(session.user.id)
        // Permissions are handled automatically by useSimpleRBAC
      } else {
        setUser(null)
        setUnreadNotifications(0)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, fetchUserAndNotifications, fetchUnreadNotifications])

  // Note: useSimpleRBAC handles permission refresh automatically

  // Note: useSimpleRBAC handles cross-tab synchronization automatically

  // Note: useSimpleRBAC handles RBAC update events automatically


  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push(`/${locale}`)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  // Memoize navigation link class calculation to prevent unnecessary re-renders
  const getNavLinkClass = useCallback((path: string) => {
    return pathname.includes(path) 
      ? 'text-blue-700 font-semibold bg-blue-50 border-b-2 border-blue-600' 
      : 'text-gray-800 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200'
  }, [pathname])

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href={`/${locale}`} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-2xl font-bold text-gray-900 tracking-tight">Meen Ma3ana</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <Link 
              href={`/${locale}`}
              className={`${getNavLinkClass('/')} px-4 py-2 text-sm font-medium rounded-lg mx-1`}
            >
              {t('home')}
            </Link>
            
            <GuestPermissionGuard visitorPermissions={["cases:view_public"]} showLoading={false} showAuthPrompt={false}>
              <Link 
                href={`/${locale}/cases`}
                className={`${getNavLinkClass('/cases')} px-4 py-2 text-sm font-medium rounded-lg mx-1`}
              >
                {t('cases')}
              </Link>
            </GuestPermissionGuard>
            
            <Link 
              href={`/${locale}/projects`}
              className={`${getNavLinkClass('/projects')} px-4 py-2 text-sm font-medium rounded-lg mx-1`}
            >
              {t('projects')}
            </Link>

            {/* Modular Navigation */}
            {!modulesLoading && modules.map((module) => (
              <div key={module.id} className="relative group">
                <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                  {module.display_name}
                </Button>
                {module.items && module.items.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      {module.items.map((item, index) => (
                        <Link
                          key={index}
                          href={`/${locale}${item.href}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {user && (
              <>
                <Link 
                  href={`/${locale}/dashboard`}
                  className={`${getNavLinkClass('/dashboard')} px-3 py-2 text-sm font-medium`}
                >
                  {t('dashboard')}
                </Link>


              </>
            )}
          </div>

          {/* Right side - Language Switcher, Auth and Notifications */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Switcher */}
            <LanguageSwitcher />
            {user ? (
              <>
                {/* Notifications */}
                <Link href={`/${locale}/notifications`} className="relative">
                  <Button variant="ghost" size="sm" className="relative p-2 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    {unreadNotifications > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center text-xs bg-red-500 text-white border-2 border-white shadow-lg">
                        {unreadNotifications}
                      </Badge>
                    )}
                  </Button>
                </Link>

                {/* User Menu */}
                <div className="relative group">
                  <Button variant="ghost" size="sm" className="flex items-center space-x-3 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg px-3 py-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md">
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
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-100">
                    <Link 
                      href={`/${locale}/profile`}
                      className="block px-4 py-3 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors mx-2 rounded-lg"
                      onClick={closeMobileMenu}
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{t('profile')}</span>
                      </div>
                    </Link>
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
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href={`/${locale}/auth/login`}>
                  <Button variant="ghost" size="sm">
                    {t('login')}
                  </Button>
                </Link>
                <Link href={`/${locale}/auth/register`}>
                  <Button size="sm">
                    {t('register')}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="p-2"
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
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
              <Link 
                href={`/${locale}`}
                className={`${getNavLinkClass('/')} block px-3 py-2 text-base font-medium`}
                onClick={closeMobileMenu}
              >
                {t('home')}
              </Link>
              
              <GuestPermissionGuard visitorPermissions={["cases:view_public"]} showLoading={false} showAuthPrompt={false}>
                <Link 
                  href={`/${locale}/cases`}
                  className={`${getNavLinkClass('/cases')} block px-3 py-2 text-base font-medium`}
                  onClick={closeMobileMenu}
                >
                  {t('cases')}
                </Link>
              </GuestPermissionGuard>

              {user && (
                <>
                  <Link 
                    href={`/${locale}/dashboard`}
                    className={`${getNavLinkClass('/dashboard')} block px-3 py-2 text-base font-medium`}
                    onClick={closeMobileMenu}
                  >
                    {t('dashboard')}
                  </Link>

                  {/* Modular Navigation - Mobile */}
                  {!modulesLoading && modules.map((module) => (
                    <div key={module.id} className="space-y-1">
                      <div className="px-3 py-2 text-sm font-medium text-gray-900">
                        {module.display_name}
                      </div>
                      {module.items && module.items.length > 0 && (
                        <div className="pl-4 space-y-1">
                          {module.items.map((item, index) => (
                            <Link
                              key={index}
                              href={`/${locale}${item.href}`}
                              onClick={closeMobileMenu}
                              className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <Link 
                    href={`/${locale}/notifications`}
                    className={`${getNavLinkClass('/notifications')} block px-3 py-2 text-base font-medium`}
                    onClick={closeMobileMenu}
                  >
                    <div className="flex items-center justify-between">
                      <span>{t('notifications')}</span>
                      {unreadNotifications > 0 && (
                        <Badge className="ml-2">
                          {unreadNotifications}
                        </Badge>
                      )}
                    </div>
                  </Link>


                  <div className="border-t pt-4 mt-4">
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {user.email}
                    </div>
                    <Link 
                      href={`/${locale}/profile`}
                      className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
                      onClick={closeMobileMenu}
                    >
                      {t('profile')}
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut()
                        closeMobileMenu()
                      }}
                      className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
                    >
                      {t('logout')}
                    </button>
                  </div>
                </>
              )}

              {!user && (
                <div className="border-t pt-4 mt-4 space-y-2">
                  <Link 
                    href={`/${locale}/auth/login`}
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600"
                    onClick={closeMobileMenu}
                  >
                    {t('login')}
                  </Link>
                  <Link 
                    href={`/${locale}/auth/register`}
                    className="block px-3 py-2 text-base font-medium text-blue-600 hover:text-blue-700"
                    onClick={closeMobileMenu}
                  >
                    {t('register')}
                  </Link>
                </div>
              )}

              {/* Language Switcher for Mobile */}
              <div className="border-t pt-4 mt-4">
                <div className="px-3 py-2">
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
} 