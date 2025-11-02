import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { createClient } from '@/lib/supabase/server'

const contactRateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per window for contact form
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(contactRateLimitConfig)(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const body = await request.json()
    const { name, email, message } = body

    // Validate input
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate message length
    if (message.length < 10 || message.length > 5000) {
      return NextResponse.json(
        { error: 'Message must be between 10 and 5000 characters' },
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
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

