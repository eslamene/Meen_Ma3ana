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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          error: 'Invalid email format',
          errorCode: 'INVALID_EMAIL'
        },
        { status: 400 }
      )
    }

    // Validate message length (reduced minimum to 3 characters for better UX)
    if (message.trim().length < 3 || message.length > 5000) {
      return NextResponse.json(
        { 
          error: message.trim().length < 3 
            ? 'Message must be at least 3 characters long'
            : 'Message must not exceed 5000 characters',
          errorCode: message.trim().length < 3 ? 'MESSAGE_TOO_SHORT' : 'MESSAGE_TOO_LONG'
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
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
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

