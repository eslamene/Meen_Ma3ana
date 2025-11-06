import { createClient as createSupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// WARNING: This file is deprecated. Use @/lib/supabase/client for client-side code
// or @/lib/supabase/server for server-side code instead.
// This file is kept for backward compatibility only.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Lazy initialization - only create client when actually needed (client-side only)
let supabaseInstance: SupabaseClient | null = null

function getSupabaseInstance(): SupabaseClient {
  // Only create client in browser environment
  if (typeof window === 'undefined') {
    throw new Error(
      'Cannot use legacy supabase client in server environment. ' +
      'Use @/lib/supabase/server instead.'
    )
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey)
  }
  
  return supabaseInstance
}

// Export as getter to prevent module-level initialization
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseInstance()[prop as keyof SupabaseClient]
  }
})

// Helper function to get Supabase client with proper error handling
export const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return getSupabaseInstance()
}

// Type for database schema (will be updated when we add Drizzle)
export type Database = Record<string, unknown>

// Helper functions for common Supabase operations
export const supabaseHelpers = {
  // Auth helpers
  auth: {
    signUp: async (email: string, password: string) => {
      return await supabase.auth.signUp({ email, password })
    },
    signIn: async (email: string, password: string) => {
      return await supabase.auth.signInWithPassword({ email, password })
    },
    signOut: async () => {
      return await supabase.auth.signOut()
    },
    getCurrentUser: async () => {
      return await supabase.auth.getUser()
    }
  },
  
  // Storage helpers
  storage: {
    uploadFile: async (bucket: string, path: string, file: File) => {
      return await supabase.storage.from(bucket).upload(path, file)
    },
    getPublicUrl: (bucket: string, path: string) => {
      return supabase.storage.from(bucket).getPublicUrl(path)
    },
    deleteFile: async (bucket: string, path: string) => {
      return await supabase.storage.from(bucket).remove([path])
    }
  },
  
  // Realtime helpers
  realtime: {
    subscribe: (channel: string, callback: (payload: unknown) => void) => {
      return supabase.channel(channel).on('postgres_changes', { event: '*', schema: 'public' }, callback).subscribe()
    },
    unsubscribe: (subscription: RealtimeChannel) => {
      return supabase.removeChannel(subscription)
    }
  }
} 