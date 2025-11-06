import { NextRequest } from 'next/server'
import { generateCorrelationId } from '@/lib/logger'

/**
 * Middleware to add correlation IDs to requests for better logging
 */
export function addCorrelationId(request: NextRequest): NextRequest {
  // Add correlation ID to request headers if not present
  if (!request.headers.get('x-correlation-id')) {
    const correlationId = generateCorrelationId()
    const headers = new Headers(request.headers)
    headers.set('x-correlation-id', correlationId)
    
    // Create new request with correlation ID header
    return new NextRequest(request.url, {
      method: request.method,
      headers,
      body: request.body,
    })
  }
  
  return request
}

/**
 * Extract correlation ID from request headers
 */
export function getCorrelationId(request: NextRequest): string | undefined {
  return request.headers.get('x-correlation-id') || undefined
}
