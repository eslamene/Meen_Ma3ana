/**
 * Dynamic Navigation System
 * Icon mapping for lucide-react icons
 * All navigation structure comes from database (navigation_items table)
 */

import {
  Home,
  Users,
  Heart,
  FileText,
  DollarSign,
  Settings,
  Shield,
  BarChart3,
  Bell,
  FileCheck,
  UserPlus,
  FolderKanban,
  PlusCircle,
  Calendar,
  Repeat,
  MessageSquare,
  LineChart,
  ShieldCheck,
  UserCog,
  GitBranch,
  type LucideIcon
} from 'lucide-react'

// Map icon names (from database) to actual Lucide React components
export const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Users,
  Heart,
  FileText,
  DollarSign,
  Settings,
  Shield,
  BarChart3,
  Bell,
  FileCheck,
  UserPlus,
  FolderKanban,
  PlusCircle,
  Calendar,
  Repeat,
  MessageSquare,
  LineChart,
  ShieldCheck,
  UserCog,
  GitBranch
}

// Helper to get icon component by name
export function getIconComponent(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || FileText // Fallback to FileText if icon not found
}
