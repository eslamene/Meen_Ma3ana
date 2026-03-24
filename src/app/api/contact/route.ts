import { NextRequest, NextResponse } from 'next/server'
import { contactRateLimit } from '@/lib/middleware/rateLimit'
import { createClient } from '@/lib/supabase/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { contactSchema, validateRequestBody } from '@/lib/validation/schemas'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { logger, supabase } = context
  
  // Apply rate limiting using the centralized contact config
  const rateLimitResponse = contactRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const body = await request.json()

  // Validate input using Zod schema
  let validatedData
  try {
    validatedData = validateRequestBody(contactSchema, body)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Validation failed'
    logger.warn('Contact form validation failed', { error: errorMessage, body })
    throw new ApiError('VALIDATION_ERROR', errorMessage, 400)
  }

  const { name, email, message } = validatedData

  // Store in Supabase (gracefully handle missing table)
  try {
    const { ContactService } = await import('@/lib/services/contactService')
    
    // Try to insert into landing_contacts table
    // If table doesn't exist, we'll log it but still return success
    await ContactService.createGraceful(supabase, {
      name,
      email,
      message
    })
  } catch (dbError) {
    // If Supabase client creation fails or table doesn't exist, log it
    logger.warn('Contact storage error (may need to create landing_contacts table)', { error: dbError })
    // Continue - we'll still return success to user
  }

  return NextResponse.json(
    { success: true, message: 'Message sent successfully' },
    { status: 200 }
  )
}

export const POST = createPostHandler(handler, { loggerContext: 'api/contact' })
