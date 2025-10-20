'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AuthForm from '@/components/auth/AuthForm'

export default function LoginPage() {
  const t = useTranslations('auth')
  const params = useParams()
  const locale = params.locale as string

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('signInToAccount')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('or')}{' '}
            <Link href={`/${locale}/auth/register`} className="font-medium text-blue-600 hover:text-blue-500">
              {t('createNewAccount')}
            </Link>
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <AuthForm mode="login" />
          
          <div className="text-center">
            <Link href={`/${locale}/auth/forgot-password`} className="text-sm text-blue-600 hover:text-blue-500">
              {t('forgotPassword')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 