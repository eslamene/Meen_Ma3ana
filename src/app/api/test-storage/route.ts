import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Test if the URL is accessible
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' })
      
      return NextResponse.json({
        url: imageUrl,
        accessible: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })
    } catch (error) {
      return NextResponse.json({
        url: imageUrl,
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

  } catch (error) {
    console.error('Storage test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 