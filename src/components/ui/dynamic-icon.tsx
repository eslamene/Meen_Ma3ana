'use client'

import React from 'react'
import { getIconComponent, type IconProps } from '@/lib/icons/registry'
import { FileText } from '@phosphor-icons/react'

import { defaultLogger as logger } from '@/lib/logger'

export interface DynamicIconProps extends IconProps {
  /**
   * Icon name (e.g., "camera", "home", "user")
   * Must match the exact icon name from the icon registry (case-sensitive)
   */
  name: string
  
  /**
   * Fallback icon name if the requested icon is not found
   * @default "FileText"
   */
  fallback?: string
}

/**
 * Dynamic Icon Component
 * 
 * Renders Phosphor Icons dynamically by name string.
 * Useful when icon names are stored in a database.
 * 
 * This component uses the centralized icon registry to resolve
 * icon names to their corresponding Phosphor icon components.
 * 
 * @example
 * ```tsx
 * <DynamicIcon name="Camera" size={24} color="red" />
 * <DynamicIcon name={menuItem.icon} className="h-4 w-4" />
 * ```
 */
export default function DynamicIcon({
  name,
  fallback = 'FileText',
  ...props
}: DynamicIconProps) {
  // Get the icon component from the registry
  // These are stateless icon components from a registry, safe to create during render
  const IconComponent = name ? getIconComponent(name) : null
  const FallbackIcon = getIconComponent(fallback) || FileText
  
  // If icon not found, use fallback
  if (!IconComponent) {
    if (name && name !== fallback) {
      logger.warn(`Icon "${name}" not found in registry, using fallback "${fallback}"`)
    }
    return <FallbackIcon {...props} />
  }
  
  return <IconComponent {...props} />
}
