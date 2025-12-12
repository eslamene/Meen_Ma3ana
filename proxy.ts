import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/i18n/request';
import { addCorrelationId } from '@/lib/correlation';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, shouldRateLimit, getRateLimitConfig } from '@/lib/middleware/rateLimit';
import { createServerClient } from '@supabase/ssr';

// Pin proxy to Node.js runtime for Supabase SSR compatibility
export const runtime = 'nodejs';

/**
 * Detects the user's preferred locale from the Accept-Language header
 * Maps browser language preferences to supported locales, handling variants
 * (e.g., ar-SA -> ar, en-US -> en)
 */
function detectUserLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language');
  
  if (!acceptLanguage) {
    return defaultLocale;
  }

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,ar-SA;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [locale, qValue] = lang.trim().split(';');
      const quality = qValue ? parseFloat(qValue.split('=')[1]) : 1.0;
      return { locale: locale.toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality); // Sort by quality (preference)

  // Check each language preference
  for (const { locale } of languages) {
    // Check for exact match
    if (locales.includes(locale as typeof locales[number])) {
      return locale;
    }
    
    // Check for Arabic variants (ar-SA, ar-EG, ar-AE, etc.)
    if (locale.startsWith('ar')) {
      return 'ar';
    }
    
    // Check for English variants (en-US, en-GB, etc.)
    if (locale.startsWith('en')) {
      return 'en';
    }
  }

  // Fallback to default locale
  return defaultLocale;
}

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales: locales,
  
  // Used when no locale matches
  defaultLocale: defaultLocale,
  
  // Always show the locale in the URL
  localePrefix: 'always',
  
  // Enable automatic locale detection from Accept-Language header
  // The proxy will use our custom detection logic via manual handling
  localeDetection: true
});

export default async function proxy(request: NextRequest) {
  // Add correlation ID to all requests
  const requestWithCorrelationId = addCorrelationId(request);
  
  // Normalize Accept-Language header to handle language variants
  // This ensures Arabic variants (ar-SA, ar-EG, etc.) and English variants (en-US, en-GB, etc.)
  // are properly detected by the intl middleware
  const acceptLanguage = requestWithCorrelationId.headers.get('accept-language');
  if (acceptLanguage) {
    // Normalize language codes: replace variants with base language codes
    // e.g., "ar-SA,ar;q=0.9" -> "ar,ar;q=0.9" and "en-US,en;q=0.8" -> "en,en;q=0.8"
    const normalizedAcceptLanguage = acceptLanguage
      .split(',')
      .map(lang => {
        const [locale, qValue] = lang.trim().split(';');
        const baseLocale = locale.toLowerCase();
        
        // Map language variants to base codes
        if (baseLocale.startsWith('ar')) {
          return `ar${qValue ? `;${qValue}` : ''}`;
        }
        if (baseLocale.startsWith('en')) {
          return `en${qValue ? `;${qValue}` : ''}`;
        }
        // Keep other languages as-is
        return lang.trim();
      })
      .join(', ');
    
    // Update the header with normalized language codes
    requestWithCorrelationId.headers.set('accept-language', normalizedAcceptLanguage);
  }
  
  // Prelaunch guard - block app routes if PRELAUNCH=true
  const isPrelaunch = process.env.PRELAUNCH === 'true'
  if (isPrelaunch) {
    const pathname = requestWithCorrelationId.nextUrl.pathname
    
    // Extract locale from pathname (first segment after /)
    const pathSegments = pathname.split('/').filter(Boolean);
    const firstSegment = pathSegments[0] || '';
    // Use detected locale for prelaunch mode
    const locale = locales.includes(firstSegment as typeof locales[number]) 
      ? firstSegment 
      : detectUserLocale(requestWithCorrelationId);
    
    // Explicit allowlist for prelaunch mode
    const isLandingRoute = pathname === `/${locale}/landing` || pathname === '/landing';
    const isContactApi = pathname === '/api/contact';
    const isStaticAsset = pathname.startsWith('/_next/') || 
                         pathname.startsWith('/_static/') ||
                         pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/)
    
    // Block app routes (except landing and assets)
    if (!isLandingRoute && !isStaticAsset && !isContactApi) {
      const landingUrl = new URL(`/${locale}/landing`, requestWithCorrelationId.url)
      return NextResponse.redirect(landingUrl)
    }
  }
  
  // Get correlation ID for forwarding and observability
  const correlationId = requestWithCorrelationId.headers.get('x-correlation-id');
  
  // Construct headers from request with correlation ID properly set
  const headers = new Headers(requestWithCorrelationId.headers);
  if (correlationId) {
    headers.set('x-correlation-id', correlationId);
  }
  
  // Create response to handle auth session refresh
  const response = NextResponse.next({
    request: { headers },
  });
  
  // Set correlation ID on response headers for observability
  if (correlationId) {
    response.headers.set('x-correlation-id', correlationId);
  }
  
  // Refresh Supabase authentication session
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return requestWithCorrelationId.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              requestWithCorrelationId.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Refresh session if expired - required for Server Components
    await supabase.auth.getUser();
  } catch (error) {
    // If auth refresh fails, continue without throwing
    console.error('Auth refresh error:', error);
  }
  
  // Apply rate limiting for API routes
  if (requestWithCorrelationId.nextUrl.pathname.startsWith('/api/')) {
    if (shouldRateLimit(requestWithCorrelationId.nextUrl.pathname)) {
      const config = getRateLimitConfig(requestWithCorrelationId.nextUrl.pathname);
      const rateLimitResponse = rateLimit(config)(requestWithCorrelationId);
      
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }
  }
  
  // Apply internationalization middleware
  const intlResponse = intlMiddleware(requestWithCorrelationId);
  
  // Merge cookies from auth refresh into intl response
  // Use getAll() and preserve full cookie attributes via toString()
  if (intlResponse instanceof Response) {
    response.cookies.getAll().forEach(cookie => {
      // Preserve all cookie attributes (path, domain, secure, httpOnly, etc.)
      intlResponse.headers.append('Set-Cookie', cookie.toString());
    });
    
    // Track page views for visitors and authenticated users (non-blocking)
    // Only track actual page routes, not API routes or static assets
    const pathname = requestWithCorrelationId.nextUrl.pathname
    const isPageRoute = !pathname.startsWith('/api/') && 
                       !pathname.startsWith('/_next/') && 
                       !pathname.startsWith('/_static/') &&
                       !pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/)
    
    if (isPageRoute) {
      // Log page view asynchronously (non-blocking) - fire and forget
      // Use setTimeout to ensure it doesn't block the response
      setTimeout(() => {
        import('@/lib/middleware/activityLogger').then(({ logPageView }) => {
          logPageView(requestWithCorrelationId, pathname).catch((error) => {
            // Log error but don't break the request
            console.error('Failed to log page view in proxy:', error)
          })
        }).catch((error) => {
          // Silently fail if import fails
          console.error('Failed to import activityLogger:', error)
        })
      }, 0)
    }
    
    return intlResponse;
  }
  
  return response;
}

export const config = {
  // Match all pathnames including API routes for correlation ID handling
  matcher: [
    // Match all pathnames except for
    // - _next (Next.js internals)
    // - _static (inside /public)
    // - all root files inside /public (e.g. favicon.ico)
    '/((?!_next|_static|.*\\..*).*)'
  ]
};




