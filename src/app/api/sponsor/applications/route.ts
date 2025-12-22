import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  // Check if user is already a sponsor
  const { data: existingUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (existingUser?.role === 'sponsor') {
    throw new ApiError('VALIDATION_ERROR', 'User is already a sponsor', 400)
  }

  const body = await request.json()
  const {
    companyName,
    contactPerson,
    email,
    phone,
    website,
    companyDescription,
    sponsorshipTier
  } = body

  // Validate required fields
  if (!companyName || !contactPerson || !email || !phone || !website || !companyDescription || !sponsorshipTier) {
    throw new ApiError('VALIDATION_ERROR', 'Missing required fields', 400)
  }

  // Create sponsor application
  const { data: application, error: applicationError } = await supabase
    .from('sponsor_applications')
    .insert({
      userId: user.id,
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: email.trim(),
      phone: phone.trim(),
      website: website.trim(),
      companyDescription: companyDescription.trim(),
      sponsorshipTier,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    })
    .select()
    .single()

  if (applicationError) {
    logger.error('Error creating sponsor application:', applicationError)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to submit application', 500)
  }

  return NextResponse.json({ application })
}

export const POST = createPostHandler(handler, { requireAuth: true, loggerContext: 'api/sponsor/applications' })

