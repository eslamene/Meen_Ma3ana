'use client'

import { getIconWithFallback } from '@/lib/icons/registry'
import { Folder, Circle } from 'lucide-react'
import {
  ChevronDown,
  ChevronRight,
  Heart,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useMenuState } from '@/lib/hooks/useMenuState'

// Color mapping to prevent Tailwind purging
const COLOR_CLASSES = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  red: 'text-red-500',
  purple: 'text-purple-500',
  yellow: 'text-yellow-500',
  indigo: 'text-indigo-500',
  gray: 'text-gray-500',
  emerald: 'text-emerald-500',
  orange: 'text-orange-500',
} as const

const getColorClass = (color: string): string => {
  return COLOR_CLASSES[color as keyof typeof COLOR_CLASSES] || 'text-gray-500'
}

interface ClientSidebarNavigationProps {
  isOpen: boolean
  onToggle: () => void
  locale: string
  modules: Array<{
    id: string
    name: string
    display_name: string
    description?: string
    icon: string
    color: string
    sort_order: number
    items: Array<{
      label: string
      href: string
      icon: string
      description?: string
      sortOrder: number
      permission?: string
      children?: Array<{
        label: string
        href: string
        icon: string
        description?: string
        sortOrder: number
        permission?: string
      }>
    }>
  }>
  user: {
    email?: string
  } | null
}

export default function ClientSidebarNavigation({
  isOpen,
  onToggle,
  locale,
  modules,
  user
}: ClientSidebarNavigationProps) {
  const pathname = usePathname()

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0 lg:static lg:inset-0`}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Heart className="h-8 w-8 text-red-500" />
          <span className="text-xl font-bold text-gray-900">Meen Ma3ana</span>
        </div>
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
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {modules.map((module) => (
          <ModuleSection
            key={module.id}
            module={module}
            locale={locale}
            pathname={pathname}
          />
        ))}
      </nav>

      {/* User Info */}
      {user && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.email}
              </p>
              <p className="text-xs text-gray-500">Logged in</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ModuleSectionProps {
  module: {
    id: string
    name: string
    display_name: string
    description?: string
    icon: string
    color: string
    sort_order: number
    items: Array<{
      label: string
      href: string
      icon: string
      description?: string
      sortOrder: number
      permission?: string
      children?: Array<{
        label: string
        href: string
        icon: string
        description?: string
        sortOrder: number
        permission?: string
      }>
    }>
  }
  locale: string
  pathname: string
}

function ModuleSection({ module, locale, pathname }: ModuleSectionProps) {
  const { expandedModules, toggleModule } = useMenuState()
  const isExpanded = expandedModules.has(module.id)

  const IconComponent = getIconWithFallback(module.icon, Folder)

  // Check if module is active (any item or child is active)
  const isModuleActive = module.items.some(item => {
    const itemPath = `/${locale}${item.href}`
    if (pathname === itemPath) return true
    if (item.children) {
      return item.children.some(child => pathname === `/${locale}${child.href}`)
    }
    return false
  })

  return (
    <Collapsible open={isExpanded} onOpenChange={() => toggleModule(module.id)}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={`w-full justify-between p-3 h-auto ${isModuleActive ? 'bg-blue-50 text-blue-900' : ''}`}
          aria-expanded={isExpanded}
          role="button"
        >
          <div className="flex items-center space-x-3">
            <IconComponent className={`h-5 w-5 ${isModuleActive ? 'text-blue-600' : getColorClass(module.color)}`} />
            <div className="text-left">
              <div className="font-medium">
                {module.display_name}
              </div>
              <div className="text-xs">
                {module.description || ''}
              </div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-1 ml-8">
        {module.items.map((item, index) => {
          const ItemIcon = getIconWithFallback(item.icon, Circle)

          // If item has children, render as collapsible sub-menu
          if (item.children && item.children.length > 0) {
            return (
              <MenuItemWithChildren
                key={index}
                item={item}
                locale={locale}
                ItemIcon={ItemIcon}
                pathname={pathname}
              />
            )
          }

          // Regular menu item
          const isActive = pathname === `/${locale}${item.href}`
          return (
            <Link
              key={index}
              href={`/${locale}${item.href}`}
              className={`flex items-center space-x-3 p-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-blue-100 text-blue-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <ItemIcon className="h-4 w-4" />
              <div>
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
            </Link>
          )
        })}
      </CollapsibleContent>
    </Collapsible>
  )
}

interface MenuItemWithChildrenProps {
  item: {
    label: string
    href: string
    icon: string
    description?: string
    sortOrder: number
    permission?: string
    children?: Array<{
      label: string
      href: string
      icon: string
      description?: string
      sortOrder: number
      permission?: string
    }>
  }
  locale: string
  ItemIcon: any
  pathname: string
}

function MenuItemWithChildren({ item, locale, ItemIcon, pathname }: MenuItemWithChildrenProps) {
  const { expandedItems, toggleItem } = useMenuState()
  const isExpanded = expandedItems.has(item.href)

  // Check if parent item is active (any child is active)
  const isActive = item.children?.some(child => pathname === `/${locale}${child.href}`) || false

  return (
    <Collapsible open={isExpanded} onOpenChange={() => toggleItem(item.href)}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={`w-full justify-between p-2 h-auto text-sm transition-colors ${isActive ? 'bg-blue-50 text-blue-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          aria-expanded={isExpanded}
          role="button"
        >
          <div className="flex items-center space-x-3">
            <ItemIcon className={`h-4 w-4 ${isActive ? 'text-blue-600' : ''}`} />
            <div className="text-left">
              <div className="font-medium">{item.label}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-1 pl-8">
        {item.children?.map((child, childIndex) => {
          const ChildIcon = getIconWithFallback(child.icon, Circle)
          const isChildActive = pathname === `/${locale}${child.href}`

          return (
            <Link
              key={childIndex}
              href={`/${locale}${child.href}`}
              className={`flex items-center space-x-3 p-2 rounded-lg text-xs transition-colors ${isChildActive ? 'bg-blue-100 text-blue-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
            >
              <ChildIcon className="h-3 w-3" />
              <div>
                <div className="font-medium">{child.label}</div>
                <div className="text-xs text-gray-400">{child.description || ''}</div>
              </div>
            </Link>
          )
        })}
      </CollapsibleContent>
    </Collapsible>
  )
}
