'use client'

import React from 'react'
import { getIconComponent } from '@/lib/icons/registry'
import { FileText } from 'lucide-react'
import type { LucideProps } from 'lucide-react'

export interface DynamicIconProps extends LucideProps {
  /**
   * Icon name (e.g., "camera", "home", "user")
   * Must match the exact icon name from the icon registry (case-sensitive)
   */
  name: string
  
  /**
   * Fallback icon name if the requested icon is not found
   * @default "file-text"
   */
  fallback?: string
}

/**
 * Dynamic Icon Component
 * 
 * Renders lucide-react icons dynamically by name string.
 * Useful when icon names are stored in a database.
 * 
 * This component uses the centralized icon registry to resolve
 * icon names to their corresponding Lucide React components.
 * 
 * @example
 * ```tsx
 * <DynamicIcon name="camera" size={24} color="red" />
 * <DynamicIcon name={menuItem.icon} className="h-4 w-4" />
 * ```
 */
export default function DynamicIcon({
  name,
  fallback = 'file-text',
  ...props
}: DynamicIconProps) {
  // Get the icon component from the registry
  const IconComponent = name ? getIconComponent(name) : null
  const FallbackIcon = getIconComponent(fallback) || FileText
  
  // If icon not found, use fallback
  if (!IconComponent) {
    if (name && name !== fallback) {
      console.warn(`Icon "${name}" not found in registry, using fallback "${fallback}"`)
    }
    return <FallbackIcon {...props} />
  }
  
  return <IconComponent {...props} />
}

