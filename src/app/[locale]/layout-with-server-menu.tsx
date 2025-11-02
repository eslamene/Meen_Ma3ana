import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { getLocale } from 'next-intl/server'
import ServerLayout from '@/components/layout/ServerLayout'

const locales = ['en', 'ar']

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const locale = await getLocale()
  
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound()

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ServerLayout locale={locale}>
            {children}
          </ServerLayout>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
