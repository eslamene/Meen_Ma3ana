import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import { MenuService, type TransformedMenuModule } from '@/lib/services/menuService'

export type { TransformedMenuModule }

/**
 * Get menu modules for a user based on their permissions (server components).
 */
export async function getMenuModules(user: User | null): Promise<TransformedMenuModule[]> {
  const supabase = await createClient()
  return MenuService.getTransformedMenuModulesForUser(supabase, user)
}
