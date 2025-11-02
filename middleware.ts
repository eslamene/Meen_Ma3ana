import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n/request';
import { addCorrelationId } from './src/lib/correlation';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, shouldRateLimit, getRateLimitConfig } from './src/lib/middleware/rateLimit';
import { createServerClient } from '@supabase/ssr';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales: locales,
  
  // Used when no locale matches
  defaultLocale: defaultLocale,
  
  // Always show the locale in the URL
  localePrefix: 'always'
});

export default async function middleware(request: NextRequest) {
  // Add correlation ID to all requests
  const requestWithCorrelationId = addCorrelationId(request);
  
  // Prelaunch guard - block app routes if PRELAUNCH=true
  const isPrelaunch = process.env.PRELAUNCH === 'true'
  if (isPrelaunch) {
    const pathname = requestWithCorrelationId.nextUrl.pathname
    
    // Allow landing pages and static assets
    const isLanding = pathname.includes('/landing')
    const isStaticAsset = pathname.startsWith('/_next/') || 
                         pathname.startsWith('/_static/') ||
                         pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/)
    
    // Block app routes (except landing and assets)
    if (!isLanding && !isStaticAsset && !pathname.startsWith('/api/contact')) {
      const locale = pathname.split('/')[1] || defaultLocale
      const landingUrl = new URL(`/${locale}/landing`, requestWithCorrelationId.url)
      return NextResponse.redirect(landingUrl)
    }
  }
  
  // Create response to handle auth session refresh
  let response = NextResponse.next({
    request: requestWithCorrelationId,
  });
  
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
  if (intlResponse instanceof Response) {
    response.cookies.getAll().forEach(cookie => {
      intlResponse.headers.append('Set-Cookie', `${cookie.name}=${cookie.value}`);
    });
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