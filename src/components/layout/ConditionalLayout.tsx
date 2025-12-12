'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import NavigationBar from '@/components/navigation/NavigationBar'
import SimpleSidebar from '@/components/navigation/SimpleSidebar'
import { Button } from '@/components/ui/button'
import { Menu, X, Home, ChevronRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('navigation')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false) // Start closed on mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)

  const [supabase] = useState(() => createClient())
  
  // Check if we're on the reset password page
  const isResetPasswordPage = pathname?.includes('/auth/reset-password') || false
  
  // Check for recovery mode
  useEffect(() => {
    const checkRecoveryMode = () => {
      if (typeof window !== 'undefined') {
        const recoveryMode = document.cookie
          .split('; ')
          .find(row => row.startsWith('recovery_mode='))
          ?.split('=')[1] === 'true'
        setIsRecoveryMode(recoveryMode || false)
      }
    }
    
    checkRecoveryMode()
    
    // Check periodically in case cookie changes
    const interval = setInterval(checkRecoveryMode, 1000)
    return () => clearInterval(interval)
  }, [])
  
  // Load sidebar state from localStorage and set initial mobile state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-collapsed')
      if (stored === 'true') {
        setSidebarCollapsed(true)
      }
      
      // Check if desktop
      const checkDesktop = () => {
        const desktop = window.innerWidth >= 1024
        setIsDesktop(desktop)
        if (desktop) {
          setSidebarOpen(true)
        }
      }
      
      checkDesktop()
      
      // Handle window resize
      const handleResize = () => {
        checkDesktop()
      }
      
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])
  
  // Save sidebar collapsed state
  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', String(newState))
    }
  }

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show top navigation for guests, users in recovery mode, or on reset password page without recovery mode
  // If on reset password page, require recovery mode cookie to show authenticated UI
  const shouldShowPublicNav = !user || isRecoveryMode || (isResetPasswordPage && !isRecoveryMode)
  
  if (shouldShowPublicNav) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationBar />
        <main>
          {children}
        </main>
      </div>
    )
  }

  // Show sidebar navigation for authenticated users (not in recovery mode)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Top Header Bar - Mobile Only */}
      <header className={`lg:hidden fixed top-0 z-40 bg-white border-b border-gray-200 shadow-sm ${
        locale === 'ar' ? 'right-0 left-0' : 'left-0 right-0'
      }`}>
        <div className="flex items-center gap-2 h-14 px-3">
          {/* Menu Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5 text-gray-700" />
            ) : (
              <Menu className="h-5 w-5 text-gray-700" />
            )}
          </Button>
          
          {/* Breadcrumbs - Integrated into header */}
          <nav className="flex items-center gap-1 flex-1 min-w-0 text-xs text-gray-600">
            <Link 
              href={`/${locale}`}
              className="flex items-center gap-0.5 hover:text-meen transition-colors duration-200 flex-shrink-0"
            >
              <Home className="h-3 w-3" />
            </Link>
            {(() => {
              const pathSegments = pathname?.split('/').filter(Boolean) || []
              const breadcrumbs: string[] = []
              
              // Build breadcrumb path, skipping locale
              for (let i = 1; i < pathSegments.length; i++) {
                const segment = pathSegments[i]
                if (segment === locale) continue
                breadcrumbs.push(segment)
              }
              
              if (breadcrumbs.length === 0) {
                return null
              }
              
              // Map segments to readable labels (same logic as Breadcrumbs component)
              const getSegmentLabel = (segment: string): string => {
                switch (segment) {
                  case 'cases':
                    return t('cases') || 'Cases'
                  case 'dashboard':
                    return t('dashboard') || 'Dashboard'
                  case 'profile':
                    return t('profile') || 'Profile'
                  case 'notifications':
                    return t('notifications') || 'Notifications'
                  case 'admin':
                    return t('admin') || 'Admin'
                  case 'case-management':
                    return t('caseManagement') || 'Case Management'
                  case 'beneficiaries':
                    return t('beneficiaries') || 'Beneficiaries'
                  case 'contributions':
                    return t('contributions') || 'Contributions'
                  case 'create':
                    return t('createCase') || 'Create'
                  case 'edit':
                    return t('edit') || 'Edit'
                  case 'donate':
                    return t('donate') || 'Donate'
                  case 'details':
                    return t('details') || 'Details'
                  default:
                    // For dynamic segments like IDs, show a generic label
                    if (segment.length > 20) {
                      return t('item') || 'Item'
                    }
                    return segment.charAt(0).toUpperCase() + segment.slice(1)
                }
              }
              
              // Show the last breadcrumb (current page)
              const currentSegment = breadcrumbs[breadcrumbs.length - 1]
              const currentLabel = getSegmentLabel(currentSegment)
              
              const ChevronIcon = locale === 'ar' ? ChevronLeft : ChevronRight
              return (
                <>
                  <ChevronIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-900 font-medium truncate">
                    {currentLabel}
                  </span>
                </>
              )
            })()}
          </nav>
        </div>
      </header>
      
      {/* Sidebar - Always fixed, never scrolls with page */}
      <SimpleSidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        collapsed={sidebarCollapsed}
        onCollapseToggle={toggleSidebarCollapse}
      />
      
      {/* Main Content - Accounts for fixed sidebar width on desktop, full width on mobile */}
      <div 
        className={`min-h-screen transition-all duration-300 ${isDesktop ? '' : 'pt-14'}`}
        style={{
          ...(locale === 'ar' 
            ? {
                marginRight: sidebarOpen && isDesktop 
                  ? (sidebarCollapsed ? '80px' : '256px') 
                  : '0',
              }
            : {
                marginLeft: sidebarOpen && isDesktop 
                  ? (sidebarCollapsed ? '80px' : '256px') 
                  : '0',
              }
          ),
        }}
      >
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
