/**
 * Firebase initialization and configuration
 * 
 * This file initializes Firebase for the application, including:
 * - Firebase App
 * - Firebase Messaging (for push notifications)
 * - Firebase Analytics (optional)
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, Messaging, onMessage } from 'firebase/messaging'
import { getAnalytics, Analytics } from 'firebase/analytics'
import { env } from '@/config/env'
import { defaultLogger as logger } from '@/lib/logger'

let app: FirebaseApp | undefined
let messaging: Messaging | undefined
let analytics: Analytics | undefined

/**
 * Firebase configuration
 * This matches the config from Firebase Console
 */
const firebaseConfig = {
  apiKey: "AIzaSyBTysTBlLPcstq7uWonnu3YTkKIVLleueM",
  authDomain: "meenma3ana-c6520.firebaseapp.com",
  projectId: "meenma3ana-c6520",
  storageBucket: "meenma3ana-c6520.firebasestorage.app",
  messagingSenderId: "51219462930",
  appId: "1:51219462930:web:9f22cd938ecdbabc2c91cb",
  measurementId: "G-M3PN8ZQNNV"
}

/**
 * Get or initialize Firebase App
 */
export function getFirebaseApp(): FirebaseApp | undefined {
  if (typeof window === 'undefined') return undefined
  
  if (!app) {
    // Check if Firebase is already initialized
    const existingApps = getApps()
    if (existingApps.length > 0) {
      app = existingApps[0]
    } else {
      // Use config from env if available, otherwise use hardcoded config
      let config = firebaseConfig
      
      if (env.NEXT_PUBLIC_FIREBASE_CONFIG) {
        try {
          config = JSON.parse(env.NEXT_PUBLIC_FIREBASE_CONFIG)
        } catch (error) {
          logger.warn('Failed to parse NEXT_PUBLIC_FIREBASE_CONFIG, using default config')
        }
      }
      
      app = initializeApp(config)
    }
  }
  
  return app
}

/**
 * Get or initialize Firebase Messaging
 */
export function getFirebaseMessaging(): Messaging | undefined {
  if (typeof window === 'undefined') return undefined
  
  if (!messaging) {
    const app = getFirebaseApp()
    if (app && 'serviceWorker' in navigator) {
      try {
        messaging = getMessaging(app)
      } catch (error: unknown) {
        // Convert errors to proper Error instances
        if (error instanceof Error) {
        logger.error('Failed to initialize Firebase Messaging:', error)
        } else if (error && typeof error === 'object') {
          const errorObj = error as Record<string, unknown>
          const message = errorObj.message as string | undefined
          const code = errorObj.code as string | undefined
          
          if (message) {
            logger.error('Failed to initialize Firebase Messaging:', new Error(message))
          } else if (code) {
            logger.error('Failed to initialize Firebase Messaging:', new Error(`Firebase error: ${code}`))
          } else if (Object.keys(errorObj).length > 0) {
            logger.warn('Failed to initialize Firebase Messaging:', { error: errorObj })
          } else {
            logger.warn('Failed to initialize Firebase Messaging: empty error object received')
          }
        } else {
          logger.warn('Failed to initialize Firebase Messaging: unknown error type')
        }
        return undefined
      }
    }
  }
  
  return messaging
}

/**
 * Get or initialize Firebase Analytics
 */
export function getFirebaseAnalytics(): Analytics | undefined {
  if (typeof window === 'undefined') return undefined
  
  if (!analytics) {
    const app = getFirebaseApp()
    if (app) {
      try {
        analytics = getAnalytics(app)
      } catch (error) {
        logger.error('Failed to initialize Firebase Analytics:', error)
        return undefined
      }
    }
  }
  
  return analytics
}

/**
 * Initialize Firebase services
 * Call this in your app root or layout
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') return
  
  getFirebaseApp()
  getFirebaseMessaging()
  
  // Initialize analytics only if not in development
  if (process.env.NODE_ENV === 'production') {
    getFirebaseAnalytics()
  }
}

/**
 * Make Firebase available globally for hooks
 * This is needed for the useFCMNotifications hook
 */
if (typeof window !== 'undefined') {
  (window as any).firebase = {
    app: () => getFirebaseApp(),
    messaging: () => getFirebaseMessaging(),
    analytics: () => getFirebaseAnalytics(),
  }
}

/**
 * Get FCM token for the current user
 */
export async function getFCMToken(): Promise<string | null> {
  const messagingInstance = getFirebaseMessaging()
  if (!messagingInstance) {
    return null
  }

  try {
    // Register or get existing service worker if not already registered
    let registration: ServiceWorkerRegistration | null = null
    if ('serviceWorker' in navigator) {
      try {
        // Check if service worker is already registered at root path
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
        logger.warn('Service worker registration issue, Firebase will try default path:', swError)
      }
    }

    // Get FCM token (Firebase handles authentication automatically)
    const token = await getToken(messagingInstance, registration ? {
      serviceWorkerRegistration: registration,
    } : undefined)
    
    return token
  } catch (error: unknown) {
    // Convert Firebase errors to proper Error instances
    if (error instanceof Error) {
    logger.error('Error getting FCM token:', error)
    } else if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>
      const message = errorObj.message as string | undefined
      const code = errorObj.code as string | undefined
      
      if (message) {
        logger.error('Error getting FCM token:', new Error(message))
      } else if (code) {
        logger.error('Error getting FCM token:', new Error(`Firebase error: ${code}`))
      } else if (Object.keys(errorObj).length > 0) {
        logger.warn('Error getting FCM token:', { error: errorObj })
      } else {
        logger.warn('Error getting FCM token: empty error object received')
      }
    } else {
      logger.warn('Error getting FCM token: unknown error type')
    }
    return null
  }
}

/**
 * Set up foreground message handler
 * This handles notifications when the app is in the foreground
 */
export function setupForegroundMessageHandler(
  callback: (payload: any) => void
) {
  const messagingInstance = getFirebaseMessaging()
  if (!messagingInstance) {
    return
  }

  onMessage(messagingInstance, (payload) => {
    logger.info('Foreground message received:', payload)
    callback(payload)
  })
}

// Export Firebase config for use in service worker
export { firebaseConfig }

