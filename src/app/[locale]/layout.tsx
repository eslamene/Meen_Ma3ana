import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import dynamic from 'next/dynamic'
import { locales } from '@/i18n/request'
import LocaleProvider from '@/components/LocaleProvider'
import PageLayout from '@/components/layout/PageLayout'
import { ToastProvider } from '@/components/ui/toast'

// Dynamically import AuthProvider to avoid SSR issues
const AuthProvider = dynamic(
  () => import('@/components/auth/AuthProvider').then(mod => ({ default: mod.AuthProvider })),
  { ssr: false }
)

export const metadata: Metadata = {
  title: 'Meen Ma3ana - Charity Platform',
  description: 'A comprehensive charity management platform',
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
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
          <ToastProvider>
            <PageLayout>
              {children}
            </PageLayout>
          </ToastProvider>
        </AuthProvider>
      </LocaleProvider>
    </NextIntlClientProvider>
  )
}
