import type { Metadata } from 'next'
import '@/globals.css'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { locales } from '@/i18n/request'
import { AuthProvider } from '@/components/auth/AuthProvider'
import LocaleProvider from '@/components/LocaleProvider'
import PageLayout from '@/components/layout/PageLayout'
import { ToastProvider } from '@/components/ui/toast'

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
