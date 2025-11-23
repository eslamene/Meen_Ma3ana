'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function VerifyEmailPage() {
  const t = useTranslations('auth')
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const [checking, setChecking] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/auth/login`)
      return
    }

    if (user) {
      checkVerificationStatus()
    }
  }, [user, authLoading, router, locale])

  const checkVerificationStatus = async () => {
    if (!user) return

    try {
      setChecking(true)
      // Refresh user data to get latest email_confirmed_at
      const { data: { user: updatedUser } } = await supabase.auth.getUser()
      
      if (updatedUser?.email_confirmed_at) {
        setIsVerified(true)
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push(`/${locale}/dashboard`)
        }, 2000)
      } else {
        setIsVerified(false)
      }
    } catch (error) {
      console.error('Error checking verification status:', error)
      setIsVerified(false)
    } finally {
      setChecking(false)
    }
  }

  const handleResendVerification = async () => {
    if (!user?.email) return

    try {
      setResending(true)
      setResendSuccess(false)

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email
      })

      if (error) {
        throw error
      }

      setResendSuccess(true)
    } catch (error) {
      console.error('Error resending verification email:', error)
    } finally {
      setResending(false)
    }
  }

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('loading') || 'Loading...'}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {t('emailVerified') || 'Email Verified!'}
            </CardTitle>
            <CardDescription>
              {t('emailVerifiedMessage') || 'Your email has been successfully verified. Redirecting to dashboard...'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 rounded-full p-3">
              <Mail className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {t('verifyEmailTitle') || 'Verify Your Email'}
          </CardTitle>
          <CardDescription>
            {t('verifyEmailDescription') || 'Please verify your email address to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              {t('verifyEmailInstructions') || 'We sent a verification email to:'}
            </p>
            <p className="text-sm font-semibold text-blue-900">
              {user.email}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">
                  {t('checkSpamFolder') || 'Check your spam folder'}
                </p>
                <p>
                  {t('spamFolderMessage') || 'If you don\'t see the email, check your spam or junk folder.'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleResendVerification}
              disabled={resending || resendSuccess}
              className="w-full"
              variant="outline"
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('sending') || 'Sending...'}
                </>
              ) : resendSuccess ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('emailSent') || 'Email Sent!'}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t('resendVerificationEmail') || 'Resend Verification Email'}
                </>
              )}
            </Button>

            <Button
              onClick={checkVerificationStatus}
              disabled={checking}
              className="w-full"
              variant="secondary"
            >
              {checking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('checking') || 'Checking...'}
                </>
              ) : (
                <>
                  {t('checkVerificationStatus') || 'Check Verification Status'}
                </>
              )}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Link href={`/${locale}/auth/login`}>
              <Button variant="ghost" className="w-full">
                {t('backToLogin') || 'Back to Login'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

