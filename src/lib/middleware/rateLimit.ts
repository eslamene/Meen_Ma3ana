import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

// Export the interface for use in other files
export type { RateLimitConfig }

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
}

const adminConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per window for admin
}

const debugConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50, // 50 requests per window for debug endpoints
}

const contactConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 requests per window for contact form
}

// Export all configs for direct use if needed
export { defaultConfig, adminConfig, debugConfig, contactConfig }

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig = defaultConfig) {
  return (request: NextRequest): NextResponse | null => {
    const ip = getClientIP(request)
    const now = Date.now()

    // Clean up old entries
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key)
      }
    }

    // Get or create rate limit entry
    let entry = rateLimitMap.get(ip)
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      }
      rateLimitMap.set(ip, entry)
    }

    // Increment counter
    entry.count++

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000 / 60} minutes.`,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, config.maxRequests - entry.count).toString(),
            'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
          }
        }
      )
    }

    // Add rate limit headers
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count).toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString())

    return null
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // NextRequest doesn't have .ip property, return 'unknown' as fallback
  return 'unknown'
}

/**
 * Rate limiting for admin endpoints
 */
export const adminRateLimit = rateLimit(adminConfig)

/**
 * Rate limiting for debug/test endpoints
 */
export const debugRateLimit = rateLimit(debugConfig)

/**
 * Rate limiting for general API endpoints
 */
export const apiRateLimit = rateLimit(defaultConfig)

/**
 * Rate limiting for contact form endpoint
 */
export const contactRateLimit = rateLimit(contactConfig)

/**
 * Check if request should be rate limited based on path
 */
export function shouldRateLimit(pathname: string): boolean {
  // Skip rate limiting for static assets
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/api/_next/') ||
      pathname.includes('.')) {
    return false
  }
  
  return true
}

/**
 * Get appropriate rate limit config based on endpoint
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Contact form endpoint - stricter limits
  if (pathname === '/api/contact') {
    return contactConfig
  }
  
  // Admin endpoints - higher limits
  if (pathname.startsWith('/api/admin/')) {
    return adminConfig
  }
  
  // Debug/test endpoints - lower limits
  if (pathname.startsWith('/api/debug/') || 
      pathname.startsWith('/api/test-')) {
    return debugConfig
  }
  
  // Default for all other API endpoints
  return defaultConfig
}
