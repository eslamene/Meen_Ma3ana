'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getIconComponent, ICON_MAP } from '@/lib/icons/registry'
import { X, MagnifyingGlass as Search } from '@phosphor-icons/react'

export interface IconPickerProps {
  /**
   * Selected icon name
   */
  value?: string | null
  
  /**
   * Callback when icon is selected
   */
  onSelect: (iconName: string | null) => void
  
  /**
   * Placeholder text when no icon is selected
   */
  placeholder?: string
  
  /**
   * Whether to show the clear button next to the picker
   */
  showClearButton?: boolean
  
  /**
   * Additional className for the trigger button
   */
  className?: string
  
  /**
   * Button variant
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  
  /**
   * Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export default function IconPicker({
  value,
  onSelect,
  placeholder = 'Select an icon',
  showClearButton = true,
  className = '',
  variant = 'outline',
  size = 'default',
}: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSelect = (iconName: string) => {
    onSelect(iconName)
    setOpen(false)
    setSearchQuery('') // Clear search when icon is selected
  }

  const handleClear = () => {
    onSelect(null)
    setOpen(false)
    setSearchQuery('')
  }

  // Filter icons based on search query
  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      return Object.entries(ICON_MAP)
    }
    
    const query = searchQuery.toLowerCase().trim()
    return Object.entries(ICON_MAP).filter(([iconName]) =>
      iconName.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Memoize the icon component to avoid creating it during render
  // Icon components from registry are stateless and safe to create during render
  const IconComponent = useMemo(() => {
    return value ? getIconComponent(value) : null
  }, [value])

  return (
    <div className="flex gap-2">
      <Popover 
        open={open} 
        onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) {
            setSearchQuery('') // Clear search when popover closes
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={variant}
            size={size}
            className={`w-full justify-start ${className}`}
          >
            {value && IconComponent ? (
              <>
                <IconComponent className="h-4 w-4 mr-2" weight="regular" />
                {value}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" weight="regular" />
              <Input
                type="text"
                placeholder="Search icons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {filteredIcons.length > 0 ? (
            <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
              {filteredIcons.map(([iconName, IconComponent]) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => handleSelect(iconName)}
                  className={`p-2 rounded border hover:bg-gray-100 transition-colors ${
                    value === iconName ? 'bg-blue-50 border-blue-500' : 'border-gray-200'
                  }`}
                  title={iconName}
                >
                  <IconComponent className="h-5 w-5 mx-auto" weight="regular" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No icons found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
          <div className="mt-4 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={handleClear}
            >
              Clear Icon
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {showClearButton && value && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleClear}
        >
          <X className="h-4 w-4" weight="regular" />
        </Button>
      )}
    </div>
  )
}
