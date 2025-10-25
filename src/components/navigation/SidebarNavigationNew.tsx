'use client'

/**
 * Sidebar Navigation Component - Rebuilt from Scratch
 * Clean, efficient module-based navigation with RBAC from database
 */

import { useState } from 'react'
import { usePathname, useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { 
  ChevronDown, 
  ChevronRight, 
  LogOut, 
  Menu,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRBAC } from '@/lib/hooks/useRBAC'
import { getIconComponent } from '@/config/navigation'

export default function SidebarNavigationNew() {
  const pathname = usePathname()
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  
  // Get RBAC data
  const { 
    userRoles, 
    userPermissions, 
    modules: dbModules, 
    navigationItems,
    isLoading, 
    hasPermission
  } = useRBAC()

  // Handle sign out
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  // Toggle module expansion
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }))
  }

  // Check if item is active
  const isActive = (href: string, exactMatch: boolean): boolean => {
    if (exactMatch) {
      return pathname === href
    }
    return pathname?.startsWith(href) || false
  }

  // Group navigation items by module
  const navigationByModule = dbModules.map(module => {
    const items = navigationItems
      .filter(item => 
        item.module_id === module.id && 
        (!item.permission_id || userPermissions.some(p => p.id === item.permission_id))
      )
      .sort((a, b) => a.order_index - b.order_index)
    
    return items.length > 0 ? { module, items } : null
  }).filter(Boolean)

  // Get standalone items (no module)
  const standaloneItems = navigationItems
    .filter(item => 
      item.is_standalone && 
      (!item.permission_id || userPermissions.some(p => p.id === item.permission_id))
    )
    .sort((a, b) => a.order_index - b.order_index)

  // If loading, show skeleton
  if (isLoading) {
    return (
      <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="h-8 bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-white shadow-lg"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-gray-900 text-white h-screen flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">{t('common.appName') || 'Meen Ma3ana'}</h1>
          {userRoles.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              {userRoles[0].display_name}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {/* Module-based items */}
            {navigationByModule.map(({ module, items }) => {
              const ModuleIcon = getIconComponent(module.icon)
              const isExpanded = expandedModules[module.id] ?? true

              return (
                <div key={module.id}>
                  {/* Module Header */}
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ModuleIcon className="h-5 w-5 text-gray-400" />
                      <span className="font-medium">
                        {t(`navigation.${module.name}`) || module.display_name}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {/* Module Items */}
                  {isExpanded && (
                    <div className="ml-8 mt-1 space-y-1">
                      {items.map(item => {
                        const ItemIcon = getIconComponent(item.icon)
                        const active = isActive(item.href, item.exact_match)

                        return (
                          <Link
                            key={item.id}
                            href={`/${locale}${item.href}`}
                            onClick={() => setIsMobileOpen(false)}
                            className={`
                              flex items-center gap-3 p-2 rounded-lg
                              transition-colors
                              ${active 
                                ? 'bg-blue-600 text-white' 
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                              }
                            `}
                          >
                            <ItemIcon className="h-4 w-4" />
                            <span className="text-sm">
                              {t(item.label_key) || item.label_key}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Standalone items */}
            {standaloneItems.length > 0 && (
              <>
                {navigationByModule.length > 0 && (
                  <div className="h-px bg-gray-700 my-4" />
                )}
                {standaloneItems.map(item => {
                  const ItemIcon = getIconComponent(item.icon)
                  const active = isActive(item.href, item.exact_match)

                  return (
                    <Link
                      key={item.id}
                      href={`/${locale}${item.href}`}
                      onClick={() => setIsMobileOpen(false)}
                      className={`
                        flex items-center gap-3 p-2 rounded-lg
                        transition-colors
                        ${active 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }
                      `}
                    >
                      <ItemIcon className="h-5 w-5" />
                      <span>{t(item.label_key) || item.label_key}</span>
                    </Link>
                  )
                })}
              </>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-3" />
            {t('navigation.signOut') || 'Sign Out'}
          </Button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}

