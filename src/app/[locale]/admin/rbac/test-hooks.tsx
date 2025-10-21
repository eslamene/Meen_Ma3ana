'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDatabaseRBAC } from '@/lib/hooks/useDatabaseRBAC'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

export default function RBACTestHooks() {
  const { roles, permissions, loading, error } = useDatabaseRBAC()
  const [testMessage, setTestMessage] = useState('')

  const handleTest = () => {
    setTestMessage(`Found ${roles.length} roles and ${permissions.length} permissions`)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8">
            <p>Loading RBAC data...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <PermissionGuard allowedPermissions={['admin:rbac']} fallback={
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You don't have permission to access RBAC management.</p>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="container mx-auto py-8 space-y-6">
        <h1 className="text-3xl font-bold">RBAC Hook Test</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Database RBAC Hook Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Roles loaded: {roles.length}</p>
              <p>Permissions loaded: {permissions.length}</p>
              
              <Button onClick={handleTest}>
                Test Hook Data
              </Button>
              
              {testMessage && (
                <p className="text-green-600">{testMessage}</p>
              )}
              
              <div className="mt-4">
                <h4 className="font-semibold">Roles:</h4>
                <ul className="list-disc list-inside">
                  {roles.map(role => (
                    <li key={role.id}>{role.display_name} ({role.name})</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  )
}
