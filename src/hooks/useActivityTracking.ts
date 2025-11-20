/**
 * Client-side Activity Tracking Hook
 * Tracks user interactions and page views on the client side
 */

'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

/**
 * Track page view
 */
async function trackPageView(path: string, userId?: string, sessionId?: string) {
  try {
    await fetch('/api/activity/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activity_type: 'page_view',
        category: 'navigation',
        action: 'view_page',
        resource_type: 'page',
        resource_path: path,
        user_id: userId,
        session_id: sessionId,
      }),
    })
  } catch (error) {
    // Silently fail - don't break the app
    console.error('Failed to track page view:', error)
  }
}

/**
 * Track user action
 */
async function trackUserAction(
  action: string,
  details?: Record<string, unknown>,
  resourceType?: string,
  resourceId?: string
) {
  try {
    await fetch('/api/activity/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        activity_type: 'user_action',
        category: 'data',
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
      }),
    })
  } catch (error) {
    // Silently fail - don't break the app
    console.error('Failed to track user action:', error)
  }
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = sessionStorage.getItem('activity_session_id')
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    sessionStorage.setItem('activity_session_id', sessionId)
  }
  return sessionId
}

/**
 * Hook to get current user
 */
function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return user
}

/**
 * Hook for tracking page views automatically
 */
export function usePageViewTracking() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const user = useCurrentUser()
  const previousPathRef = useRef<string>('')

  useEffect(() => {
    // Skip if pathname hasn't changed
    const fullPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    if (fullPath === previousPathRef.current) {
      return
    }

    previousPathRef.current = fullPath

    // Track page view
    const sessionId = getSessionId()
    trackPageView(fullPath, user?.id, sessionId)
  }, [pathname, searchParams, user])
}

/**
 * Hook for tracking user actions
 */
export function useActivityTracking() {
  const user = useCurrentUser()

  const trackAction = useCallback((
    action: string,
    details?: Record<string, unknown>,
    resourceType?: string,
    resourceId?: string
  ) => {
    const sessionId = getSessionId()
    trackUserAction(action, {
      ...details,
      user_id: user?.id,
      session_id: sessionId,
    }, resourceType, resourceId)
  }, [user])

  return { trackAction }
}

/**
 * Hook for tracking clicks on specific elements
 */
export function useClickTracking(
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>
) {
  const { trackAction } = useActivityTracking()

  const handleClick = useCallback(() => {
    trackAction(action, {
      ...details,
      interaction_type: 'click',
    }, resourceType, resourceId)
  }, [trackAction, action, resourceType, resourceId, details])

  return { handleClick }
}

/**
 * Hook for tracking form submissions
 */
export function useFormTracking(
  formName: string,
  resourceType?: string,
  resourceId?: string
) {
  const { trackAction } = useActivityTracking()

  const trackSubmit = useCallback((success: boolean, details?: Record<string, unknown>) => {
    trackAction('form_submit', {
      form_name: formName,
      success,
      ...details,
    }, resourceType, resourceId)
  }, [trackAction, formName, resourceType, resourceId])

  return { trackSubmit }
}

