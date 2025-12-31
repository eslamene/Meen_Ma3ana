/**
 * Centralized Icon Registry
 * 
 * This file contains all icon mappings using Phosphor Icons
 * Replaced from Lucide React to Phosphor Icons for better consistency
 * @see https://phosphoricons.com/
 */

import React from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
import {
  Gear as Settings,
  Heart,
  CurrencyDollar as DollarSign,
  Users,
  Bell,
  ChartBar as BarChart3,
  FileText,
  CreditCard,
  User,
  House as Home,
  List as Menu,
  X,
  SignOut as LogOut,
  CaretDown as ChevronDown,
  CaretRight as ChevronRight,
  Shield,
  TrendUp as TrendingUp,
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
  Envelope as Mail,
  UserPlus,
  Package,
  Circle,
  CheckSquare,
  FolderDashed as FolderKanban,
  PlusCircle,
  Calendar,
  Repeat,
  ChatCircle as MessageSquare,
  ChartLine as LineChart,
  ShieldCheck,
  ShieldPlus,
  UserGear as UserCog,
  GitBranch,
  Tag,
  MagnifyingGlass as Search,
  PencilSimple as Edit,
  Trash,
  ArrowLeft,
  Warning as AlertTriangle,
  Eye,
  EyeSlash as EyeOff,
  Palette,
  Building,
  ShoppingBag,
  Truck,
  Storefront as Store,
  Gift,
  Star,
  Trophy as Award,
  Target,
  TrendDown as TrendingDown,
  Pulse as Activity,
  Lightning as Zap,
  Flame,
  Drop as Droplet,
  Sun,
  Moon,
  Cloud,
  Umbrella,
  Coffee,
  ForkKnife as Utensils,
  Car,
  Airplane as Plane,
  Train,
  Bicycle as Bike,
  GameController as Gamepad2,
  MusicNote as Music,
  FilmStrip as Film,
  Book,
  GraduationCap,
  Briefcase,
  Stethoscope,
  Pill,
  Hospital,
  Phone,
  MapPin,
  LockOpen as Unlock,
  Key,
  UserCircle,
  UserSquare,
  UsersThree as Users2,
  UserMinus as UserX,
  CheckCircle,
  XCircle,
  Question as HelpCircle,
  WarningCircle as AlertCircle,
  Check,
  Minus,
  DotsThree as MoreHorizontal,
  DotsThreeVertical as MoreVertical,
  CaretUp as ChevronUp,
  CaretLeft as ChevronLeft,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  FloppyDisk as Save,
  ArrowClockwise as RefreshCw,
  ArrowClockwise as RotateCw,
  ArrowCounterClockwise as RotateCcw,
  Copy,
  Clipboard,
  Scissors,
  Ambulance,
  TShirt as Shirt,
  Package as Refrigerator,
  type Icon as PhosphorIcon
} from '@phosphor-icons/react'

/**
 * Icon component props interface
 * Compatible with both Lucide and Phosphor icon props
 */
export interface IconProps {
  className?: string
  size?: number | string
  color?: string
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
  [key: string]: any // Allow other props to pass through
}

/**
 * Type for icon components (Phosphor icons)
 */
export type IconComponent = React.ComponentType<IconProps>

/**
 * Type-safe icon registry mapping icon names to Phosphor icon components
 */
export const ICON_REGISTRY: Record<string, IconComponent> = {
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
  FileCheck: CheckSquare,
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
  Trash,
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
  Building,
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
  Refrigerator: Package,
  
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
  'Analytics': TrendingUp,
  
  // Additional Phosphor-specific aliases
  'Trash2': Trash,
  'Building2': Building,
} as const

/**
 * Get an icon component by name
 * @param iconName - The name of the icon
 * @returns The icon component or undefined if not found
 */
export function getIcon(iconName: string): IconComponent | undefined {
  return ICON_REGISTRY[iconName]
}

/**
 * Get an icon component by name (alias for getIconWithFallback with FileText fallback)
 * This matches the API from config/navigation.ts for compatibility
 * @param iconName - The name of the icon
 * @returns The icon component or FileText as fallback
 */
export function getIconComponent(iconName: string): IconComponent {
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
  fallback: IconComponent = Settings
): IconComponent {
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
 * Handles Phosphor icon props including weight
 */
export interface IconComponentProps extends IconProps {
  name: string
  fallback?: IconComponent
}

export function IconComponent({ 
  name, 
  fallback = Settings, 
  className = '', 
  size = 16, 
  color,
  weight = 'regular',
  ...props 
}: IconComponentProps) {
  const IconElement = getIconWithFallback(name, fallback)
  
  return React.createElement(IconElement, { 
    className,
    size: typeof size === 'string' ? parseInt(size) || 16 : size,
    color,
    weight,
    ...props 
  })
}

/**
 * Type guard to check if a string is a valid icon name
 */
export function isValidIconName(name: string): name is keyof typeof ICON_REGISTRY {
  return name in ICON_REGISTRY
}
