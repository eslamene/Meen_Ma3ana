'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useSimpleRBAC } from '@/lib/hooks/useSimpleRBAC'
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
  BarChart3,
  Users,
  CreditCard,
  Plus,
  UserPlus,
  Settings
} from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface SimpleSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export default function SimpleSidebar({ isOpen, onToggle }: SimpleSidebarProps) {
  const t = useTranslations('navigation')
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = params.locale as string

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [notificationCount, setNotificationCount] = useState(0)

  const supabase = createClient()
  const { user, loading, modules, hasRole } = useSimpleRBAC()

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
  if (loading && modules.length === 0) {
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
        
        {/* Header */}
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

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-2">
            {/* Home */}
            <Link
              href={`/${locale}`}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Home className="mr-3 h-4 w-4" />
              {t('home')}
            </Link>

            {/* Dashboard */}
            <Link
              href={`/${locale}/dashboard`}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/dashboard') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              {t('dashboard')}
            </Link>

            {/* Notifications */}
            <Link
              href={`/${locale}/notifications`}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/notifications') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                <Bell className="mr-3 h-4 w-4" />
                {t('notifications')}
              </div>
              {notificationCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {notificationCount}
                </Badge>
              )}
            </Link>

            {/* Modules */}
            {modules.map((module) => {
              const IconComponent = getIcon(module.icon)
              const isExpanded = expandedModules.has(module.id)
              const hasItems = module.items.length > 0

              if (!hasItems) return null

              return (
                <div key={module.id} className="space-y-1">
                  {/* Module Header */}
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <IconComponent className="mr-3 h-4 w-4" />
                      {module.display_name}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {/* Module Items */}
                  {isExpanded && (
                    <div className="ml-6 space-y-1">
                      {module.items.map((item, index) => {
                        const ItemIcon = getIcon(item.icon)
                        return (
                          <Link
                            key={index}
                            href={`/${locale}${item.href}`}
                            className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                              isActive(item.href)
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <ItemIcon className="mr-3 h-4 w-4" />
                            {item.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Language Switcher */}
          <div className="flex justify-center">
            <LanguageSwitcher />
          </div>

          {/* User Info */}
          {user && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          {/* Sign Out */}
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('signOut')}
          </Button>
        </div>
      </div>
    </>
  )
}
