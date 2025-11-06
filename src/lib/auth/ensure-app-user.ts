import { db , users} from '@/lib/db'
import { defaultLogger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/client'

type AuthUser = { id: string; email: string | null }

/**
 * Ensure there is a corresponding row in public.users for the given auth user.
 * Returns the users.id that should be used as donor_id/owner_id in app tables.
 */
export async function ensureAppUser(authUser: AuthUser): Promise<string> {
  const authUserId = authUser.id
  const email = authUser.email ?? `${authUserId}@placeholder.local`

  // Preferred path: upsert via service role (no selects, bypasses RLS)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supa = createClient()
    await supa.from('users').upsert({ id: authUserId, email }, { onConflict: 'id' })
    return authUserId
  }

  // Fallback path if service key not present: best-effort insert ignoring conflicts
  try {
    await db.insert(users).values({ id: authUserId, email }).onConflictDoNothing()
  } catch (error) {
    defaultLogger.error('Error ensuring app user:', error)
    // ignore; may fail under restricted environments
  }
  
  return authUserId
}

