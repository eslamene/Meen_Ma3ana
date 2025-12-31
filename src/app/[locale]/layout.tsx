import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { locales } from '@/i18n/request'
import { AuthProvider } from '@/components/auth/AuthProvider'
import LocaleProvider from '@/components/LocaleProvider'
import { LayoutProvider } from '@/components/layout/LayoutProvider'
import PageLayout from '@/components/layout/PageLayout'
import { PushNotificationProvider } from '@/components/notifications/PushNotificationProvider'

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
          <LayoutProvider defaultVariant="boxed" persist={true}>
            <PageLayout>
              {children}
            </PageLayout>
            <PushNotificationProvider />
          </LayoutProvider>
        </AuthProvider>
      </LocaleProvider>
    </NextIntlClientProvider>
  )
}
