/**
 * Centralized Icon Registry
 * 
 * This file contains all icon mappings to eliminate duplication
 * across navigation components and ensure consistent icon usage.
 */

import React from 'react'
import {
  Settings,
  Heart,
  DollarSign,
  Users,
  Bell,
  BarChart3,
  FileText,
  CreditCard,
  User,
  Home,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  Shield,
  TrendingUp,
  FolderOpen,
  Plus,
  Wallet,
  Clock,
  UserCheck,
  Download,
  Folder,
  Upload,
  Lock,
  Globe,
  Info,
  Mail,
  UserPlus,
  Package,
  Circle,
  type LucideIcon
} from 'lucide-react'

/**
 * Icon component props interface
 */
export interface IconProps {
  className?: string
  size?: number | string
  color?: string
}

/**
 * Type-safe icon registry mapping icon names to components
 */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  // Navigation icons
  Settings,
  Heart,
  DollarSign,
  Users,
  Bell,
  BarChart3,
  FileText,
  CreditCard,
  User,
  Home,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  
  // Feature-specific icons
  Shield,
  TrendingUp,
  FolderOpen,
  Plus,
  Wallet,
  Clock,
  UserCheck,
  Download,
  Folder,
  Upload,
  Lock,
  
  // Additional icons for menu system
  Globe,
  Info,
  Mail,
  UserPlus,
  Package,
  Circle,
  
  // Aliases for backward compatibility
  'User': User,
  'BarChart': BarChart3,
  'Files': FileText,
  'Money': DollarSign,
  'People': Users,
  'Notification': Bell,
  'Dashboard': BarChart3,
  'Admin': Settings,
  'Profile': User,
  'Security': Lock,
  'Analytics': TrendingUp
} as const

/**
 * Get an icon component by name
 * @param iconName - The name of the icon
 * @returns The icon component or undefined if not found
 */
export function getIcon(iconName: string): LucideIcon | undefined {
  return ICON_REGISTRY[iconName]
}

/**
 * Get an icon component with fallback
 * @param iconName - The name of the icon
 * @param fallback - Fallback icon if the requested icon is not found
 * @returns The icon component or fallback
 */
export function getIconWithFallback(
  iconName: string, 
  fallback: LucideIcon = Settings
): LucideIcon {
  return ICON_REGISTRY[iconName] || fallback
}

/**
 * Check if an icon exists in the registry
 * @param iconName - The name of the icon
 * @returns Boolean indicating if the icon exists
 */
export function hasIcon(iconName: string): boolean {
  return iconName in ICON_REGISTRY
}

/**
 * Get all available icon names
 * @returns Array of all icon names in the registry
 */
export function getAvailableIcons(): string[] {
  return Object.keys(ICON_REGISTRY)
}

/**
 * Icon component wrapper with consistent props
 */
export interface IconComponentProps extends IconProps {
  name: string
  fallback?: LucideIcon
}

export function IconComponent({ 
  name, 
  fallback = Settings, 
  className = '', 
  size = 16, 
  color,
  ...props 
}: IconComponentProps) {
  const IconElement = getIconWithFallback(name, fallback)
  
  return React.createElement(IconElement, { 
    className,
    size,
    color,
    ...props 
  })
}

/**
 * Type guard to check if a string is a valid icon name
 */
export function isValidIconName(name: string): name is keyof typeof ICON_REGISTRY {
  return name in ICON_REGISTRY
}
