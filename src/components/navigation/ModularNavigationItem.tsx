'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { NavigationModule } from '@/lib/hooks/useModularRBAC'
import { getIconWithFallback } from '@/lib/icons/registry'
import { 
  getModuleNavigationItems,
  filterNavigationItemsByPermissions
} from '@/lib/navigation/config'

// Helper function to get user permissions from module
const getUserPermissionsFromModule = (module: NavigationModule): string[] => {
  if (!module.permissions) return []
  return module.permissions.map(p => p.name)
}

interface ModularNavigationItemProps {
  module: NavigationModule
  isMobile?: boolean
  onItemClick?: () => void
}

export function ModularNavigationItem({ 
  module, 
  isMobile = false, 
  onItemClick 
}: ModularNavigationItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const params = useParams()
  const locale = params.locale as string

  const IconComponent = getIconWithFallback(module.icon || 'Settings')
  const navigationItems = getModuleNavigationItems(module.name)
  const userPermissions = getUserPermissionsFromModule(module)
  const filteredItems = filterNavigationItemsByPermissions(navigationItems, userPermissions)

  if (filteredItems.length === 0) {
    return null
  }

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleItemClick = () => {
    if (onItemClick) {
      onItemClick()
    }
  }

  return (
    <div className={`${isMobile ? 'w-full' : 'relative'}`}>
      {/* Module Header */}
      <button
        onClick={handleToggle}
        className={`
          flex items-center justify-between w-full px-3 py-2 text-sm font-medium
          text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md
          transition-colors duration-200
          ${isMobile ? 'text-left' : ''}
        `}
      >
        <div className="flex items-center space-x-2">
          {IconComponent && (
            <IconComponent className="h-4 w-4" />
          )}
          <span>{module.display_name}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {/* Module Items */}
      {isOpen && (
        <div className={`
          ${isMobile 
            ? 'ml-6 mt-1 space-y-1' 
            : 'absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50'
          }
        `}>
          {filteredItems.map((item, index) => (
            <Link
              key={index}
              href={`/${locale}${item.href}`}
              onClick={handleItemClick}
              title={item.description}
              className={`
                block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 
                hover:bg-gray-50 rounded-md transition-colors duration-200
                ${isMobile ? '' : 'border-b border-gray-100 last:border-b-0'}
              `}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
