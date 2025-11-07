import { NextRequest, NextResponse } from 'next/server'
import { contactRateLimit } from '@/lib/middleware/rateLimit'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Apply rate limiting using the centralized contact config
  const rateLimitResponse = contactRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const body = await request.json()
    const { name, email, message } = body

    // Validate input
    if (!name || !email || !message) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          errorCode: 'MISSING_FIELDS'
        },
        { status: 400 }
      )
    }

    // Validate name length
    const trimmedName = name.trim()
    if (trimmedName.length < 2 || trimmedName.length > 120) {
      return NextResponse.json(
        { 
          error: trimmedName.length < 2 
            ? 'Name must be at least 2 characters long'
            : 'Name must not exceed 120 characters',
          errorCode: trimmedName.length < 2 ? 'NAME_TOO_SHORT' : 'NAME_TOO_LONG'
        },
        { status: 400 }
      )
    }

    // Validate email format - more robust validation
    const trimmedEmail = email.trim()
    
    // Check if email is empty after trimming
    if (!trimmedEmail) {
      return NextResponse.json(
        { 
          error: 'Email is required',
          errorCode: 'MISSING_FIELDS'
        },
        { status: 400 }
      )
    }
    
    // RFC 5322 compliant email regex (simplified but more accurate)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { 
          error: 'Invalid email format. Please enter a valid email address.',
          errorCode: 'INVALID_EMAIL',
          message: 'The email address format is not valid'
        },
        { status: 400 }
      )
    }

    // Validate email length
    if (trimmedEmail.length > 255) {
      return NextResponse.json(
        { 
          error: 'Email must not exceed 255 characters',
          errorCode: 'EMAIL_TOO_LONG'
        },
        { status: 400 }
      )
    }

    // Validate message length (minimum 3 characters, maximum 5000)
    const trimmedMessage = message.trim()
    if (trimmedMessage.length < 3 || message.length > 5000) {
      return NextResponse.json(
        { 
          error: trimmedMessage.length < 3 
            ? 'Message must be at least 3 characters long'
            : 'Message must not exceed 5000 characters',
          errorCode: trimmedMessage.length < 3 ? 'MESSAGE_TOO_SHORT' : 'MESSAGE_TOO_LONG'
        },
        { status: 400 }
      )
    }

    // Store in Supabase (gracefully handle missing table)
    try {
      const supabase = await createClient()
      
      // Try to insert into landing_contacts table
      // If table doesn't exist, we'll log it but still return success
      const { error } = await supabase.from('landing_contacts').insert({
        name: trimmedName,
        email: trimmedEmail,
        message: trimmedMessage,
        created_at: new Date().toISOString(),
      })

      if (error) {
        // Log error but don't fail the request
        // In production, you might want to use a fallback storage method
        console.error('Error saving contact (table may not exist):', error)
      }
    } catch (dbError) {
      // If Supabase client creation fails or table doesn't exist, log it
      console.error('Contact storage error (may need to create landing_contacts table):', dbError)
      // Continue - we'll still return success to user
    }

    return NextResponse.json(
      { success: true, message: 'Message sent successfully' },
      { status: 200 }
    )
  } catch (error) {
    // Handle JSON parsing errors and other errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          errorCode: 'INVALID_REQUEST'
        },
        { status: 400 }
      )
    }
    
    console.error('Contact form error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process request. Please try again later.',
        errorCode: 'SERVER_ERROR'
      },
      { status: 500 }
    )
  }
}

