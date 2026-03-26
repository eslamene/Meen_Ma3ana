'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import NavigationBar from '@/components/navigation/NavigationBar'
import SimpleSidebar from '@/components/navigation/SimpleSidebar'
import { Button } from '@/components/ui/button'
import { Home, ChevronRight, ChevronLeft, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { defaultLogger as logger } from '@/lib/logger'
import { AutoSubscribePrompt } from '@/components/notifications/AutoSubscribePrompt'
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

function AuthenticatedMobileHeader({ locale }: { locale: string }) {
  const pathname = usePathname()
  const t = useTranslations('navigation')
  const { toggleSidebar, openMobile } = useSidebar()

  return (
    <header
      className={`fixed top-0 z-40 flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-3 shadow-sm lg:hidden ${
        locale === 'ar' ? 'right-0 left-0' : 'left-0 right-0'
      }`}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleSidebar}
        className="me-2 shrink-0 rounded-lg p-2 hover:bg-gray-100"
        aria-label={openMobile ? 'Close menu' : 'Open menu'}
        aria-expanded={openMobile}
      >
        {openMobile ? (
          <X className="h-5 w-5 text-gray-700" aria-hidden />
        ) : (
          <Menu className="h-5 w-5 text-gray-700" aria-hidden />
        )}
      </Button>

      <nav className="flex min-w-0 flex-1 items-center gap-1 text-xs text-gray-600">
        <Link
          href={`/${locale}`}
          className="flex shrink-0 items-center gap-0.5 text-gray-600 transition-colors duration-200 hover:text-meen"
        >
          <Home className="h-3 w-3" />
        </Link>
        {(() => {
          const pathSegments = pathname?.split('/').filter(Boolean) || []
          const breadcrumbs: string[] = []
          for (let i = 1; i < pathSegments.length; i++) {
            const segment = pathSegments[i]
            if (segment === locale) continue
            breadcrumbs.push(segment)
          }
          if (breadcrumbs.length === 0) return null

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
                if (segment.length > 20) {
                  return t('item') || 'Item'
                }
                return segment.charAt(0).toUpperCase() + segment.slice(1)
            }
          }

          const currentSegment = breadcrumbs[breadcrumbs.length - 1]
          const currentLabel = getSegmentLabel(currentSegment)
          const ChevronIcon = locale === 'ar' ? ChevronLeft : ChevronRight
          return (
            <>
              <ChevronIcon className="h-3 w-3 shrink-0 text-gray-400" />
              <span className="truncate font-medium text-gray-900">{currentLabel}</span>
            </>
          )
        })()}
      </nav>
    </header>
  )
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('navigation')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)

  const [supabase] = useState(() => createClient())

  const isResetPasswordPage = pathname?.includes('/auth/reset-password') || false

  useEffect(() => {
    const checkRecoveryMode = () => {
      if (typeof window !== 'undefined') {
        const recoveryMode =
          document.cookie
            .split('; ')
            .find((row) => row.startsWith('recovery_mode='))
            ?.split('=')[1] === 'true'
        setIsRecoveryMode(recoveryMode || false)
      }
    }

    checkRecoveryMode()
    const interval = setInterval(checkRecoveryMode, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-collapsed')
      if (stored === 'true') {
        setSidebarCollapsed(true)
      }
    }
  }, [])

  const handleSidebarOpenChange = (open: boolean) => {
    const collapsed = !open
    setSidebarCollapsed(collapsed)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', String(collapsed))
    }
  }

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        logger.error('Error fetching user:', { error: error })
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  const shouldShowPublicNav =
    !user || isRecoveryMode || (isResetPasswordPage && !isRecoveryMode)

  if (shouldShowPublicNav) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationBar />
        <main>{children}</main>
      </div>
    )
  }

  return (
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={handleSidebarOpenChange}
      className="min-h-svh bg-gray-50"
    >
      <SimpleSidebar />
      <SidebarInset className="bg-gray-50 pt-14 lg:pt-0">
        <AuthenticatedMobileHeader locale={locale} />
        <main className="min-h-screen">{children}</main>
        <AutoSubscribePrompt delay={3000} showOnce={true} />
      </SidebarInset>
    </SidebarProvider>
  )
}
