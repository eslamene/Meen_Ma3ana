import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale } from '@/i18n/request'
import { adminService } from '@/lib/admin/service'
import { defaultLogger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params
  const requestUrl = new URL(request.url)
  
  // Log ALL incoming parameters at the very start for debugging
  console.log('🚀 Callback route hit:', {
    fullUrl: requestUrl.toString(),
    pathname: requestUrl.pathname,
    search: requestUrl.search,
    hash: requestUrl.hash || '(none)',
    allSearchParams: Object.fromEntries(requestUrl.searchParams.entries()),
    locale,
    timestamp: new Date().toISOString()
  })
  
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type') // 'recovery' for password reset
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Validate locale
  const validLocale = locales.includes(locale as typeof locales[number]) ? locale : defaultLocale

  // Check for Supabase error in query parameters first (most common)
  const errorParam = requestUrl.searchParams.get('error')
  const errorCodeParam = requestUrl.searchParams.get('error_code')
  const errorDescParam = requestUrl.searchParams.get('error_description')
  
  if (errorParam || errorCodeParam) {
    // Supabase sent error as query parameters
    // This means Supabase failed BEFORE our code could run
    const supabaseError = errorParam || 'server_error'
    const errorCode = errorCodeParam || 'unknown'
    const errorDesc = errorDescParam ? decodeURIComponent(errorDescParam.replace(/\+/g, ' ')) : 'Error confirming user'
    
    console.error('❌ Supabase auth error from query params (Supabase failed before our code ran):', {
      error: supabaseError,
      errorCode,
      errorDescription: errorDesc,
      hasCode: !!code,
      codeLength: code?.length,
      fullUrl: requestUrl.toString(),
      allParams: Object.fromEntries(requestUrl.searchParams.entries()),
      timestamp: new Date().toISOString()
    })
    
    // If there's a code, try to exchange it anyway (might be a false positive)
    if (code) {
      console.log('⚠️ Error params present BUT code also exists - attempting exchange anyway...')
    }
    
    // Map Supabase errors to our error types
    let errorParamValue = 'auth-code-error'
    if (errorCode === 'unexpected_failure' || supabaseError === 'server_error') {
      errorParamValue = 'auth-code-error'
    } else if (errorDesc.toLowerCase().includes('expired') || errorDesc.toLowerCase().includes('invalid')) {
      errorParamValue = 'auth-code-expired'
    } else if (errorDesc.toLowerCase().includes('already been used') || errorDesc.toLowerCase().includes('already used')) {
      errorParamValue = 'auth-code-used'
    }
    
    // Clean redirect without error params
    return NextResponse.redirect(
      `${requestUrl.origin}/${validLocale}/auth/login?error=${errorParamValue}&error_description=${encodeURIComponent(errorDesc)}`
    )
  }

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
    
    // Log the code exchange attempt with full context
    console.log('🔐 Attempting to exchange code for session:', {
      hasCode: !!code,
      codeLength: code?.length,
      codePrefix: code?.substring(0, 10) + '...', // First 10 chars for debugging
      type,
      redirectUrl: requestUrl.toString(),
      origin: requestUrl.origin,
      pathname: requestUrl.pathname,
      searchParams: Object.fromEntries(requestUrl.searchParams.entries()),
      hash: requestUrl.hash || '(none)'
    })
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // Log detailed error information
      console.error('❌ Email confirmation error:', {
        message: error.message,
        status: error.status,
        name: error.name,
        code: error.code,
        fullError: JSON.stringify(error, null, 2),
        timestamp: new Date().toISOString(),
        requestUrl: requestUrl.toString()
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
      console.log('✅ Code exchange successful:', {
        userId: data.user.id,
        email: data.user.email,
        emailConfirmedAt: data.user.email_confirmed_at,
        type
      })
      
      // If this is an email confirmation (not password reset), sync email_verified and assign donor role
      if (type !== 'recovery' && data.user.email_confirmed_at) {
        // Ensure user exists in users table, then sync email_verified
        // Use upsert to handle case where user record doesn't exist yet
        // Wrap in try-catch to prevent callback failure if this update fails
        try {
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
            // Don't fail the confirmation if this update fails
            // But log it for debugging
          } else {
            // User record created/updated successfully, now assign donor role
            try {
              // Get donor role ID
              const donorRole = await adminService.getRoleByName('donor')
              if (donorRole) {
                const roleAssigned = await adminService.assignRoleToUser(
                  data.user.id,
                  donorRole.id,
                  data.user.id // assigned by themselves (system)
                )
                if (roleAssigned) {
                  console.log('✅ Donor role assigned to user:', data.user.id)
                } else {
                  defaultLogger.warn('Failed to assign donor role to user:', data.user.id)
                }
              } else {
                defaultLogger.warn('Donor role not found - cannot assign role to user:', data.user.id)
              }
            } catch (roleError) {
              // Log but don't fail - role assignment is important but shouldn't block verification
              defaultLogger.error('Error assigning donor role:', roleError)
            }
          }
        } catch (upsertError) {
          // Catch any unexpected errors during upsert
          console.error('Unexpected error during user upsert:', upsertError)
          // Continue with redirect - don't fail the email confirmation
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