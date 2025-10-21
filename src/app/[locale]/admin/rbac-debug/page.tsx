'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function RBACDebugPage() {
  const [results, setResults] = useState<any>({})
  const [testing, setTesting] = useState(false)

  const runDiagnostics = async () => {
    setTesting(true)
    const testResults: any = {}

    // Test 1: Check if user is authenticated
    try {
      const authResponse = await fetch('/api/refresh-role', { method: 'POST' })
      const authData = await authResponse.json()
      testResults.auth = {
        status: authResponse.status === 200 ? 'success' : 'error',
        message: authData.success ? 'User is authenticated' : authData.message || 'Authentication failed',
        data: authData
      }
    } catch (error) {
      testResults.auth = {
        status: 'error',
        message: 'Failed to check authentication',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 2: Check original RBAC API
    try {
      const rbacResponse = await fetch('/api/admin/rbac?action=roles')
      const rbacData = await rbacResponse.json()
      testResults.originalRBAC = {
        status: rbacResponse.status === 200 && rbacData.success ? 'success' : 'error',
        message: rbacData.success ? `Found ${rbacData.roles?.length || 0} roles` : rbacData.error || 'RBAC API failed',
        data: rbacData
      }
    } catch (error) {
      testResults.originalRBAC = {
        status: 'error',
        message: 'Failed to connect to original RBAC API',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 3: Check permission modules API
    try {
      const modulesResponse = await fetch('/api/admin/permission-modules')
      const modulesData = await modulesResponse.json()
      testResults.permissionModules = {
        status: modulesResponse.status === 200 && modulesData.success ? 'success' : 'error',
        message: modulesData.success ? `Found ${modulesData.modules?.length || 0} modules` : modulesData.error || 'Permission modules API failed',
        data: modulesData
      }
    } catch (error) {
      testResults.permissionModules = {
        status: 'error',
        message: 'Failed to connect to permission modules API',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 4: Check grouped permission modules API
    try {
      const groupedResponse = await fetch('/api/admin/permission-modules?grouped=true')
      const groupedData = await groupedResponse.json()
      testResults.groupedModules = {
        status: groupedResponse.status === 200 && groupedData.success ? 'success' : 'error',
        message: groupedData.success ? `Found ${Object.keys(groupedData.modules || {}).length} grouped modules` : groupedData.error || 'Grouped modules API failed',
        data: groupedData
      }
    } catch (error) {
      testResults.groupedModules = {
        status: 'error',
        message: 'Failed to connect to grouped modules API',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 5: Check permissions API
    try {
      const permissionsResponse = await fetch('/api/admin/permissions')
      const permissionsData = await permissionsResponse.json()
      testResults.permissions = {
        status: permissionsResponse.status === 200 && permissionsData.success ? 'success' : 'error',
        message: permissionsData.success ? `Found ${permissionsData.permissions?.length || 0} permissions` : permissionsData.error || 'Permissions API failed',
        data: permissionsData
      }
    } catch (error) {
      testResults.permissions = {
        status: 'error',
        message: 'Failed to connect to permissions API',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    setResults(testResults)
    setTesting(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">RBAC System Diagnostics</h1>
        <p className="text-gray-600">Debug and troubleshoot RBAC system issues</p>
      </div>

      <div className="mb-6">
        <Button 
          onClick={runDiagnostics} 
          disabled={testing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
          {testing ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Diagnostic Results</h2>
          
          {Object.entries(results).map(([testName, result]: [string, any]) => (
            <Card key={testName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <CardTitle className="text-lg capitalize">
                        {testName.replace(/([A-Z])/g, ' $1').trim()}
                      </CardTitle>
                      <CardDescription>{result.message}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(result.status)}>
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                    View Details
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {Object.keys(results).length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Diagnostics Run Yet</h3>
            <p className="text-gray-600">Click "Run Diagnostics" to check the RBAC system status</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">Troubleshooting Steps:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Ensure you're logged in as an admin user</li>
          <li>Check if the database migration has been applied (see console logs)</li>
          <li>Verify API endpoints are accessible</li>
          <li>Check browser console for detailed error messages</li>
          <li>Try refreshing the page or clearing browser cache</li>
        </ol>
      </div>
    </div>
  )
}
