import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { locales, defaultLocale } from '@/i18n/request'

/**
 * Detects the user's preferred locale from the Accept-Language header
 * Maps browser language preferences to supported locales, handling variants
 * (e.g., ar-SA -> ar, en-US -> en)
 */
function detectUserLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) {
    return defaultLocale
  }

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,ar-SA;q=0.8")
  const languageEntries = acceptLanguage
    .split(',')
    .map(lang => {
      const [locale, qValue] = lang.trim().split(';')
      const quality = qValue ? parseFloat(qValue.split('=')[1]) : 1.0
      return { locale: locale.toLowerCase(), quality }
    })
    .sort((a, b) => b.quality - a.quality) // Sort by quality (preference)

  // Check each language preference
  for (const { locale } of languageEntries) {
    // Check for exact match
    if (locales.includes(locale as typeof locales[number])) {
      return locale
    }
    
    // Check for Arabic variants (ar-SA, ar-EG, ar-AE, etc.)
    if (locale.startsWith('ar')) {
      return 'ar'
    }
    
    // Check for English variants (en-US, en-GB, etc.)
    if (locale.startsWith('en')) {
      return 'en'
    }
  }

  // Fallback to default locale
  return defaultLocale
}

export default async function RootPage() {
  const headersList = await headers()
  
  // Check for stored locale preference (set by next-intl middleware)
  const cookies = headersList.get('cookie')
  let storedLocale: string | null = null
  if (cookies) {
    const localeMatch = cookies.match(/NEXT_LOCALE=([^;]+)/)
    if (localeMatch && locales.includes(localeMatch[1] as typeof locales[number])) {
      storedLocale = localeMatch[1]
    }
  }
  
  // Use stored locale if available, otherwise detect from Accept-Language header
  const acceptLanguage = headersList.get('accept-language')
  const locale = storedLocale || detectUserLocale(acceptLanguage)
  
  redirect(`/${locale}/landing`)
} 