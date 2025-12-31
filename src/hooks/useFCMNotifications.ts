/**
 * React hook for Firebase Cloud Messaging (FCM) push notifications
 */

import { useState, useEffect, useCallback } from 'react'
import { defaultLogger as logger } from '@/lib/logger'
import { env } from '@/config/env'
import { initializeFirebase, getFirebaseMessaging } from '@/lib/firebase'

interface FCMTokenData {
  fcmToken: string
  deviceId?: string
  platform?: 'web' | 'android' | 'ios'
}

export function useFCMNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if FCM is supported and initialize Firebase
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSupported(false)
      return
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      setIsSupported(false)
      return
    }

    // Clean up old/broken service workers on mount
    const cleanupOldServiceWorkers = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        
        for (const registration of registrations) {
          const scope = registration.scope
          
          // Unregister service workers that are:
          // 1. Not our current service worker (firebase-messaging-sw.js at root)
          // 2. Old Firebase default scope workers
          // 3. Old /sw/ path workers
          if (
            scope.includes('/firebase-cloud-messaging-push-scope') ||
            scope.includes('/sw/') ||
            (scope.includes('firebase-messaging-sw.js') && !scope.endsWith('/firebase-messaging-sw.js'))
          ) {
            try {
              await registration.unregister()
              logger.info(`Cleaned up old service worker: ${scope}`)
            } catch (error) {
              // Ignore errors - some might already be unregistered
            }
          }
        }
      } catch (error) {
        // Ignore cleanup errors
        logger.warn('Error during service worker cleanup:', error)
      }
    }
    
    cleanupOldServiceWorkers()

    // Initialize Firebase
    try {
      initializeFirebase()
      // Verify Firebase was actually initialized by checking if messaging is available
      const messaging = getFirebaseMessaging()
      if (messaging) {
      setIsSupported(true)
      } else {
        logger.warn('Firebase Messaging not available after initialization')
        setIsSupported(false)
      }
    } catch (error) {
      // Only log if error is meaningful
      if (error instanceof Error) {
        logger.error('Failed to initialize Firebase:', error)
      } else if (error && typeof error === 'object' && Object.keys(error).length > 0) {
      logger.error('Failed to initialize Firebase:', error)
      } else {
        logger.warn('Firebase initialization failed with unknown error')
      }
      setIsSupported(false)
    }
  }, [])

  // Check current subscription status
  const checkSubscription = async () => {
    try {
      // Check if we have a stored FCM token
      const storedToken = localStorage.getItem('fcm_token')
      if (storedToken) {
        setIsSubscribed(true)
      } else {
        setIsSubscribed(false)
      }
    } catch (err) {
      // Only log if error is meaningful
      if (err instanceof Error) {
        logger.error('Error checking FCM subscription:', err)
      } else if (err && typeof err === 'object' && Object.keys(err).length > 0) {
      logger.error('Error checking FCM subscription:', err)
      } else {
        logger.warn('Error checking FCM subscription: unknown error')
      }
      setIsSubscribed(false)
    }
  }

  useEffect(() => {
    checkSubscription()
  }, [])

  /**
   * Subscribe to FCM push notifications
   * This requires Firebase SDK to be initialized on the client
   */
  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      logger.warn('FCM not supported in this browser')
      setError('FCM not supported')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // Ensure Firebase is initialized
      if (typeof window === 'undefined') {
        throw new Error('Firebase can only be used in browser environment')
      }

      // Initialize Firebase if not already done
      initializeFirebase()

      // Get messaging instance
      const messaging = getFirebaseMessaging()
      if (!messaging) {
        throw new Error('Firebase Messaging is not available. Please ensure Firebase is properly configured.')
      }

      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Notification permission denied')
      }

      // Register or get existing service worker at the root location
      let registration: ServiceWorkerRegistration | null = null
      try {
        // Check if service worker is already registered
        const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
        if (existingRegistration) {
          registration = existingRegistration
        } else {
          // Register new service worker at root (can control entire site)
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
          })
        }
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready
      } catch (swError) {
        logger.warn('Service worker registration issue:', swError)
        // Continue anyway - Firebase might still work with default path
      }

      // Get FCM token (Firebase handles authentication automatically)
      // Firebase getToken can throw various error types, so we need to handle them carefully
      let fcmToken: string | null = null
      try {
        const { getToken } = await import('firebase/messaging')
        fcmToken = await getToken(messaging, registration ? {
          serviceWorkerRegistration: registration,
        } : undefined)
      } catch (tokenError: unknown) {
        // Firebase errors can be various types - convert to proper Error
        if (tokenError instanceof Error) {
          throw tokenError
        } else if (tokenError && typeof tokenError === 'object') {
          // Try to extract meaningful information from Firebase error
          const firebaseError = tokenError as Record<string, unknown>
          const code = firebaseError.code as string | undefined
          const message = firebaseError.message as string | undefined
          
          if (code && message && message.trim()) {
            throw new Error(`Firebase error [${code}]: ${message}`)
          } else if (message && message.trim()) {
            throw new Error(`Firebase error: ${message}`)
          } else if (code && typeof code === 'string' && code.trim()) {
            throw new Error(`Firebase error: ${code}`)
          } else {
            // No meaningful error info - create generic error
            throw new Error('Failed to get FCM token. Please check your browser console and Firebase configuration.')
          }
        } else {
          // Unknown error type - create generic error
          throw new Error('Failed to get FCM token. Please check your browser console and Firebase configuration.')
        }
      }

      if (!fcmToken) {
        throw new Error('Failed to get FCM token: Token is empty')
      }

      // Generate device ID
      let deviceId = localStorage.getItem('device_id')
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('device_id', deviceId)
      }

      // Detect platform
      const platform = /Android/i.test(navigator.userAgent) 
        ? 'android' 
        : /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? 'ios'
        : 'web'

      // Send token to server (include credentials for authentication)
      const response = await fetch('/api/push/fcm-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          fcmToken,
          deviceId,
          platform,
        }),
      })

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Failed to register FCM token (HTTP ${response.status})`
        try {
        const errorData = await response.json()
          if (errorData && typeof errorData === 'object' && errorData.error) {
            errorMessage = errorData.error
          } else if (errorData && typeof errorData === 'object' && errorData.message) {
            errorMessage = errorData.message
          }
        } catch (jsonError) {
          // Response is not valid JSON - use status text if available
          const statusText = response.statusText || `HTTP ${response.status}`
          errorMessage = `Failed to register FCM token: ${statusText}`
        }
        throw new Error(errorMessage)
      }

      // Store token locally
      localStorage.setItem('fcm_token', fcmToken)
      setIsSubscribed(true)
      logger.info('FCM subscription successful', { fcmToken: fcmToken.substring(0, 20) + '...' })
      
      return true
    } catch (err) {
      // Convert any error to a proper Error instance to ensure we have a message
      let errorMessage = 'Unknown error occurred while subscribing to FCM'
      let errorToLog: Error | undefined = undefined
      
      if (err instanceof Error) {
        errorMessage = err.message
        errorToLog = err
      } else if (err && typeof err === 'object') {
        // Try to extract meaningful information
        const errorObj = err as Record<string, unknown>
        const message = errorObj.message as string | undefined
        const code = errorObj.code as string | undefined
        
        if (message && message.trim()) {
          errorMessage = message
          errorToLog = new Error(message)
        } else if (code && typeof code === 'string' && code.trim()) {
          errorMessage = `Error code: ${code}`
          errorToLog = new Error(`Error code: ${code}`)
        } else {
          // Check if object has any enumerable properties
          const keys = Object.keys(errorObj)
          if (keys.length > 0) {
            // Has properties but no message/code - log as warning with object
            logger.warn('Error subscribing to FCM:', { error: errorObj })
            errorMessage = 'Failed to subscribe to FCM notifications'
          } else {
            // Empty object - just log warning without the object
            logger.warn('Error subscribing to FCM: empty error object received')
            errorMessage = 'Failed to subscribe to FCM notifications'
          }
        }
      }
      
      // Only log if we have a proper Error instance with meaningful content
      // Double-check that the error has actual content before logging
      if (errorToLog && errorToLog instanceof Error) {
        const hasMessage = errorToLog.message && errorToLog.message.trim().length > 0
        const hasName = errorToLog.name && errorToLog.name.trim().length > 0
        const hasStack = errorToLog.stack && errorToLog.stack.trim().length > 0
        
        if (hasMessage || hasName || hasStack) {
          // Ensure we have at least a message for the error
          const errorWithMessage = hasMessage 
            ? errorToLog 
            : (hasName 
              ? new Error(errorToLog.name || 'Unknown error occurred')
              : new Error('Unknown error occurred'))
          // Double-check the error has content before logging
          const finalMessage = errorWithMessage.message?.trim() || ''
          const hasValidMessage = finalMessage.length > 0 && finalMessage !== 'Error code: ' && finalMessage !== 'Unknown error occurred'
          const hasValidStack = errorWithMessage.stack && errorWithMessage.stack.trim().length > 0
          const hasValidName = errorWithMessage.name && errorWithMessage.name.trim().length > 0
          
          if (hasValidMessage || (hasValidStack && hasValidName)) {
            // Only log if we have meaningful content
            logger.error('Error subscribing to FCM:', errorWithMessage)
          } else {
            // No meaningful content - log as warning with extracted message
            logger.warn('Error subscribing to FCM: Error has no meaningful content', {
              errorType: 'EmptyErrorMessage',
              originalErrorMessage: errorMessage || 'Unknown error',
              errorName: errorWithMessage.name || 'Unknown',
              hasMessage: !!errorWithMessage.message,
              hasStack: !!errorWithMessage.stack
            })
          }
        } else {
          // Error object exists but has no meaningful properties - log as warning with generic message
          logger.warn('Error subscribing to FCM: Error object has no meaningful properties', {
            errorType: 'EmptyErrorObject',
            originalErrorMessage: errorMessage
          })
        }
      } else if (!errorToLog) {
        // No error object created - log warning with the error message we extracted
        logger.warn('Error subscribing to FCM: Could not create error object', {
          errorMessage,
          errorType: typeof err
        })
      } else {
        // errorToLog exists but is not an Error instance - log warning without the object
        logger.warn('Error subscribing to FCM:', {
          errorMessage,
          errorType: typeof errorToLog
        })
      }
      
      setError(errorMessage)
      setIsSubscribed(false)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Unsubscribe from FCM push notifications
   */
  const unsubscribe = async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const storedToken = localStorage.getItem('fcm_token')
      
      if (storedToken && typeof window !== 'undefined') {
        const messaging = getFirebaseMessaging()
        
        if (messaging) {
          try {
            // Delete token from Firebase
            const { deleteToken } = await import('firebase/messaging')
            await deleteToken(messaging)
          } catch (deleteError) {
            // Ignore delete errors - token might not exist or service worker might not be available
            // We'll still remove from local storage and mark as unsubscribed
            logger.warn('Could not delete FCM token from Firebase (this is usually fine):', 
              deleteError instanceof Error ? deleteError.message : 'Unknown error'
            )
          }
        }
      }

      // Remove from local storage
      localStorage.removeItem('fcm_token')
      setIsSubscribed(false)
      
      logger.info('FCM unsubscription successful')
      return true
    } catch (err) {
      // Convert any error to a proper Error instance to ensure we have a message
      let errorMessage = 'Unknown error occurred while unsubscribing from FCM'
      let errorToLog: Error | undefined = undefined
      
      if (err instanceof Error) {
        errorMessage = err.message
        errorToLog = err
      } else if (err && typeof err === 'object') {
        // Try to extract meaningful information
        const errorObj = err as Record<string, unknown>
        const message = errorObj.message as string | undefined
        const code = errorObj.code as string | undefined
        
        if (message && message.trim()) {
          errorMessage = message
          errorToLog = new Error(message)
        } else if (code && typeof code === 'string' && code.trim()) {
          errorMessage = `Error code: ${code}`
          errorToLog = new Error(`Error code: ${code}`)
        } else {
          // Check if object has any enumerable properties
          const keys = Object.keys(errorObj)
          if (keys.length > 0) {
            // Has properties but no message/code - log as warning with object
            logger.warn('Error unsubscribing from FCM:', { error: errorObj })
            errorMessage = 'Failed to unsubscribe from FCM notifications'
          } else {
            // Empty object - just log warning without the object
            logger.warn('Error unsubscribing from FCM: empty error object received')
            errorMessage = 'Failed to unsubscribe from FCM notifications'
          }
        }
      }
      
      // Only log if we have a proper Error instance with meaningful content
      // Double-check that the error has actual content before logging
      if (errorToLog && errorToLog instanceof Error) {
        const hasMessage = errorToLog.message && errorToLog.message.trim().length > 0
        const hasName = errorToLog.name && errorToLog.name.trim().length > 0
        const hasStack = errorToLog.stack && errorToLog.stack.trim().length > 0
        
        if (hasMessage || hasName || hasStack) {
          // Ensure we have at least a message for the error
          const errorWithMessage = hasMessage 
            ? errorToLog 
            : new Error(errorToLog.name || 'Unknown error occurred')
          logger.error('Error unsubscribing from FCM:', errorWithMessage)
        } else {
          // Error object exists but has no meaningful properties - log as warning with generic message
          logger.warn('Error unsubscribing from FCM: Error object has no meaningful properties', {
            errorType: 'EmptyErrorObject',
            originalErrorMessage: errorMessage
          })
        }
      } else if (!errorToLog) {
        // No error object created - log warning with the error message we extracted
        logger.warn('Error unsubscribing from FCM: Could not create error object', {
          errorMessage,
          errorType: typeof err
        })
      } else {
        // errorToLog exists but is not an Error instance - log warning without the object
        logger.warn('Error unsubscribing from FCM:', {
          errorMessage,
          errorType: typeof errorToLog
        })
      }
      
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    checkSubscription,
  }
}

