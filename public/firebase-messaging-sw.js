// Firebase Cloud Messaging Service Worker
// This handles background push notifications

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Firebase configuration
// This should match the config in src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyBTysTBlLPcstq7uWonnu3YTkKIVLleueM",
  authDomain: "meenma3ana-c6520.firebaseapp.com",
  projectId: "meenma3ana-c6520",
  storageBucket: "meenma3ana-c6520.firebasestorage.app",
  messagingSenderId: "51219462930",
  appId: "1:51219462930:web:9f22cd938ecdbabc2c91cb",
  measurementId: "G-M3PN8ZQNNV"
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 [SW] Background message received via onBackgroundMessage:', payload)
  
  // Always check for clients and forward
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    console.log('🔔 [SW] Found clients:', clientList.length)
    
    if (clientList.length > 0) {
      // App is open - send message to clients for in-app display
      console.log('🔔 [SW] App is open, forwarding to clients:', clientList.length)
      const message = {
        type: 'PUSH_NOTIFICATION',
        title: payload.notification?.title || payload.data?.title || 'Meen Ma3ana',
        body: payload.notification?.body || payload.data?.body || '',
        icon: payload.notification?.icon || payload.data?.icon || '/logo.png',
        badge: payload.notification?.badge || payload.data?.badge || '/logo.png',
        data: payload.data || {},
        tag: payload.data?.tag || payload.fcmMessageId || 'default',
      }
      
      console.log('🔔 [SW] Sending message to clients:', message)
      clientList.forEach((client) => {
        try {
          client.postMessage(message)
          console.log('✅ [SW] Message sent to client:', client.url)
        } catch (e) {
          console.error('❌ [SW] Failed to send message to client:', e)
        }
      })
    } else {
      console.log('🔔 [SW] No clients open, will show native notification only')
    }
  }).catch((error) => {
    console.error('❌ [SW] Error matching clients:', error)
  })
  
  // Also show native notification (for when app is in background or no clients)
  const notificationTitle = payload.notification?.title || 'Meen Ma3ana'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/logo.png',
    badge: payload.notification?.badge || '/logo.png',
    image: payload.notification?.image,
    data: payload.data || {},
    tag: payload.data?.tag || payload.fcmMessageId || 'default',
    requireInteraction: payload.data?.requireInteraction || false,
    silent: false,
  }

  console.log('🔔 [SW] Showing native notification:', notificationTitle)
  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  
  event.notification.close()
  
  const data = event.notification.data || {}
  let url = data.url || '/'
  
  // If caseId is provided but no URL, construct the URL
  if (!data.url && data.caseId) {
    // Try to get locale from existing client, otherwise default to 'en'
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      let locale = data.locale || 'en'
      
      // Try to extract locale from first available client
      if (clientList.length > 0 && clientList[0].url) {
        const urlMatch = clientList[0].url.match(/\/(en|ar)\//)
        if (urlMatch) {
          locale = urlMatch[1]
        }
      }
      
      url = `/${locale}/cases/${data.caseId}`
      
      // Navigate to the URL
      if (clientList.length > 0) {
        const client = clientList[0]
        if ('focus' in client) {
          client.postMessage({
            type: 'NAVIGATE',
            url: url,
          })
          return client.focus()
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
    return
  }

  // If we have a URL, navigate normally
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if ('focus' in client) {
          // Send message to client to navigate
          client.postMessage({
            type: 'NAVIGATE',
            url: url,
          })
          return client.focus()
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Also listen for push events (fallback for when onBackgroundMessage doesn't fire)
self.addEventListener('push', (event) => {
  console.log('🔔 [SW] Push event received (raw):', event)
  console.log('🔔 [SW] Push event has data:', !!event.data)
  
  let payload = null
  try {
    if (event.data) {
      payload = event.data.json()
      console.log('🔔 [SW] Parsed push payload:', payload)
    } else {
      console.log('⚠️ [SW] Push event has no data')
      return
    }
  } catch (e) {
    console.error('❌ [SW] Failed to parse push data:', e)
    // Try text() as fallback
    try {
      const text = event.data.text()
      payload = JSON.parse(text)
      console.log('🔔 [SW] Parsed push payload from text:', payload)
    } catch (e2) {
      console.error('❌ [SW] Failed to parse push data as text:', e2)
      return
    }
  }
  
  if (!payload) {
    console.log('⚠️ [SW] No payload after parsing')
    return
  }
  
  // Check if app is open and forward to clients
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      console.log('🔔 [SW] Found clients for push event:', clientList.length)
      
      if (clientList.length > 0) {
        console.log('🔔 [SW] App is open, forwarding push event to clients:', clientList.length)
        const message = {
          type: 'PUSH_NOTIFICATION',
          title: payload.notification?.title || payload.data?.title || 'Meen Ma3ana',
          body: payload.notification?.body || payload.data?.body || '',
          icon: payload.notification?.icon || payload.data?.icon || '/logo.png',
          badge: payload.notification?.badge || payload.data?.badge || '/logo.png',
          data: payload.data || {},
          tag: payload.data?.tag || payload.fcmMessageId || 'default',
        }
        
        console.log('🔔 [SW] Sending push message to clients:', message)
        clientList.forEach((client) => {
          try {
            client.postMessage(message)
            console.log('✅ [SW] Push message sent to client:', client.url)
          } catch (e) {
            console.error('❌ [SW] Failed to send push message to client:', e)
          }
        })
      } else {
        console.log('🔔 [SW] No clients open, will show native notification only')
      }
      
      // Also show notification
      const notificationTitle = payload.notification?.title || payload.data?.title || 'Meen Ma3ana'
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: payload.notification?.icon || payload.data?.icon || '/logo.png',
        badge: payload.notification?.badge || payload.data?.badge || '/logo.png',
        image: payload.notification?.image,
        data: payload.data || {},
        tag: payload.data?.tag || payload.fcmMessageId || 'default',
        requireInteraction: payload.data?.requireInteraction || false,
        silent: false,
      }
      
      console.log('🔔 [SW] Showing native notification from push event:', notificationTitle)
      return self.registration.showNotification(notificationTitle, notificationOptions)
    }).catch((error) => {
      console.error('❌ [SW] Error in push event handler:', error)
    })
  )
})

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REQUEST_PENDING_NOTIFICATIONS') {
    // Client is requesting any pending notifications
    event.ports[0]?.postMessage({ type: 'PENDING_NOTIFICATIONS_RESPONSE', notifications: [] })
  }
})


