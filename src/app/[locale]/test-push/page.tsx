'use client'

import { useState, useEffect } from 'react'
import { PushNotificationButton } from '@/components/notifications/PushNotificationButton'
import { useFCMNotifications } from '@/hooks/useFCMNotifications'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, Send, CheckCircle, AlertCircle, Bug, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function TestPushPage() {
  const { isSupported, isSubscribed, isLoading: loading } = useFCMNotifications()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({})
  const [logs, setLogs] = useState<string[]>([])
  const [diagnostics, setDiagnostics] = useState<Record<string, any> | null>(null)
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false)

  // Collect debug information
  useEffect(() => {
    const collectDebugInfo = async () => {
      const info: Record<string, any> = {
        serviceWorkerSupported: 'serviceWorker' in navigator,
        notificationPermission: Notification.permission,
        serviceWorkerRegistered: false,
        firebaseInitialized: false,
      }

      // Check service worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
          info.serviceWorkerRegistered = !!registration
          info.serviceWorkerActive = registration?.active ? true : false
          info.serviceWorkerState = registration?.active?.state || 'none'
        } catch (e) {
          info.serviceWorkerError = String(e)
        }
      }

      // Check Firebase
      try {
        const { getFirebaseMessaging, getFirebaseApp } = await import('@/lib/firebase')
        const app = getFirebaseApp()
        const messaging = getFirebaseMessaging()
        info.firebaseInitialized = !!app
        info.firebaseMessagingAvailable = !!messaging
      } catch (e) {
        info.firebaseError = String(e)
      }

      // Check FCM token
      try {
        const token = localStorage.getItem('fcm_token')
        info.hasFCMToken = !!token
        info.fcmTokenLength = token?.length || 0
      } catch (e) {
        // Ignore
      }

      setDebugInfo(info)
    }

    collectDebugInfo()
    const interval = setInterval(collectDebugInfo, 2000)
    return () => clearInterval(interval)
  }, [])

  // Listen for console logs (use setTimeout to avoid setState during render)
  useEffect(() => {
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    const addLog = (level: string, ...args: any[]) => {
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
        setLogs(prev => [...prev.slice(-19), `[${level}] ${message}`])
      }, 0)
    }

    console.log = (...args) => {
      originalLog(...args)
      if (args.some(arg => typeof arg === 'string' && (arg.includes('FCM') || arg.includes('Firebase') || arg.includes('notification') || arg.includes('🔔') || arg.includes('📬')))) {
        addLog('LOG', ...args)
      }
    }

    console.error = (...args) => {
      originalError(...args)
      if (args.some(arg => typeof arg === 'string' && (arg.includes('FCM') || arg.includes('Firebase') || arg.includes('notification') || arg.includes('🔔') || arg.includes('❌')))) {
        addLog('ERROR', ...args)
      }
    }

    console.warn = (...args) => {
      originalWarn(...args)
      if (args.some(arg => typeof arg === 'string' && (arg.includes('FCM') || arg.includes('Firebase') || arg.includes('notification') || arg.includes('🔔') || arg.includes('⚠️')))) {
        addLog('WARN', ...args)
      }
    }

    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
    }
  }, [])

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Push Notifications Test</h1>
      <p className="text-gray-600 mb-8">Test and manage push notifications for case updates</p>
      
      <div className="space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Current push notification status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                ) : isSupported ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">Browser Support</span>
              </div>
              <Badge variant={isSupported ? 'default' : 'destructive'}>
                {isSupported ? 'Supported' : 'Not Supported'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                ) : isSubscribed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
                <span className="font-medium">Subscription Status</span>
              </div>
              <Badge variant={isSubscribed ? 'default' : 'secondary'}>
                {loading ? 'Loading...' : (isSubscribed ? 'Subscribed' : 'Not Subscribed')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Control Card */}
        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Enable or disable push notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <PushNotificationButton />
              <p className="text-sm text-gray-600">
                {isSubscribed 
                  ? 'You will receive push notifications for new cases and case updates'
                  : 'Click to enable push notifications'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
            <CardDescription>How to test push notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-sm">
              <li>
                <strong>Enable Notifications:</strong> Click the button above and allow notifications when your browser prompts
              </li>
              <li>
                <strong>Test Case Creation:</strong> Create a new case - all subscribed users should receive a notification
              </li>
              <li>
                <strong>Test Case Update:</strong> 
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>Make a contribution to a case</li>
                  <li>Update that case (or add a case update)</li>
                  <li>You should receive a notification (only if you contributed)</li>
                </ul>
              </li>
              <li>
                <strong>Verify in Database:</strong> Check the <code className="bg-gray-100 px-1 rounded">push_subscriptions</code> table to see your subscription
              </li>
              <li>
                <strong>Check Browser Console:</strong> Look for success/error messages
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Test Action Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test Action</CardTitle>
            <CardDescription>Send a test push notification to yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={async () => {
                  if (!isSubscribed) {
                    toast.error('Not Subscribed', {
                      description: 'Please subscribe to push notifications first using the Controls section above.',
                    })
                    return
                  }

                  setTesting(true)
                  setTestResult(null)

                  try {
                    // First, try to send a direct test notification to the UI (for immediate testing)
                    // Method 1: Send via window message (direct, always works)
                    window.postMessage({
                      type: 'PUSH_NOTIFICATION',
                      title: 'Test Push Notification',
                      body: 'This is a direct test notification. If you see this, the UI is working!',
                      icon: '/logo.png',
                      badge: '/logo.png',
                      data: {
                        type: 'test',
                        url: '/test-push',
                        timestamp: new Date().toISOString(),
                      },
                      tag: 'test-notification-direct',
                    }, '*')

                    // Method 2: Also try via service worker (if available)
                    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                      navigator.serviceWorker.controller.postMessage({
                        type: 'PUSH_NOTIFICATION',
                        title: 'Test Push Notification (via SW)',
                        body: 'This notification came through the service worker!',
                        icon: '/logo.png',
                        badge: '/logo.png',
                        data: {
                          type: 'test',
                          url: '/test-push',
                          timestamp: new Date().toISOString(),
                        },
                        tag: 'test-notification-sw',
                      })
                    }

                    // Then send the actual push notification
                    const response = await fetch('/api/push/test', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                    })

                    let data: any
                    try {
                      data = await response.json()
                    } catch (parseError) {
                      // Response might not be JSON
                      const text = await response.text()
                      console.error('Failed to parse response:', text)
                      throw new Error(`Server error (${response.status}): ${text || response.statusText}`)
                    }

                    if (response.ok && data.success) {
                      setTestResult({
                        success: true,
                        message: data.message || 'Test notification sent successfully!',
                      })
                      toast.success('Test Notification Sent', {
                        description: 'Check your browser for the push notification. It should appear in the top-right corner.',
                      })
                    } else {
                      const errorMsg = data.message || data.error || data.details || 'Failed to send test notification'
                      console.error('Test notification failed:', {
                        status: response.status,
                        statusText: response.statusText,
                        data,
                      })
                      setTestResult({
                        success: false,
                        message: errorMsg,
                      })
                      toast.error('Test Failed', {
                        description: errorMsg,
                        duration: 10000, // Show longer for debugging
                      })
                    }
                  } catch (error: any) {
                    const errorMsg = error?.message || error?.error || 'Network error occurred'
                    console.error('Test notification error:', error)
                    setTestResult({
                      success: false,
                      message: errorMsg,
                    })
                    toast.error('Error', {
                      description: errorMsg,
                      duration: 10000, // Show longer for debugging
                    })
                  } finally {
                    setTesting(false)
                  }
                }}
                disabled={testing || !isSubscribed || loading}
                className="flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Test Notification
                  </>
                )}
              </Button>
              {!isSubscribed && (
                <p className="text-sm text-gray-500">
                  Subscribe to push notifications first to test
                </p>
              )}
            </div>

            <Button
              variant="outline"
              onClick={async () => {
                setLoadingDiagnostics(true)
                try {
                  const response = await fetch('/api/push/diagnostics')
                  const data = await response.json()
                  setDiagnostics(data)
                  toast.success('Diagnostics Complete', {
                    description: 'Check the Diagnostics section below for details',
                  })
                } catch (error: any) {
                  toast.error('Diagnostics Failed', {
                    description: error.message || 'Failed to run diagnostics',
                  })
                } finally {
                  setLoadingDiagnostics(false)
                }
              }}
              disabled={loadingDiagnostics}
              className="flex items-center gap-2"
            >
              {loadingDiagnostics ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Bug className="h-4 w-4" />
                  Run Diagnostics
                </>
              )}
            </Button>

            {testResult && (
              <div
                className={`p-3 rounded-lg flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {testResult.success ? 'Success' : 'Error'}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      testResult.success ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {testResult.message}
                  </p>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 space-y-1">
              <p>• The test notification will appear as a sticky, stacked notification in the top-right corner</p>
              <p>• Make sure you're subscribed and have granted browser notification permissions</p>
              <p>• Check both the in-app notification (top-right) and browser notification (system tray)</p>
            </div>
          </CardContent>
        </Card>

        {/* Diagnostics Card */}
        {diagnostics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Diagnostics Results
              </CardTitle>
              <CardDescription>System health check for push notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(diagnostics.checks || {}).map(([key, check]: [string, any]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border ${
                    check.status === 'ok'
                      ? 'bg-green-50 border-green-200'
                      : check.status === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : check.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {check.status === 'ok' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : check.status === 'warning' ? (
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    ) : check.status === 'error' ? (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                      <p className="text-sm text-gray-700">{check.message}</p>
                      {check.count !== undefined && (
                        <p className="text-xs text-gray-500 mt-1">Count: {check.count}</p>
                      )}
                      {check.tokens && check.tokens.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {check.tokens.map((token: any, idx: number) => (
                            <div key={idx} className="text-xs bg-white p-2 rounded border">
                              <div>Platform: {token.platform}</div>
                              <div>Device: {token.deviceId || 'N/A'}</div>
                              <div>Updated: {new Date(token.updatedAt).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {check.instructions && (
                        <ul className="mt-2 space-y-1 text-xs text-gray-600">
                          {check.instructions.map((instruction: string, idx: number) => (
                            <li key={idx}>{instruction}</li>
                          ))}
                        </ul>
                      )}
                      {check.response && (
                        <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                          {JSON.stringify(check.response, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Debug Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Information
            </CardTitle>
            <CardDescription>Current system state and diagnostics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Service Worker:</strong>
                <div className="mt-1 space-y-1">
                  <div>Supported: {debugInfo.serviceWorkerSupported ? '✅' : '❌'}</div>
                  <div>Registered: {debugInfo.serviceWorkerRegistered ? '✅' : '❌'}</div>
                  <div>Active: {debugInfo.serviceWorkerActive ? '✅' : '❌'}</div>
                  <div>State: {debugInfo.serviceWorkerState || 'N/A'}</div>
                </div>
              </div>
              <div>
                <strong>Firebase:</strong>
                <div className="mt-1 space-y-1">
                  <div>Initialized: {debugInfo.firebaseInitialized ? '✅' : '❌'}</div>
                  <div>Messaging: {debugInfo.firebaseMessagingAvailable ? '✅' : '❌'}</div>
                  <div>FCM Token: {debugInfo.hasFCMToken ? `✅ (${debugInfo.fcmTokenLength} chars)` : '❌'}</div>
                </div>
              </div>
              <div>
                <strong>Permissions:</strong>
                <div className="mt-1">
                  <div>Notification: {debugInfo.notificationPermission || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setLoadingDiagnostics(true)
                  try {
                    const response = await fetch('/api/push/diagnostics')
                    const data = await response.json()
                    setDiagnostics(data)
                    toast.success('Diagnostics Complete', {
                      description: 'Check the Diagnostics section for details',
                    })
                  } catch (error: any) {
                    toast.error('Diagnostics Failed', {
                      description: error.message || 'Failed to run diagnostics',
                    })
                  } finally {
                    setLoadingDiagnostics(false)
                  }
                }}
                disabled={loadingDiagnostics}
                className="flex-1"
              >
                {loadingDiagnostics ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Bug className="h-4 w-4 mr-2" />
                    Run Diagnostics
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Force trigger a direct notification
                  window.postMessage({
                    type: 'PUSH_NOTIFICATION',
                    title: 'Direct Test Notification',
                    body: 'This notification was triggered directly via postMessage. If you see this, the UI component is working!',
                    icon: '/logo.png',
                    badge: '/logo.png',
                    data: { type: 'test', url: '/test-push' },
                    tag: 'direct-test',
                  }, '*')
                  toast.success('Direct notification sent', {
                    description: 'Check top-right corner for the notification',
                  })
                }}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                Direct UI Test
              </Button>
            </div>

            {logs.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <strong className="text-sm">Recent Logs:</strong>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogs([])}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
                <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Troubleshooting Card */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
            <CardDescription>Common issues and solutions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <strong className="text-red-600">Not Supported:</strong>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-600">
                  <li>Ensure you're using a modern browser (Chrome, Firefox, Edge)</li>
                  <li>Push notifications require HTTPS (except localhost)</li>
                </ul>
              </div>
              <div>
                <strong className="text-yellow-600">Failed to Subscribe:</strong>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-600">
                  <li>Check browser notification permissions</li>
                  <li>Verify Firebase is properly configured</li>
                  <li>Check browser console for specific errors</li>
                </ul>
              </div>
              <div>
                <strong className="text-blue-600">No Notifications Received:</strong>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-600">
                  <li>Verify you're subscribed (status shows "Subscribed")</li>
                  <li>Check server logs for notification sending errors</li>
                  <li>Ensure Firebase Cloud Messaging is correctly configured</li>
                  <li>Try the "Send Direct UI Notification" button above to test the UI component</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

