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
    
    if (!error && data?.user) {
      // If this is an email confirmation (not password reset), sync email_verified
      if (type !== 'recovery' && data.user.email_confirmed_at) {
        // Sync email_verified in users table when email is confirmed
        await supabase
          .from('users')
          .update({ email_verified: true })
          .eq('id', data.user.id)
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
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${requestUrl.origin}/${validLocale}/auth/login?error=auth-code-error`)
} 