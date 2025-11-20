/**
 * API Activity Logger Wrapper
 * Wraps API route handlers to automatically log API calls
 */

import { NextRequest, NextResponse } from 'next/server'
import { ActivityService, extractRequestInfo, generateSessionId } from '@/lib/services/activityService'
import { createClient } from '@/lib/supabase/server'

/**
 * Get or create session ID from cookies
 */
function getSessionId(request: Request): string {
  const cookies = request.headers.get('cookie') || ''
  const sessionMatch = cookies.match(/session_id=([^;]+)/)
  
  if (sessionMatch) {
    return sessionMatch[1]
  }
  
  return generateSessionId()
}

/**
 * Wraps an API route handler to automatically log API calls
 */
export function withActivityLogging<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now()
    let response: NextResponse
    
    try {
      // Execute the handler
      response = await handler(request, ...args)
      
      // Log the API call after response is created
      const duration = Date.now() - startTime
      const pathname = request.nextUrl.pathname
      const method = request.method
      const statusCode = response.status
      
      // Log asynchronously without blocking
      logApiCall(request, method, pathname, statusCode, duration).catch(error => {
        // Silently fail - don't break the request
        console.error('Failed to log API call:', error)
      })
      
      return response
    } catch (error) {
      // Log error
      const duration = Date.now() - startTime
      const pathname = request.nextUrl.pathname
      const method = request.method
      
      // Log error asynchronously
      logApiCall(request, method, pathname, 500, duration, error).catch(err => {
        console.error('Failed to log API error:', err)
      })
      
      // Re-throw the error
      throw error
    }
  }
}

/**
 * Log API call activity (non-blocking)
 */
async function logApiCall(
  request: NextRequest,
  method: string,
  pathname: string,
  statusCode: number,
  duration?: number,
  error?: unknown
): Promise<void> {
  try {
    // Get user if authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const sessionId = getSessionId(request)
    const { ipAddress, userAgent } = extractRequestInfo(request)
    
    // Determine severity based on status code and errors
    let severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
    if (statusCode >= 500) {
      severity = error ? 'critical' : 'error'
    } else if (statusCode >= 400) {
      severity = 'warning'
    }
    
    // Log the API call
    await ActivityService.logApiCall({
      user_id: user?.id,
      session_id: sessionId,
      method,
      path: pathname,
      status_code: statusCode,
      ip_address: ipAddress,
      user_agent: userAgent,
      details: error ? {
        error: error instanceof Error ? error.message : String(error),
      } : undefined,
      metadata: {
        timestamp: new Date().toISOString(),
        duration_ms: duration,
      },
    })
  } catch (error) {
    // Silently fail - don't break the request
    console.error('Error in logApiCall:', error)
  }
}

