/**
 * Activity Logger Middleware Utilities
 * Utilities for logging activities from middleware and API routes
 */

import { ActivityService, extractRequestInfo, generateSessionId } from '@/lib/services/activityService'
import { createClient } from '@/lib/supabase/server'

/**
 * Get or create session ID from cookies
 */
export function getSessionId(request: Request): string {
  const cookies = request.headers.get('cookie') || ''
  const sessionMatch = cookies.match(/session_id=([^;]+)/)
  
  if (sessionMatch) {
    return sessionMatch[1]
  }
  
  // Generate new session ID if not found
  const newSessionId = generateSessionId()
  return newSessionId
}

/**
 * Log page view activity (non-blocking)
 */
export async function logPageView(request: Request, pathname: string): Promise<void> {
  try {
    // Get user if authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const sessionId = getSessionId(request)
    const { ipAddress, userAgent, referer } = extractRequestInfo(request)
    
    // Log asynchronously without blocking
    ActivityService.logPageView({
      user_id: user?.id,
      session_id: sessionId,
      path: pathname,
      referer,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    }).catch(error => {
      // Silently fail - don't break the request
      console.error('Failed to log page view:', error)
    })
  } catch (error) {
    // Silently fail - don't break the request
    console.error('Error in logPageView:', error)
  }
}

/**
 * Log API call activity (non-blocking)
 */
export async function logApiCall(
  request: Request, 
  method: string, 
  pathname: string, 
  statusCode: number
): Promise<void> {
  try {
    // Get user if authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const sessionId = getSessionId(request)
    const { ipAddress, userAgent } = extractRequestInfo(request)
    
    // Log asynchronously without blocking
    ActivityService.logApiCall({
      user_id: user?.id,
      session_id: sessionId,
      method,
      path: pathname,
      status_code: statusCode,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    }).catch(error => {
      // Silently fail - don't break the request
      console.error('Failed to log API call:', error)
    })
  } catch (error) {
    // Silently fail - don't break the request
    console.error('Error in logApiCall:', error)
  }
}

