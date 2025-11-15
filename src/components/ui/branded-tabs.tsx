'use client'

import * as React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { brandColors } from '@/lib/theme'
import { LucideIcon } from 'lucide-react'

export interface BrandedTabItem {
  value: string
  label: string
  icon?: LucideIcon
  badge?: number | string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

interface BrandedTabsProps {
  value: string
  onValueChange: (value: string) => void
  items: BrandedTabItem[]
  className?: string
  containerClassName?: string
  children?: React.ReactNode
}

/**
 * Branded tabs component inspired by Meen Ma3ana logo colors
 * Uses olive-green (#6B8E7E) and vibrant red (#E74C3C) from the brand
 */
export function BrandedTabs({
  value,
  onValueChange,
  items,
  className,
  containerClassName,
  children,
}: BrandedTabsProps) {
  // Generate gradient colors for each tab based on brand colors from theme
  const getTabColors = (index: number) => {
    const colors = [
      {
        // First tab uses Meen (olive-green) gradient
        activeFrom: brandColors.meen[500],
        activeTo: brandColors.meen[600],
        inactive: brandColors.meen[500],
        hoverBg: brandColors.meen[100] + '80', // 50% opacity
        shadow: 'rgba(107, 142, 126, 0.3)',
        overlayFrom: 'rgba(107, 142, 126, 0.2)',
        overlayTo: 'rgba(90, 122, 107, 0.2)',
      },
      {
        // Second tab uses Ma3ana (vibrant red) gradient
        activeFrom: brandColors.ma3ana[500],
        activeTo: brandColors.ma3ana[600],
        inactive: brandColors.ma3ana[500],
        hoverBg: brandColors.ma3ana[100] + '80', // 50% opacity
        shadow: 'rgba(231, 76, 60, 0.3)',
        overlayFrom: 'rgba(231, 76, 60, 0.2)',
        overlayTo: 'rgba(192, 57, 43, 0.2)',
      },
    ]
    // Cycle through colors for additional tabs
    return colors[index % colors.length]
  }

  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <div
        className={cn(
          'mb-8 rounded-xl bg-gradient-brand-subtle p-1.5 border border-meen/20 shadow-sm',
          containerClassName
        )}
      >
        <TabsList className="inline-flex h-auto p-0 bg-transparent w-full justify-start gap-2">
          {items.map((item, index) => {
            const Icon = item.icon
            const colors = getTabColors(index)
            
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className={cn(
                  'group relative flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm font-bold rounded-lg border-2 border-transparent',
                  'data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-lg',
                  'transition-all duration-300 bg-transparent',
                  'data-[state=inactive]:hover:bg-opacity-10'
                )}
                style={{
                  ...(value === item.value
                    ? {
                        background: `linear-gradient(to right, ${colors.activeFrom}, ${colors.activeTo})`,
                        boxShadow: `0 10px 15px -3px ${colors.shadow}, 0 4px 6px -2px ${colors.shadow}`,
                        color: 'white',
                      }
                    : {
                        color: colors.inactive,
                      }),
                }}
                onMouseEnter={(e) => {
                  if (value !== item.value) {
                    e.currentTarget.style.backgroundColor = colors.hoverBg
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== item.value) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                {Icon && (
                  <Icon className="h-4.5 w-4.5 transition-all duration-300 group-data-[state=active]:scale-125 group-data-[state=active]:rotate-3" />
                )}
                <span className="relative z-10">{item.label}</span>
                {item.badge !== undefined && item.badge !== null && (
                  <Badge
                    variant={item.badgeVariant || 'secondary'}
                    className={cn(
                      'ml-1.5 h-6 min-w-[24px] px-2 text-xs font-bold text-white border-0 shadow-md transition-all duration-300',
                      index === 0
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 group-data-[state=active]:from-yellow-400 group-data-[state=active]:to-amber-500 group-data-[state=active]:shadow-lg group-data-[state=active]:shadow-amber-500/40'
                        : 'bg-gradient-to-r from-orange-400 to-red-500 group-data-[state=active]:from-amber-400 group-data-[state=active]:to-orange-500 group-data-[state=active]:shadow-lg group-data-[state=active]:shadow-orange-500/40'
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
                <div
                  className="absolute inset-0 rounded-lg opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(to right, ${colors.overlayFrom}, ${colors.overlayTo})`,
                  }}
                />
              </TabsTrigger>
            )
          })}
        </TabsList>
      </div>
      {children}
    </Tabs>
  )
}

// Export TabsContent for use with BrandedTabs
export { TabsContent }

