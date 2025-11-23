/**
 * Get the application base URL
 * Uses NEXT_PUBLIC_APP_URL environment variable if set, otherwise falls back to window.location.origin
 * This ensures email confirmation links work correctly in production
 * 
 * IMPORTANT: For production, NEXT_PUBLIC_APP_URL must be set in your environment variables.
 * Also update the Site URL in Supabase Dashboard: Authentication > URL Configuration > Site URL
 * 
 * Note: Trailing slashes are automatically removed to prevent double slashes in URLs
 */
export function getAppUrl(): string {
  // Always prefer environment variable first (available at build time for client-side)
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  
  // Helper to normalize URL (remove trailing slash)
  const normalizeUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined
    return url.replace(/\/+$/, '') // Remove trailing slashes
  }
  
  const normalizedEnvUrl = normalizeUrl(envUrl)
  
  // In server-side or build-time, use environment variable with fallback
  if (typeof window === 'undefined') {
    return normalizedEnvUrl || 'https://meen.ma3ana.org'
  }
  
  // In client-side, use environment variable if available
  // This ensures production emails use the correct URL even if accessed from localhost
  if (normalizedEnvUrl) {
    return normalizedEnvUrl
  }
  
  // Only fall back to window.location.origin if no environment variable is set
  // This should only happen in development
  if (process.env.NODE_ENV === 'development') {
    return window.location.origin
  }
  
  // Production fallback (should not be reached if env var is set)
  return 'https://meen.ma3ana.org'
}

