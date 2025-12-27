import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext, createGetHandler, createPutHandler } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { normalizePhoneNumber } from '@/lib/utils/phone'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

    // Fetch user profile data - only editable fields
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone, address, profile_image, language, updated_at')
      .eq('id', user.id)
      .single()

    if (profileError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user profile:', profileError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch user profile', 500)
    }

    return NextResponse.json({
      user: userProfile
    })
}

async function putHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

    const body = await request.json()
    const { firstName, lastName, phone, address } = body

    // Validate required fields
    if (!firstName || !lastName) {
      throw new ApiError('VALIDATION_ERROR', 'First name and last name are required', 400)
    }

    // Validate phone format if provided
    if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone)) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid phone number format', 400)
    }

    // Normalize and check phone number uniqueness
    let normalizedPhone: string | null = null
    if (phone && phone.trim()) {
      normalizedPhone = normalizePhoneNumber(phone.trim(), '+20')
      
      // Get all users with phone numbers to check normalized uniqueness
      const { data: allUsersWithPhone, error: fetchError } = await supabase
        .from('users')
        .select('id, phone')
        .neq('id', user.id)
        .not('phone', 'is', null)

      if (fetchError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching users with phones:', fetchError)
      } else if (allUsersWithPhone) {
        // Check if normalized phone matches any existing normalized phone
        for (const existingUser of allUsersWithPhone) {
          if (existingUser.phone) {
            const existingNormalized = normalizePhoneNumber(existingUser.phone, '+20')
            if (existingNormalized === normalizedPhone) {
              throw new ApiError('VALIDATION_ERROR', 'Phone number is already in use by another account', 400)
            }
          }
        }
      }

      // Also check exact match
      const { data: exactMatch, error: exactError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .neq('id', user.id)
        .maybeSingle()

      if (exactError && exactError.code !== 'PGRST116') {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking phone exact match:', exactError)
      }

      if (exactMatch) {
        throw new ApiError('VALIDATION_ERROR', 'Phone number is already in use by another account', 400)
      }
    }

    // Update user profile with normalized phone
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: normalizedPhone || null,
        address: address?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, first_name, last_name, phone, address, profile_image, language, updated_at')
      .single()

    if (updateError) {
      // Check if error is due to duplicate phone number (unique constraint violation)
      if (updateError.code === '23505') {
        if (updateError.message.includes('phone') || updateError.message.includes('users_phone_unique')) {
          throw new ApiError('VALIDATION_ERROR', 'Phone number is already in use by another account', 400)
        }
        if (updateError.message.includes('email') || updateError.message.includes('users_email_unique')) {
          throw new ApiError('VALIDATION_ERROR', 'Email is already in use by another account', 400)
        }
      }

      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating user profile:', updateError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to update user profile', 500)
    }

    return NextResponse.json({
      user: updatedUser
    })
}

export const GET = createGetHandler(getHandler, { requireAuth: true, loggerContext: 'api/profile' })
export const PUT = createPutHandler(putHandler, { requireAuth: true, loggerContext: 'api/profile' })

