'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { contributionNotificationService } from '@/lib/notifications/contribution-notifications'
import { User } from '@supabase/supabase-js'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function NavigationBar() {
  const t = useTranslations('navigation')
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = params.locale as string
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchUserAndNotifications()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchUnreadNotifications(session.user.id)
      } else {
        setUser(null)
        setUnreadNotifications(0)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

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
      console.error('Error fetching unread notifications:', error)
      // Don't set error state, just keep count at 0
      setUnreadNotifications(0)
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const getNavLinkClass = (path: string) => {
    return pathname.includes(path) 
      ? 'text-blue-700 font-semibold bg-blue-50 border-b-2 border-blue-600' 
      : 'text-gray-800 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200'
  }

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
            
            <Link 
              href={`/${locale}/cases`}
              className={`${getNavLinkClass('/cases')} px-4 py-2 text-sm font-medium rounded-lg mx-1`}
            >
              {t('cases')}
            </Link>
            
            <Link 
              href={`/${locale}/projects`}
              className={`${getNavLinkClass('/projects')} px-4 py-2 text-sm font-medium rounded-lg mx-1`}
            >
              {t('projects')}
            </Link>

            {user && (
              <>
                <Link 
                  href={`/${locale}/dashboard`}
                  className={`${getNavLinkClass('/dashboard')} px-3 py-2 text-sm font-medium`}
                >
                  {t('dashboard')}
                </Link>

                {/* Sponsorship Navigation for sponsors and admins */}
                {(user.user_metadata?.role === 'sponsor' || user.user_metadata?.role === 'admin') && (
                  <div className="relative group">
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-gray-800 hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg mx-1 transition-all duration-200">
                      <span className="text-sm font-medium">Sponsorships</span>
                      <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>

                    {/* Sponsorship Dropdown Menu */}
                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-100">
                      <Link 
                        href={`/${locale}/sponsor/dashboard`}
                        className="block px-4 py-3 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors mx-2 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>My Sponsorships</span>
                        </div>
                      </Link>
                      <Link 
                        href={`/${locale}/sponsor/request`}
                        className="block px-4 py-3 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors mx-2 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>New Request</span>
                        </div>
                      </Link>
                      <Link 
                        href={`/${locale}/sponsor/communications`}
                        className="block px-4 py-3 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors mx-2 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>Communications</span>
                        </div>
                      </Link>
                    </div>
                  </div>
                )}

                {user.user_metadata?.role === 'admin' && (
                  <div className="relative group">
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-gray-800 hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg mx-1 transition-all duration-200">
                      <span className="text-sm font-medium">{t('admin')}</span>
                      <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>

                    {/* Admin Dropdown Menu */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-100">
                      <Link 
                        href={`/${locale}/admin`}
                        className="block px-4 py-3 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors mx-2 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>Dashboard</span>
                        </div>
                      </Link>
                      <Link 
                        href={`/${locale}/admin/analytics`}
                        className="block px-4 py-3 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors mx-2 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>Analytics</span>
                        </div>
                      </Link>
                      <Link 
                        href={`/${locale}/admin/contributions`}
                        className="block px-4 py-3 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors mx-2 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          <span>Contributions</span>
                        </div>
                      </Link>
                      <Link 
                        href={`/${locale}/admin/sponsorships`}
                        className="block px-4 py-3 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors mx-2 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Sponsorships</span>
                        </div>
                      </Link>
                    </div>
                  </div>
                )}
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
              
              <Link 
                href={`/${locale}/cases`}
                className={`${getNavLinkClass('/cases')} block px-3 py-2 text-base font-medium`}
                onClick={closeMobileMenu}
              >
                {t('cases')}
              </Link>

              {user && (
                <>
                  <Link 
                    href={`/${locale}/dashboard`}
                    className={`${getNavLinkClass('/dashboard')} block px-3 py-2 text-base font-medium`}
                    onClick={closeMobileMenu}
                  >
                    {t('dashboard')}
                  </Link>

                  {/* Sponsorship Navigation for sponsors and admins */}
                  {(user.user_metadata?.role === 'sponsor' || user.user_metadata?.role === 'admin') && (
                    <>
                      <Link 
                        href={`/${locale}/sponsor/dashboard`}
                        className={`${getNavLinkClass('/sponsor/dashboard')} block px-3 py-2 text-base font-medium`}
                        onClick={closeMobileMenu}
                      >
                        My Sponsorships
                      </Link>
                      <Link 
                        href={`/${locale}/sponsor/request`}
                        className={`${getNavLinkClass('/sponsor/request')} block px-3 py-2 text-base font-medium`}
                        onClick={closeMobileMenu}
                      >
                        New Sponsorship Request
                      </Link>
                      <Link 
                        href={`/${locale}/sponsor/communications`}
                        className={`${getNavLinkClass('/sponsor/communications')} block px-3 py-2 text-base font-medium`}
                        onClick={closeMobileMenu}
                      >
                        Communications
                      </Link>
                    </>
                  )}

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

                  {user.user_metadata?.role === 'admin' && (
                    <>
                      <Link 
                        href={`/${locale}/admin`}
                        className={`${getNavLinkClass('/admin')} block px-3 py-2 text-base font-medium`}
                        onClick={closeMobileMenu}
                      >
                        Admin - Dashboard
                      </Link>
                      <Link 
                        href={`/${locale}/admin/analytics`}
                        className={`${getNavLinkClass('/admin/analytics')} block px-3 py-2 text-base font-medium`}
                        onClick={closeMobileMenu}
                      >
                        Admin - Analytics
                      </Link>
                      <Link 
                        href={`/${locale}/admin/contributions`}
                        className={`${getNavLinkClass('/admin/contributions')} block px-3 py-2 text-base font-medium`}
                        onClick={closeMobileMenu}
                      >
                        Admin - Contributions
                      </Link>
                      <Link 
                        href={`/${locale}/admin/sponsorships`}
                        className={`${getNavLinkClass('/admin/sponsorships')} block px-3 py-2 text-base font-medium`}
                        onClick={closeMobileMenu}
                      >
                        Admin - Sponsorships
                      </Link>
                    </>
                  )}

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