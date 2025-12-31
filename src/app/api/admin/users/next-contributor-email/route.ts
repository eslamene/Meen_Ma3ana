import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { normalizePhoneNumber, extractCountryCode } from '@/lib/utils/phone'

/**
 * GET /api/admin/users/next-contributor-email
 * Get the next available contributor email
 * If phone is provided: generates {phone}@ma3ana.org
 * Otherwise: generates contributor{number}@ma3ana.org with next available number
 */
async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')?.trim()

    // Create service role client for admin operations
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
      throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
    }

    const serviceRoleClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch all users to check existing emails
    const allUsers = []
    let authPage = 1
    const perPage = 1000

    while (true) {
      const { data: authUsersPage, error: usersError } = await serviceRoleClient.auth.admin.listUsers({
        page: authPage,
        perPage
      })

      if (usersError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching users:', usersError)
        throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to fetch users: ${usersError.message}`, 500)
      }

      if (!authUsersPage?.users || authUsersPage.users.length === 0) {
        break
      }

      allUsers.push(...authUsersPage.users)

      if (authUsersPage.users.length < perPage) {
        break
      }

      authPage++
    }

    // If phone is provided, generate phone-based email
    if (phone) {
      // Normalize phone and extract number part for email
      const normalizedPhone = normalizePhoneNumber(phone.trim(), '+20')
      const { countryCode, number } = extractCountryCode(phone.trim(), '+20')
      
      // Format phone for email based on country code
      let phoneForEmail: string
      
      if (countryCode === '+20') {
        // Egyptian number: ensure it starts with 0 (e.g., 01012345678)
        phoneForEmail = number.length === 10 && number.startsWith('1') 
          ? '0' + number 
          : number.startsWith('0') 
            ? number 
            : '0' + number
      } else {
        // International number: use the number part without country code
        // Remove country code from normalized phone
        phoneForEmail = normalizedPhone.replace(/^\+\d{1,3}/, '')
        // Remove leading zeros for international numbers
        phoneForEmail = phoneForEmail.replace(/^0+/, '')
      }

      const phoneEmail = `${phoneForEmail}@ma3ana.org`

      // Check if this email already exists
      const emailExists = allUsers.some(user => 
        user.email && user.email.toLowerCase() === phoneEmail.toLowerCase()
      )

      if (emailExists) {
        throw new ApiError('VALIDATION_ERROR', `Email ${phoneEmail} already exists`, 400)
      }

      logger.info('Generated phone-based email', { email: phoneEmail, phone })

      return NextResponse.json({
        email: phoneEmail,
        type: 'phone'
      })
    }

    // Otherwise, generate contributor email
    // Extract numbers from both patterns:
    // 1. contributor0001@ma3ana.org (contributor pattern)
    // 2. 0084@ma3ana.org (numeric pattern)
    const contributorPattern = /^contributor(\d+)@ma3ana\.org$/i
    const numericPattern = /^(\d{4})@ma3ana\.org$/i
    const existingNumbers: number[] = []

    for (const user of allUsers) {
      if (!user.email) continue
      
      const email = user.email.toLowerCase()
      
      // Check contributor pattern: contributor0001@ma3ana.org
      const contributorMatch = email.match(contributorPattern)
      if (contributorMatch && contributorMatch[1]) {
        const number = parseInt(contributorMatch[1], 10)
        if (!isNaN(number)) {
          existingNumbers.push(number)
        }
      }
      
      // Check numeric pattern: 0084@ma3ana.org (4 digits)
      const numericMatch = email.match(numericPattern)
      if (numericMatch && numericMatch[1]) {
        const number = parseInt(numericMatch[1], 10)
        if (!isNaN(number)) {
          existingNumbers.push(number)
        }
      }
    }

    // Find the next available number
    // Use the highest number found + 1 (don't fill gaps to avoid conflicts)
    let nextNumber = 1
    if (existingNumbers.length > 0) {
      const maxNumber = Math.max(...existingNumbers)
      nextNumber = maxNumber + 1
    }

    // Format the number with leading zeros (4 digits: 0001, 0002, etc.)
    let formattedNumber = nextNumber.toString().padStart(4, '0')
    let nextEmail = `contributor${formattedNumber}@ma3ana.org`

    // Double-check that this email doesn't exist (safety check)
    let emailExists = allUsers.some(user => 
      user.email && user.email.toLowerCase() === nextEmail.toLowerCase()
    )

    // If it exists, keep incrementing until we find an available one
    while (emailExists) {
      nextNumber++
      formattedNumber = nextNumber.toString().padStart(4, '0')
      nextEmail = `contributor${formattedNumber}@ma3ana.org`
      emailExists = allUsers.some(user => 
        user.email && user.email.toLowerCase() === nextEmail.toLowerCase()
      )
    }

    logger.info('Generated next contributor email', { nextEmail, nextNumber })

    return NextResponse.json({
      email: nextEmail,
      number: nextNumber,
      type: 'contributor'
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error generating next contributor email:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to generate next contributor email', 500)
  }
}

export const GET = createGetHandler(getHandler, {
  requireAuth: true,
  requireAdmin: true,
  loggerContext: 'api/admin/users/next-contributor-email'
})

