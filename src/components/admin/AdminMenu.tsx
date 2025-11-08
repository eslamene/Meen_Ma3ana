'use client'

/**
 * Clean Admin Menu Component
 * Displays menu items based on user roles and permissions
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdmin } from '@/lib/admin/hooks'
import { getIconComponent } from '@/config/navigation'
import { cn } from '@/lib/utils'
import type { AdminMenuItem } from '@/lib/admin/types'

interface AdminMenuProps {
  className?: string
}

export function AdminMenu({ className }: AdminMenuProps) {
  const { menuItems, loading } = useAdmin()
  const pathname = usePathname()

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-4', className)}>
        <div className="text-sm text-muted-foreground">Loading menu...</div>
      </div>
    )
  }

  return (
    <nav className={cn('space-y-1', className)}>
      {menuItems.map(item => (
        <MenuItem
          key={item.id}
          item={item}
          pathname={pathname}
          level={0}
        />
      ))}
    </nav>
  )
}

interface MenuItemProps {
  item: AdminMenuItem
  pathname: string
  level: number
}

function MenuItem({ item, pathname, level }: MenuItemProps) {
  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
  const Icon = item.icon ? getIconComponent(item.icon) : null
  const hasChildren = item.children && item.children.length > 0

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {Icon && <Icon className="h-4 w-4" />}
          <span>{item.label}</span>
        </div>
        <div className="ml-4 space-y-1">
          {item.children!.map(child => (
            <MenuItem
              key={child.id}
              item={child}
              pathname={pathname}
              level={level + 1}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{item.label}</span>
    </Link>
  )
}

