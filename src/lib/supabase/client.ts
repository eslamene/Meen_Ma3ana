import { createBrowserClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/config/env'

// Create a no-op client for SSR
// Using unknown for database schema types since we don't have a typed schema
function createNoOpClient(): SupabaseClient<any, string, any> {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
    },
  } as any as SupabaseClient<any, string, any>
}

let clientInstance: SupabaseClient<any, string, any> | null = null

export function createClient() {
  // Guard against SSR - return no-op client during SSR
  if (typeof window === 'undefined') {
    if (!clientInstance) {
      clientInstance = createNoOpClient()
    }
    return clientInstance
  }

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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