'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

export default function RBACManagementPageSimple() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading RBAC Management...</div>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard allowedPermissions={['admin:rbac']} fallback={
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access RBAC management.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">RBAC Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage roles, permissions, and user access control
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Simple RBAC Test</CardTitle>
            <CardDescription>
              This is a simplified version to test if the basic components work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>If you can see this page, the basic RBAC system is working!</p>
              <Button onClick={() => alert('Button works!')}>
                Test Button
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  )
}
