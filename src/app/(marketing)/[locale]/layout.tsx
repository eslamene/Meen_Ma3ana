import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'
import { locales } from '@/i18n/request'
import { Inter, Cairo } from 'next/font/google'
import DirSetter from '@/components/marketing/DirSetter'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

const cairo = Cairo({
  subsets: ['latin', 'arabic'],
  variable: '--font-cairo',
  display: 'swap',
  weight: ['400', '500', '600', '700']
})

export const metadata: Metadata = {
  title: 'Meen Ma3ana - Empowering Communities Through Compassionate Giving',
  description: 'A comprehensive platform for managing charitable donations, connecting donors with beneficiaries, and facilitating meaningful contributions to make a positive impact in communities.',
  keywords: ['charity', 'donations', 'community support', 'charitable platform', 'giving'],
  icons: {
    icon: [
      { url: '/icon.png', sizes: 'any' },
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Meen Ma3ana - Empowering Communities Through Compassionate Giving',
    description: 'A comprehensive platform for managing charitable donations, connecting donors with beneficiaries, and facilitating meaningful contributions.',
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'ar_EG',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Meen Ma3ana - Empowering Communities Through Compassionate Giving',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meen Ma3ana - Empowering Communities Through Compassionate Giving',
    description: 'A comprehensive platform for managing charitable donations, connecting donors with beneficiaries.',
    images: ['/opengraph-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: paramLocale } = await params
  // Priority: Use param locale first (it's from the URL segment and more reliable)
  // Then fall back to NextIntl locale if param is invalid
  const validLocale = (paramLocale && ['en', 'ar'].includes(paramLocale)) 
    ? paramLocale 
    : ((await getLocale()) || 'en')
  
  // Get messages for the current locale - explicitly pass locale to ensure correct messages
  // This is necessary because getMessages() without params might use wrong locale in route groups
  const messages = await getMessages({ locale: validLocale })
  const isRTL = validLocale === 'ar'
  
  // Debug: Log to verify messages are loaded correctly
  if (process.env.NODE_ENV === 'development') {
    console.log('[MarketingLayout] Param locale:', paramLocale, 'Valid locale:', validLocale, 'Is RTL:', isRTL)
    console.log('[MarketingLayout] Messages loaded:', !!messages, 'Has landing:', !!messages?.landing, 'Hero title:', messages?.landing?.hero?.title)
  }

  // Set font variables on the root html element
  const fontVariable = isRTL ? cairo.variable : inter.variable
  const fontClassName = isRTL ? cairo.className : inter.className

  return (
    <>
      {/* Script to set dir/lang before React hydration */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const path = window.location.pathname;
              const locale = path.split('/')[1] || 'en';
              const isRTL = locale === 'ar';
              document.documentElement.setAttribute('lang', locale);
              document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
            })();
          `,
        }}
      />
      <div 
        className={`${fontVariable} ${fontClassName}`}
        dir={isRTL ? 'rtl' : 'ltr'}
        lang={validLocale}
        suppressHydrationWarning
      >
        <DirSetter />
        <NextIntlClientProvider locale={validLocale} messages={messages}>
          <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'rtl' : 'ltr'}>
            {children}
          </div>
        </NextIntlClientProvider>
      </div>
    </>
  )
}

