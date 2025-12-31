'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff } from 'lucide-react'
import { useFCMNotifications } from '@/hooks/useFCMNotifications'
import { toast } from 'sonner'

export function PushNotificationButton() {
  const { isSupported, isSubscribed, isLoading: loading, subscribe, unsubscribe } = useFCMNotifications()
  const [isSubscribing, setIsSubscribing] = useState(false)

  if (!isSupported) {
    return null // Don't show button if not supported
  }

  const handleToggle = async () => {
    setIsSubscribing(true)
    try {
      if (isSubscribed) {
        const success = await unsubscribe()
        if (success) {
          toast.success('Push notifications disabled')
        } else {
          toast.error('Failed to disable push notifications', {
            description: 'Please try again or check the browser console for details',
          })
        }
      } else {
        const success = await subscribe()
        if (success) {
          toast.success('Push notifications enabled', {
            description: 'You will now receive notifications for new cases and updates',
          })
        } else {
          toast.error('Failed to enable push notifications', {
            description: 'Please check your browser settings and ensure notifications are allowed. Check the console for details.',
          })
        }
      }
    } catch (error: any) {
      console.error('Push notification error:', error)
      toast.error('An error occurred', {
        description: error?.message || 'Please check the browser console for details',
      })
    } finally {
      setIsSubscribing(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={loading || isSubscribing}
      className="gap-2"
    >
      {isSubscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          <span className="hidden sm:inline">Disable Notifications</span>
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Enable Notifications</span>
        </>
      )}
    </Button>
  )
}

