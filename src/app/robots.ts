import { MetadataRoute } from 'next'
import { locales } from '@/i18n/request'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://meenma3ana.com'

  // Allow indexing only for landing pages
  const allowPaths: string[] = []
  locales.forEach((locale) => {
    allowPaths.push(`/${locale}/landing`)
  })

  // Disallow app routes
  const disallowPaths = [
    '/cases',
    '/projects',
    '/auth',
    '/dashboard',
    '/admin',
    '/api',
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: allowPaths.length > 0 ? allowPaths : '/',
        disallow: disallowPaths,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

