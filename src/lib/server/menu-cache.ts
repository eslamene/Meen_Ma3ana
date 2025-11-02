import { cache } from 'react'
import { getMenuModules } from './menu'
import { createClient } from '@/lib/supabase/server'

/**
 * Cached version of getMenuModules for better performance
 * This will cache the result for the duration of the request
 */
export const getCachedMenuModules = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  return getMenuModules(user)
})

/**
 * Get menu modules with user context
 * This is useful when you need to pass user data explicitly
 */
export const getMenuModulesWithUser = cache(async (user: { id: string; email?: string } | null) => {
  return getMenuModules(user)
})
