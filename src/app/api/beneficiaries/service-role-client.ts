import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { createApiError } from '@/lib/utils/api-errors'

export function getBeneficiariesServiceRoleClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw createApiError.internalError('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
