import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['en', 'ar'] as const
export const defaultLocale = 'ar' as const

export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ locale }: { locale?: string }) => {
  const validLocale: string = locale && locales.includes(locale as Locale) ? locale : defaultLocale;
  return {
      messages: (await import(`../../messages/${validLocale}.json`)).default,
      locale: validLocale
  };
}); 