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
  FileCheck,
  FolderKanban,
  PlusCircle,
  Calendar,
  Repeat,
  MessageSquare,
  LineChart,
  ShieldCheck,
  ShieldPlus,
  UserCog,
  GitBranch,
  Tag,
  Search,
  Edit,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  Eye,
  EyeOff,
  Palette,
  Building2,
  ShoppingBag,
  Truck,
  Store,
  Gift,
  Star,
  Award,
  Target,
  TrendingDown,
  Activity,
  Zap,
  Flame,
  Droplet,
  Sun,
  Moon,
  Cloud,
  Umbrella,
  Coffee,
  Utensils,
  Car,
  Plane,
  Train,
  Bike,
  Gamepad2,
  Music,
  Film,
  Book,
  GraduationCap,
  Briefcase,
  Stethoscope,
  Pill,
  Hospital,
  Building,
  Factory,
  Phone,
  MapPin,
  Unlock,
  Key,
  UserCircle,
  UserSquare,
  Users2,
  UserX,
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertCircle,
  Check,
  Minus,
  MoreHorizontal,
  MoreVertical,
  ChevronUp,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Save,
  RefreshCw,
  RotateCw,
  RotateCcw,
  Copy,
  Clipboard,
  Scissors,
  Ambulance,
  Shirt,
  Refrigerator,
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
  // Core Navigation icons
  Home,
  Users,
  Heart,
  FileText,
  DollarSign,
  Settings,
  Shield,
  BarChart3,
  Bell,
  User,
  Menu,
  X,
  LogOut,
  
  // File & Document icons
  FileCheck,
  FolderOpen,
  Folder,
  FolderKanban,
  Clipboard,
  Scissors,
  Copy,
  
  // User & People icons
  UserPlus,
  UserCheck,
  UserCircle,
  UserSquare,
  Users2,
  UserX,
  UserCog,
  
  // Action & UI icons
  Plus,
  PlusCircle,
  Edit,
  Trash2,
  Search,
  Save,
  Download,
  Upload,
  RefreshCw,
  RotateCw,
  RotateCcw,
  Check,
  CheckCircle,
  XCircle,
  Minus,
  MoreHorizontal,
  MoreVertical,
  
  // Navigation & Direction icons
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  
  // Status & Alert icons
  AlertTriangle,
  AlertCircle,
  Info,
  HelpCircle,
  Eye,
  EyeOff,
  
  // Communication icons
  Mail,
  Phone,
  MessageSquare,
  
  // Location & Geography icons
  MapPin,
  Globe,
  
  // Security & Access icons
  Lock,
  Unlock,
  Key,
  ShieldCheck,
  ShieldPlus,
  
  // Business & Commerce icons
  Building2,
  Building,
  Factory,
  ShoppingBag,
  CreditCard,
  Store,
  Package,
  Truck,
  Wallet,
  Gift,
  
  // Education & Learning icons
  Book,
  GraduationCap,
  Briefcase,
  
  // Medical & Health icons
  Stethoscope,
  Pill,
  Hospital,
  Ambulance,
  
  // Transportation icons
  Car,
  Plane,
  Train,
  Bike,
  
  // Entertainment & Media icons
  Gamepad2,
  Music,
  Film,
  
  // Nature & Weather icons
  Sun,
  Moon,
  Cloud,
  Umbrella,
  Droplet,
  Flame,
  
  // Food & Drink icons
  Coffee,
  Utensils,
  
  // Analytics & Data icons
  LineChart,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Award,
  Star,
  
  // Utility icons
  Calendar,
  Repeat,
  Clock,
  Zap,
  Tag,
  Palette,
  Circle,
  GitBranch,
  

  // Clothing & Fashion icons
  Shirt,
  Refrigerator,
  // Aliases for backward compatibility
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
 * Get an icon component by name (alias for getIconWithFallback with FileText fallback)
 * This matches the API from config/navigation.ts for compatibility
 * @param iconName - The name of the icon
 * @returns The icon component or FileText as fallback
 */
export function getIconComponent(iconName: string): LucideIcon {
  return getIconWithFallback(iconName, FileText)
}

/**
 * Export ICON_MAP as alias for ICON_REGISTRY for backward compatibility
 */
export const ICON_MAP = ICON_REGISTRY

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
