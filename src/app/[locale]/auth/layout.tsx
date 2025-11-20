import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { AuthProvider } from '@/components/auth/AuthProvider'
import LocaleProvider from '@/components/LocaleProvider'

export const metadata: Metadata = {
  title: 'Meen Ma3ana - Authentication',
  description: 'Sign in or create an account',
}

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages({ locale })

  return (
    <NextIntlClientProvider messages={messages}>
      <LocaleProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </LocaleProvider>
    </NextIntlClientProvider>
  )
}

