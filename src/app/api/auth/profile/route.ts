import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, user, logger } = context
  const body = await request.json().catch(() => ({} as Record<string, unknown>))

  const first_name = typeof body.first_name === 'string' ? body.first_name.trim() : ''
  const last_name = typeof body.last_name === 'string' ? body.last_name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : null
  const language = typeof body.language === 'string' ? body.language.trim() : null

  if (!first_name || !last_name) {
    throw new ApiError('VALIDATION_ERROR', 'First name and last name are required', 400)
  }

  try {
    const { error } = await supabase
      .from('users')
      .upsert(
        {
          id: user.id,
          email: email || null,
          first_name,
          last_name,
          phone,
          role: 'donor',
          language,
        },
        { onConflict: 'id' }
      )

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'auth profile upsert failed', { error })
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to save profile', 500)
    }
  } catch (e) {
    if (e instanceof ApiError) throw e
    logger.logStableError('INTERNAL_SERVER_ERROR', 'auth profile unexpected error', { error: e })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to save profile', 500)
  }

  return NextResponse.json({ success: true })
}

export const POST = createPostHandler(postHandler, {
  requireAuth: true,
  loggerContext: 'api/auth/profile',
})

