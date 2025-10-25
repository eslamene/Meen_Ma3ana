'use client'

import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  Users, 
  Key, 
  ArrowRight,
  AlertTriangle
} from 'lucide-react'
import { useDatabaseRBAC } from '@/lib/hooks/useDatabaseRBAC'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

export default function RBACOverviewPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const { roles, permissions, loading } = useDatabaseRBAC()

  const rbacModules = [
    {
      id: 'roles',
      title: 'Role Management',
      description: 'Create and manage user roles with specific permissions',
      icon: Shield,
      href: `/admin/rbac/roles`,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      count: roles.length,
      countLabel: 'roles'
    },
    {
      id: 'permissions',
      title: 'Permission Management',
      description: 'Create and manage system permissions for roles',
      icon: Key,
      href: `/admin/rbac/permissions`,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      count: permissions.length,
      countLabel: 'permissions'
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Assign roles to users and manage user permissions',
      icon: Users,
      href: `/admin/rbac/users`,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      count: null, // We don't have user count readily available
      countLabel: 'users'
    }
  ]

  const navigateToModule = (href: string) => {
    router.push(`/${locale}${href}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading RBAC overview...</p>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard allowedPermissions={['admin:rbac']} fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to access RBAC management.</p>
        </div>
      </div>
    }>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">RBAC Management</h1>
          <p className="text-gray-600">Role-Based Access Control system for managing user permissions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rbacModules.map((module) => {
            const IconComponent = module.icon
            return (
              <Card 
                key={module.id} 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => navigateToModule(module.href)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 ${module.bgColor} rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className={`h-6 w-6 ${module.iconColor}`} />
                    </div>
                    {module.count !== null && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{module.count}</div>
                        <div className="text-sm text-gray-500">{module.countLabel}</div>
                      </div>
                    )}
                    </div>
                  </CardHeader>
                    <CardContent>
                  <CardTitle className="text-lg mb-2 group-hover:text-blue-600 transition-colors">
                    {module.title}
                  </CardTitle>
                  <CardDescription className="mb-4">
                    {module.description}
                  </CardDescription>
                  <Button 
                    variant="outline" 
                    className="w-full group-hover:bg-blue-50 group-hover:border-blue-300 transition-colors"
                  >
                    Manage {module.title.split(' ')[0]}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
                          </div>
                          
        {/* Quick Stats */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roles.length}</div>
                <p className="text-xs text-muted-foreground">
                  {roles.filter(r => !r.is_system).length} custom roles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                    <CardContent>
                <div className="text-2xl font-bold">{permissions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {permissions.filter(p => !p.is_system).length} custom permissions
                </p>
                    </CardContent>
                </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">
                  RBAC system operational
                </p>
              </CardContent>
            </Card>
              </div>
            </div>

        {/* Quick Actions */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => navigateToModule('/admin/rbac/roles')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Shield className="mr-2 h-4 w-4" />
              Create New Role
            </Button>
              <Button
                variant="outline"
              onClick={() => navigateToModule('/admin/rbac/permissions')}
              >
              <Key className="mr-2 h-4 w-4" />
              Add Permission
              </Button>
            <Button 
              variant="outline"
              onClick={() => navigateToModule('/admin/rbac/users')}
            >
              <Users className="mr-2 h-4 w-4" />
              Assign User Roles
              </Button>
            </div>
        </div>
      </div>
    </PermissionGuard>
  )
}