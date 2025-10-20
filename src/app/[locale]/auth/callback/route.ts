import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if this is a password reset flow
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user.app_metadata?.provider === 'email') {
        // This is a password reset session, redirect to reset password page
        return NextResponse.redirect(`${requestUrl.origin}/auth/reset-password`)
      }
      
      // Regular sign in, redirect to the intended destination
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=auth-code-error`)
} 