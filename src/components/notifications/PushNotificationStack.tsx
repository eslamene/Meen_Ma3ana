'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Bell, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { setupForegroundMessageHandler } from '@/lib/firebase'

interface PushNotification {
  id: string
  title: string
  body: string
  icon?: string
  badge?: string
  data?: {
    url?: string
    caseId?: string
    [key: string]: any
  }
  timestamp: number
}

export function PushNotificationStack() {
  const [notifications, setNotifications] = useState<PushNotification[]>([])
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  
  // Use ref to store router to avoid dependency issues
  const routerRef = useRef(router)
  const localeRef = useRef(locale)
  
  // Keep refs updated
  useEffect(() => {
    routerRef.current = router
    localeRef.current = locale
  }, [router, locale])

  // Listen for messages from service worker and window messages
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleMessage = (event: MessageEvent) => {
      // Filter out React DevTools messages and other noise
      if (event.data && (
        event.data.source === 'react-devtools-content-script' ||
        event.data.source === 'react-devtools-backend-manager' ||
        event.data.source === 'react-devtools-bridge'
      )) {
        return // Ignore React DevTools messages
      }
      
      console.log('📨 Message received in PushNotificationStack:', event.data)
      
      if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
        console.log('✅ Processing PUSH_NOTIFICATION message:', event.data)
        const notification: PushNotification = {
          id: `${Date.now()}-${Math.random()}`,
          title: event.data.title || 'Meen Ma3ana',
          body: event.data.body || '',
          icon: event.data.icon || '/logo.png',
          badge: event.data.badge || '/logo.png',
          data: event.data.data || {},
          timestamp: Date.now(),
        }
        
        console.log('📬 Adding notification to stack:', notification)
        setNotifications((prev) => {
          const updated = [...prev, notification]
          console.log('📋 Total notifications after add:', updated.length)
          return updated
        })
      } else if (event.data && event.data.type === 'NAVIGATE') {
        // Handle navigation from service worker
        console.log('🧭 Navigation message received:', event.data.url)
        if (event.data.url) {
          routerRef.current.push(event.data.url)
        }
      } else if (event.data && event.data.source) {
        // Silently ignore messages with source (React DevTools, etc.)
        return
      } else {
        console.log('⚠️ Unknown message type:', event.data)
      }
    }

    // Handle Firebase foreground messages (when app is open)
    const handleForegroundMessage = (payload: any) => {
      console.log('🔔 Foreground FCM message received:', payload)
      console.log('🔔 Payload structure:', {
        hasNotification: !!payload.notification,
        hasData: !!payload.data,
        notificationKeys: payload.notification ? Object.keys(payload.notification) : [],
        dataKeys: payload.data ? Object.keys(payload.data) : [],
      })
      
      try {
        // FCM V1 API sends payload with notification and data fields
        // When app is in foreground, onMessage receives the full payload
        const title = payload.notification?.title || 
                     payload.data?.title || 
                     (typeof payload.data?.title === 'string' ? payload.data.title : 'Meen Ma3ana')
        
        const body = payload.notification?.body || 
                    payload.data?.body || 
                    (typeof payload.data?.body === 'string' ? payload.data.body : '')
        
        // Parse data if it's a JSON string
        let notificationData = payload.data || {}
        if (typeof notificationData === 'string') {
          try {
            notificationData = JSON.parse(notificationData)
          } catch (e) {
            // If parsing fails, use as-is
          }
        }
        
        // Handle nested data fields that might be JSON strings
        if (notificationData.caseId && typeof notificationData.caseId === 'string') {
          // Already a string, use as-is
        } else if (notificationData.data && typeof notificationData.data === 'string') {
          try {
            const parsedData = JSON.parse(notificationData.data)
            notificationData = { ...notificationData, ...parsedData }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        const notification: PushNotification = {
          id: `${Date.now()}-${Math.random()}`,
          title: title,
          body: body,
          icon: payload.notification?.icon || notificationData?.icon || '/logo.png',
          badge: payload.notification?.badge || notificationData?.badge || '/logo.png',
          data: notificationData,
          timestamp: Date.now(),
        }
        
        console.log('📬 Adding notification to stack:', notification)
        setNotifications((prev) => {
          const updated = [...prev, notification]
          console.log('📋 Total notifications:', updated.length)
          return updated
        })
      } catch (error) {
        console.error('❌ Error handling foreground message:', error)
      }
    }

    // Set up Firebase foreground message handler
    // Initialize Firebase first, then set up handler
    const initializeFirebaseHandler = async () => {
      try {
        console.log('🔧 Initializing Firebase for foreground notifications...')
        
        // Import and initialize Firebase
        const { initializeFirebase, getFirebaseMessaging } = await import('@/lib/firebase')
        initializeFirebase()
        
        // Retry logic with multiple attempts
        let attempts = 0
        const maxAttempts = 5
        const checkMessaging = () => {
          attempts++
          const messaging = getFirebaseMessaging()
          
          if (messaging) {
            console.log('✅ Firebase Messaging initialized, setting up foreground handler')
            setupForegroundMessageHandler(handleForegroundMessage)
            console.log('✅ Foreground message handler registered')
            return true
          } else if (attempts < maxAttempts) {
            console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Firebase Messaging not ready, retrying...`)
            setTimeout(checkMessaging, 1000)
            return false
          } else {
            console.error('❌ Firebase Messaging not available after multiple attempts')
            return false
          }
        }
        
        // Start checking after a short delay
        setTimeout(checkMessaging, 300)
      } catch (error) {
        console.error('❌ Error initializing Firebase handler:', error)
      }
    }
    
    initializeFirebaseHandler()

    // Listen for window messages (fallback for direct notifications)
    window.addEventListener('message', handleMessage)

    // Set up service worker message listener if available
    if ('serviceWorker' in navigator) {
      const setupMessageListener = () => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.addEventListener('message', handleMessage as EventListener)
        } else {
          // Wait for controller to be available
          navigator.serviceWorker.ready.then((registration) => {
            if (registration.active) {
              registration.active.addEventListener('message', handleMessage as EventListener)
            }
          })
        }
      }

      setupMessageListener()

      // Also listen for controller changes (when service worker updates)
      navigator.serviceWorker.addEventListener('controllerchange', setupMessageListener)

      // Also check if service worker is ready
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          registration.active.addEventListener('message', handleMessage as EventListener)
        }
      })
    }

    return () => {
      // Clean up listeners
      window.removeEventListener('message', handleMessage)
      if ('serviceWorker' in navigator) {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.removeEventListener('message', handleMessage as EventListener)
        }
        navigator.serviceWorker.ready.then((registration) => {
          if (registration.active) {
            registration.active.removeEventListener('message', handleMessage as EventListener)
          }
        })
      }
    }
  }, []) // Empty deps - we use refs to access router and locale

  const handleDismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const handleClick = useCallback((notification: PushNotification) => {
    if (notification.data?.url) {
      router.push(notification.data.url)
    } else if (notification.data?.caseId) {
      router.push(`/${locale}/cases/${notification.data.caseId}`)
    }
    handleDismiss(notification.id)
  }, [router, locale, handleDismiss])

  // Debug: Log notification state
  useEffect(() => {
    if (notifications.length > 0) {
      console.log('📬 Notifications in state:', notifications.length, notifications)
    }
  }, [notifications])

  // Debug: Log component mount
  useEffect(() => {
    console.log('🔔 PushNotificationStack component mounted')
    return () => {
      console.log('🔔 PushNotificationStack component unmounted')
    }
  }, [])

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {notifications.map((notification, index) => (
        <Card
          key={notification.id}
          className={cn(
            "pointer-events-auto shadow-2xl border-2 animate-in slide-in-from-right",
            "bg-gradient-to-br from-indigo-50 via-white to-blue-50",
            "border-indigo-200/50 backdrop-blur-sm",
            index === 0 && "ring-2 ring-indigo-400/20"
          )}
          style={{
            animationDelay: `${index * 50}ms`,
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <Bell className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1">
                  {notification.title}
                </h4>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {notification.body}
                </p>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {(notification.data?.url || notification.data?.caseId) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2"
                      onClick={() => handleClick(notification)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-gray-500 hover:text-gray-700"
                    onClick={() => handleDismiss(notification.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => handleDismiss(notification.id)}
                className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

