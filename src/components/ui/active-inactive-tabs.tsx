'use client'

import React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, CheckCircle, XCircle } from 'lucide-react'

interface ActiveInactiveTabsProps {
  /**
   * Current active tab value
   */
  value: 'active' | 'inactive'
  
  /**
   * Callback when tab changes
   */
  onValueChange: (value: 'active' | 'inactive') => void
  
  /**
   * Count of active items
   */
  activeCount: number
  
  /**
   * Count of inactive items
   */
  inactiveCount: number
  
  /**
   * Search term value
   */
  searchTerm: string
  
  /**
   * Callback when search term changes
   */
  onSearchChange: (value: string) => void
  
  /**
   * Placeholder text for search input
   */
  searchPlaceholder?: string
  
  /**
   * Optional className for the container
   */
  className?: string
}

/**
 * Standard Active/Inactive Tabs Component
 * 
 * A reusable component for filtering items by active/inactive status with search.
 * Used across admin pages like Categories, Payment Methods, etc.
 * 
 * @example
 * ```tsx
 * <ActiveInactiveTabs
 *   value={activeTab}
 *   onValueChange={setActiveTab}
 *   activeCount={activeItems.length}
 *   inactiveCount={inactiveItems.length}
 *   searchTerm={searchTerm}
 *   onSearchChange={setSearchTerm}
 *   searchPlaceholder="Search items..."
 * />
 * ```
 */
export default function ActiveInactiveTabs({
  value,
  onValueChange,
  activeCount,
  inactiveCount,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
  className = '',
}: ActiveInactiveTabsProps) {
  return (
    <div className={`mb-4 sm:mb-6 space-y-4 ${className}`}>
      <Tabs value={value} onValueChange={(v) => onValueChange(v as 'active' | 'inactive')} className="w-full">
        <TabsList variant="branded" className="w-full sm:w-auto">
          <TabsTrigger value="active" icon={CheckCircle} tabIndex={0} badge={activeCount}>
            Active
          </TabsTrigger>
          <TabsTrigger value="inactive" icon={XCircle} tabIndex={1} badge={inactiveCount}>
            Inactive
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}




