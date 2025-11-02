'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface RouteTest {
  name: string
  path: string
  status: 'pending' | 'success' | 'error'
  error?: string
}

export default function NavigationTest() {
  const [tests, setTests] = useState<RouteTest[]>([
    { name: 'Admin Dashboard', path: '/en/admin', status: 'pending' },
    { name: 'Access Control Roles', path: '/en/admin/access-control/roles', status: 'pending' },
    { name: 'Access Control Users', path: '/en/admin/access-control/users', status: 'pending' },
    { name: 'Access Control Permissions', path: '/en/admin/access-control/permissions', status: 'pending' },
    { name: 'Access Control Modules', path: '/en/admin/access-control/modules', status: 'pending' },
  ])

  const testRoute = async (index: number) => {
    const test = tests[index]
    setTests(prev => prev.map((t, i) => 
      i === index ? { ...t, status: 'pending' } : t
    ))

    try {
      const response = await fetch(test.path, { method: 'HEAD' })
      setTests(prev => prev.map((t, i) => 
        i === index ? { 
          ...t, 
          status: response.ok ? 'success' : 'error',
          error: response.ok ? undefined : `HTTP ${response.status}`
        } : t
      ))
    } catch (error) {
      setTests(prev => prev.map((t, i) => 
        i === index ? { 
          ...t, 
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        } : t
      ))
    }
  }

  const testAllRoutes = async () => {
    for (let i = 0; i < tests.length; i++) {
      await testRoute(i)
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 border-2 border-gray-300 rounded-full animate-pulse" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Navigation Test</CardTitle>
        <CardDescription>
          Test all admin routes to ensure they're accessible
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testAllRoutes} size="sm">
            Test All Routes
          </Button>
        </div>

        <div className="space-y-2">
          {tests.map((test, index) => (
            <div key={test.name} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(test.status)}
                <div>
                  <div className="font-medium">{test.name}</div>
                  <div className="text-sm text-gray-500">{test.path}</div>
                  {test.error && (
                    <div className="text-sm text-red-600">{test.error}</div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(test.status)}>
                  {test.status}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testRoute(index)}
                  disabled={test.status === 'pending'}
                >
                  Test
                </Button>
                <Link href={test.path}>
                  <Button size="sm" variant="ghost">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
