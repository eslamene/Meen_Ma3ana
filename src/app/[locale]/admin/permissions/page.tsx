'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  Users, 
  Settings, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Check,
  X
} from 'lucide-react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { FEATURE_ACCESS, UI_VISIBILITY, ROLE_HIERARCHY, UserRole } from '@/config/permissions'
import { ROLE_PERMISSIONS, Permission } from '@/lib/rbac/permissions'

export default function PermissionsManagementPage() {
  const t = useTranslations('admin')
  const [selectedRole, setSelectedRole] = useState<UserRole>('donor')

  const roles = Object.keys(ROLE_HIERARCHY) as UserRole[]
  const features = Object.entries(FEATURE_ACCESS)
  const uiElements = Object.entries(UI_VISIBILITY)

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200'
      case 'moderator': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'sponsor': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'volunteer': return 'bg-green-100 text-green-800 border-green-200'
      case 'donor': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const hasFeatureAccess = (feature: UserRole[], role: UserRole) => {
    return feature.includes(role)
  }

  return (
    <PermissionGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Permission Management</h1>
                <p className="text-gray-600">Configure role-based access control for your platform</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="ui">UI Elements</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => (
                  <Card key={role} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg capitalize">{role}</CardTitle>
                        <Badge className={getRoleBadgeColor(role)}>
                          Level {ROLE_HIERARCHY[role]}
                        </Badge>
                      </div>
                      <CardDescription>
                        {ROLE_PERMISSIONS[role].length} permissions assigned
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Key Permissions:</div>
                        <div className="flex flex-wrap gap-1">
                          {ROLE_PERMISSIONS[role].slice(0, 3).map((permission) => (
                            <Badge key={permission} variant="outline" className="text-xs">
                              {permission.split(':')[1]}
                            </Badge>
                          ))}
                          {ROLE_PERMISSIONS[role].length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{ROLE_PERMISSIONS[role].length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Roles Tab */}
            <TabsContent value="roles" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Role Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Select Role</CardTitle>
                    <CardDescription>Choose a role to view its permissions</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {roles.map((role) => (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`w-full p-3 text-left rounded-lg border transition-colors ${
                          selectedRole === role
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{role}</span>
                          <Badge className={getRoleBadgeColor(role)}>
                            {ROLE_PERMISSIONS[role].length}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Role Permissions */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="capitalize">{selectedRole} Permissions</CardTitle>
                    <CardDescription>
                      All permissions assigned to the {selectedRole} role
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ROLE_PERMISSIONS[selectedRole].map((permission) => (
                        <div
                          key={permission}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="font-medium text-sm">{permission}</div>
                            <div className="text-xs text-gray-500">
                              {permission.split(':')[0]} module
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Feature Access Control</CardTitle>
                  <CardDescription>
                    Configure which roles can access specific features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {features.map(([featureName, allowedRoles]) => (
                      <div key={featureName} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium">{featureName.replace(/_/g, ' ')}</h3>
                          <Badge variant="outline">
                            {allowedRoles.length} role{allowedRoles.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {roles.map((role) => (
                            <Badge
                              key={role}
                              className={
                                hasFeatureAccess(allowedRoles, role)
                                  ? getRoleBadgeColor(role)
                                  : 'bg-gray-100 text-gray-400 border-gray-200'
                              }
                            >
                              {role}
                              {hasFeatureAccess(allowedRoles, role) ? (
                                <Check className="h-3 w-3 ml-1" />
                              ) : (
                                <X className="h-3 w-3 ml-1" />
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* UI Elements Tab */}
            <TabsContent value="ui" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>UI Element Visibility</CardTitle>
                  <CardDescription>
                    Control which UI elements are visible to different roles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {uiElements.map(([elementName, allowedRoles]) => (
                      <div key={elementName} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium">{elementName.replace(/_/g, ' ')}</h3>
                          <Badge variant="outline">
                            {allowedRoles.length} role{allowedRoles.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {roles.map((role) => (
                            <Badge
                              key={role}
                              className={
                                hasFeatureAccess(allowedRoles, role)
                                  ? getRoleBadgeColor(role)
                                  : 'bg-gray-100 text-gray-400 border-gray-200'
                              }
                            >
                              {role}
                              {hasFeatureAccess(allowedRoles, role) ? (
                                <Check className="h-3 w-3 ml-1" />
                              ) : (
                                <X className="h-3 w-3 ml-1" />
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Info Card */}
          <Card className="mt-8 bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Permission System Information</h3>
                  <p className="text-blue-700 text-sm">
                    This system uses role-based access control (RBAC) to manage permissions. 
                    Roles are hierarchical, with higher-level roles inheriting permissions from lower levels. 
                    To modify permissions, update the configuration files in <code>/src/config/permissions.ts</code> 
                    and <code>/src/lib/rbac/permissions.ts</code>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionGuard>
  )
}
