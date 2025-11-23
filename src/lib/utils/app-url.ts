/**
 * Get the application base URL
 * Uses NEXT_PUBLIC_APP_URL environment variable if set, otherwise falls back to window.location.origin
 * This ensures email confirmation links work correctly in production
 */
export function getAppUrl(): string {
  // In server-side or build-time, use environment variable
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://meenma3ana.com'
  }
  
  // In client-side, prefer environment variable over window.location.origin
  // This ensures production emails use the correct URL even if accessed from localhost
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
}

