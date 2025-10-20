import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from '../i18n';
import type { Locale } from '../i18n';

export default getRequestConfig(async ({ locale }) => {
  const validLocale: string = locale && locales.includes(locale as Locale) ? locale : defaultLocale;
  return {
    messages: (await import(`../../messages/${validLocale}.json`)).default,
    locale: validLocale
  };
}); 