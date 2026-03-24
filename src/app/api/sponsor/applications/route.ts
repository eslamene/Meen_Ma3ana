import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

  try {
    const { UserService } = await import('@/lib/services/userService')
    const { SponsorApplicationService } = await import('@/lib/services/sponsorApplicationService')

    // Check if user is already a sponsor
    const existingUser = await UserService.getById(supabase, user.id)
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
    const application = await SponsorApplicationService.create(supabase, {
      userId: user.id,
      companyName,
      contactPerson,
      email,
      phone,
      website,
      companyDescription,
      sponsorshipTier,
      status: 'pending',
    })

    return NextResponse.json({ application })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating sponsor application:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to submit application', 500)
  }
}

export const POST = createPostHandler(handler, { requireAuth: true, loggerContext: 'api/sponsor/applications' })

