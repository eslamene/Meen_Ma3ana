import { createBrowserClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export function createClient() {
  // Guard against SSR - createBrowserClient should only be called in browser
  if (typeof window === 'undefined') {
    throw new Error(
      'createClient from @/lib/supabase/client cannot be used in server components. ' +
      'Use createClient from @/lib/supabase/server instead.'
    )
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof window === 'undefined') return undefined
          return document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1]
        },
        set(name: string, value: string, options?: CookieOptions) {
          if (typeof window === 'undefined') return
          document.cookie = `${name}=${value}; path=/; ${options?.secure ? 'secure; ' : ''}${options?.sameSite ? `samesite=${options.sameSite}; ` : ''}`
        },
        remove(name: string, options?: CookieOptions) {
          if (typeof window === 'undefined') return
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; ${options?.secure ? 'secure; ' : ''}${options?.sameSite ? `samesite=${options.sameSite}; ` : ''}`
        }
      }
    }
  )
} 