import { createClient, RealtimeChannel } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to get Supabase client with proper error handling
export const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return supabase
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