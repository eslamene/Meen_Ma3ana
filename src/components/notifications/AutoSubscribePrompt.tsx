'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useFCMNotifications } from '@/hooks/useFCMNotifications'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, X } from 'lucide-react'
import { defaultLogger as logger } from '@/lib/logger'

interface AutoSubscribePromptProps {
  /**
   * Delay in milliseconds before showing the prompt (default: 2000)
   */
  delay?: number
  /**
   * Whether to show the prompt only once per user (default: true)
   */
  showOnce?: boolean
  /**
   * Custom onSubscribe callback
   */
  onSubscribe?: () => void
  /**
   * Custom onDismiss callback
   */
  onDismiss?: () => void
}

/**
 * AutoSubscribePrompt component that automatically prompts users to subscribe
 * to push notifications on first login or if they haven't subscribed yet.
 * 
 * This component:
 * - Checks if user is authenticated
 * - Checks if user has already subscribed
 * - Shows a prompt after a delay if user hasn't subscribed
 * - Tracks if user has been prompted (to avoid showing repeatedly)
 * - Allows user to subscribe or dismiss
 */
export function AutoSubscribePrompt({
  delay = 2000,
  showOnce = true,
  onSubscribe,
  onDismiss
}: AutoSubscribePromptProps) {
  const { user } = useAuth()
  const { isSupported, isSubscribed, subscribe, isLoading } = useFCMNotifications()
  const [showPrompt, setShowPrompt] = useState(false)
  const [hasBeenPrompted, setHasBeenPrompted] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Don't show on auth pages
    if (pathname?.includes('/auth/')) {
      return
    }

    // Check if user is authenticated and FCM is supported
    if (!user || !isSupported) {
      return
    }

    // If already subscribed, don't show prompt
    if (isSubscribed) {
      return
    }

    // Check if user has been prompted before (if showOnce is true)
    if (showOnce) {
      const promptedKey = `push_prompted_${user.id}`
      const hasPrompted = localStorage.getItem(promptedKey) === 'true'
      
      if (hasPrompted) {
        setHasBeenPrompted(true)
        return
      }
    }

    // Show prompt after delay
    const timer = setTimeout(() => {
      setShowPrompt(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [user, isSupported, isSubscribed, showOnce, delay, pathname])

  const handleSubscribe = async () => {
    try {
      setIsSubscribing(true)
      const success = await subscribe()
      
      if (success) {
        // Mark as prompted
        if (showOnce && user) {
          const promptedKey = `push_prompted_${user.id}`
          localStorage.setItem(promptedKey, 'true')
        }
        
        setShowPrompt(false)
        onSubscribe?.()
      }
    } catch (error) {
      logger.error('Error subscribing to push notifications:', { error })
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleDismiss = () => {
    // Mark as prompted so we don't show again
    if (showOnce && user) {
      const promptedKey = `push_prompted_${user.id}`
      localStorage.setItem(promptedKey, 'true')
    }
    
    setShowPrompt(false)
    onDismiss?.()
  }

  // Don't render if:
  // - Not supported
  // - Already subscribed
  // - Already been prompted (if showOnce)
  // - Not showing prompt
  if (!isSupported || isSubscribed || hasBeenPrompted || !showPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Stay Updated!</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Get instant notifications about your contributions and case updates
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button
              onClick={handleSubscribe}
              disabled={isLoading || isSubscribing}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isSubscribing ? 'Enabling...' : 'Enable Notifications'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              disabled={isSubscribing}
            >
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

