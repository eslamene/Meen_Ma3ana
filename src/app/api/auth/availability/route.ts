import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context
  const { searchParams } = new URL(request.url)

  const email = (searchParams.get('email') || '').trim().toLowerCase()
  const phone = (searchParams.get('phone') || '').trim()

  let emailExists: boolean | null = null
  let phoneExists: boolean | null = null

  try {
    if (email) {
      const { data, error } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
      if (error && error.code !== 'PGRST116') {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'availability email check failed', { error })
      } else {
        emailExists = Boolean(data)
      }
    }

    if (phone) {
      const { data, error } = await supabase.from('users').select('id').eq('phone', phone).maybeSingle()
      if (error && error.code !== 'PGRST116') {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'availability phone check failed', { error })
      } else {
        phoneExists = Boolean(data)
      }
    }
  } catch (e) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'availability check unexpected error', { error: e })
  }

  return NextResponse.json({ emailExists, phoneExists })
}

export const GET = createGetHandler(getHandler, {
  requireAuth: false,
  loggerContext: 'api/auth/availability',
})

