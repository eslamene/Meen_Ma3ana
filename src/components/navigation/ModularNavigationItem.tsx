'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { NavigationModule } from '@/lib/hooks/useModularRBAC'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

// Icon mapping for modules
const iconMap: Record<string, React.ComponentType<any>> = {
  Settings: require('lucide-react').Settings,
  Heart: require('lucide-react').Heart,
  DollarSign: require('lucide-react').DollarSign,
  Users: require('lucide-react').Users,
  Bell: require('lucide-react').Bell,
  BarChart3: require('lucide-react').BarChart3,
  FileText: require('lucide-react').FileText,
  CreditCard: require('lucide-react').CreditCard,
  User: require('lucide-react').User,
}

// Navigation items for each module
const moduleNavigationItems: Record<string, Array<{
  label: string
  href: string
  permissions: string[]
  requireAll?: boolean
}>> = {
  admin: [
    {
      label: 'Dashboard',
      href: '/admin',
      permissions: ['admin:dashboard']
    },
    {
      label: 'Analytics',
      href: '/admin/analytics',
      permissions: ['admin:analytics', 'admin:dashboard'],
      requireAll: false
    },
    {
      label: 'RBAC Management',
      href: '/admin/rbac',
      permissions: ['admin:rbac']
    }
  ],
  cases: [
    {
      label: 'All Cases',
      href: '/admin/cases',
      permissions: ['cases:update', 'cases:delete', 'admin:dashboard'],
      requireAll: false
    },
    {
      label: 'Create Case',
      href: '/cases/create',
      permissions: ['cases:create']
    }
  ],
  contributions: [
    {
      label: 'All Contributions',
      href: '/admin/contributions',
      permissions: ['admin:dashboard', 'contributions:approve'],
      requireAll: false
    },
    {
      label: 'My Contributions',
      href: '/contributions',
      permissions: ['contributions:read']
    }
  ],
  users: [
    {
      label: 'Manage Users',
      href: '/admin/users',
      permissions: ['admin:users', 'users:update'],
      requireAll: false
    }
  ],
  profile: [
    {
      label: 'My Profile',
      href: '/profile',
      permissions: ['profile:read']
    },
    {
      label: 'Settings',
      href: '/profile/settings',
      permissions: ['profile:update']
    }
  ]
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

  const IconComponent = iconMap[module.icon]
  const navigationItems = moduleNavigationItems[module.name] || []

  // Filter items based on permissions
  const visibleItems = navigationItems.filter(item => {
    // This will be handled by PermissionGuard, but we pre-filter for performance
    return true
  })

  if (visibleItems.length === 0) {
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
          {navigationItems.map((item, index) => (
            <PermissionGuard
              key={index}
              allowedPermissions={item.permissions}
              requireAll={item.requireAll}
              showLoading={false}
            >
              <Link
                href={`/${locale}${item.href}`}
                onClick={handleItemClick}
                className={`
                  block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 
                  hover:bg-gray-50 rounded-md transition-colors duration-200
                  ${isMobile ? '' : 'border-b border-gray-100 last:border-b-0'}
                `}
              >
                {item.label}
              </Link>
            </PermissionGuard>
          ))}
        </div>
      )}
    </div>
  )
}
