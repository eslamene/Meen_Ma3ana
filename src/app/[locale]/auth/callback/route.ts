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

  // Check for Supabase error in URL fragment (from Supabase redirect)
  const urlFragment = requestUrl.hash
  if (urlFragment && urlFragment.includes('error=')) {
    // Supabase added an error to the URL fragment
    // Extract error details
    const errorMatch = urlFragment.match(/error=([^&]+)/)
    const errorCodeMatch = urlFragment.match(/error_code=([^&]+)/)
    const errorDescMatch = urlFragment.match(/error_description=([^&]+)/)
    
    const supabaseError = errorMatch ? decodeURIComponent(errorMatch[1]) : 'server_error'
    const errorCode = errorCodeMatch ? decodeURIComponent(errorCodeMatch[1]) : 'unknown'
    const errorDesc = errorDescMatch ? decodeURIComponent(errorDescMatch[1].replace(/\+/g, ' ')) : 'Error confirming user'
    
    console.error('Supabase auth error from URL fragment:', {
      error: supabaseError,
      errorCode,
      errorDescription: errorDesc,
      fullUrl: requestUrl.toString()
    })
    
    // Map Supabase errors to our error types
    let errorParam = 'auth-code-error'
    if (errorCode === 'unexpected_failure' || supabaseError === 'server_error') {
      errorParam = 'auth-code-error'
    } else if (errorDesc.toLowerCase().includes('expired') || errorDesc.toLowerCase().includes('invalid')) {
      errorParam = 'auth-code-expired'
    } else if (errorDesc.toLowerCase().includes('already been used') || errorDesc.toLowerCase().includes('already used')) {
      errorParam = 'auth-code-used'
    }
    
    // Clean redirect without fragment
    return NextResponse.redirect(
      `${requestUrl.origin}/${validLocale}/auth/login?error=${errorParam}&error_description=${encodeURIComponent(errorDesc)}`
    )
  }

  if (code) {
    const supabase = await createClient()
    
    // Log the code exchange attempt
    console.log('Attempting to exchange code for session:', {
      hasCode: !!code,
      codeLength: code?.length,
      type,
      redirectUrl: requestUrl.toString()
    })
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // Log detailed error information
      console.error('Email confirmation error:', {
        message: error.message,
        status: error.status,
        name: error.name,
        code: error.code,
        fullError: JSON.stringify(error, null, 2)
      })
      
      // Handle specific error cases
      let errorParam = 'auth-code-error'
      if (error.message?.includes('expired') || error.message?.includes('invalid')) {
        errorParam = 'auth-code-expired'
      } else if (error.message?.includes('already been used') || error.message?.includes('already used')) {
        errorParam = 'auth-code-used'
      } else if (error.status === 400) {
        // Bad request - likely invalid code
        errorParam = 'auth-code-expired'
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