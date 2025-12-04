import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats notification count for display in badges
 * - Numbers <= 99: shows the actual number
 * - Numbers > 99: shows "99+"
 */
export function formatNotificationCount(count: number): string {
  if (count <= 0) return '0'
  if (count > 99) return '99+'
  return count.toString()
} 