import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale } from '@/i18n/request'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type') // 'recovery' for password reset
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Validate locale
  const validLocale = locales.includes(locale as typeof locales[number]) ? locale : defaultLocale

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // Log the error for debugging
      console.error('Email confirmation error:', {
        message: error.message,
        status: error.status,
        name: error.name
      })
      
      // Handle specific error cases
      let errorParam = 'auth-code-error'
      if (error.message?.includes('expired') || error.message?.includes('invalid')) {
        errorParam = 'auth-code-expired'
      } else if (error.message?.includes('already been used')) {
        errorParam = 'auth-code-used'
      }
      
      return NextResponse.redirect(
        `${requestUrl.origin}/${validLocale}/auth/login?error=${errorParam}&error_description=${encodeURIComponent(error.message || 'Error confirming user')}`
      )
    }
    
    if (data?.user) {
      // If this is an email confirmation (not password reset), sync email_verified
      if (type !== 'recovery' && data.user.email_confirmed_at) {
        // Ensure user exists in users table, then sync email_verified
        // Use upsert to handle case where user record doesn't exist yet
        const { error: userError } = await supabase
          .from('users')
          .upsert(
            {
              id: data.user.id,
              email: data.user.email || `${data.user.id}@placeholder.local`,
              email_verified: true,
              role: 'donor'
            },
            {
              onConflict: 'id',
              ignoreDuplicates: false
            }
          )
        
        if (userError) {
          console.error('Error syncing email_verified:', userError)
          // Don't fail the confirmation if this update fails - the trigger should handle it
          // But log it for debugging
        }
      }

      // Check if this is a password reset flow by checking the 'type' parameter
      // Supabase includes type=recovery in password reset links
      if (type === 'recovery') {
        // This is a password reset session
        // Set a cookie to indicate recovery mode so navigation components can hide menu
        // Also pass type=recovery in URL so page can detect it immediately
        const response = NextResponse.redirect(`${requestUrl.origin}/${validLocale}/auth/reset-password?type=recovery`)
        response.cookies.set('recovery_mode', 'true', {
          httpOnly: false, // Need to access from client
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 15, // 15 minutes
          path: '/'
        })
        return response
      }
      
      // Regular sign in, redirect to the intended destination
      // Ensure locale is included in the redirect path
      const redirectPath = next.startsWith(`/${validLocale}/`) 
        ? next 
        : `/${validLocale}${next.startsWith('/') ? next : `/${next}`}`
      return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${requestUrl.origin}/${validLocale}/auth/login?error=auth-code-error`)
} 