'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  Eye, 
  EyeOff, 
  User, 
  Key, 
  CheckCircle,
  Info
} from 'lucide-react'
import { useAdmin } from '@/lib/admin/hooks'

import { defaultLogger as logger } from '@/lib/logger'

interface UserRoleInfoProps {
  showDetails?: boolean
  className?: string
}

export default function UserRoleInfo({ showDetails = false, className = '' }: UserRoleInfoProps) {
  const { 
    user, 
    loading,
    roles,
    permissions
  } = useAdmin()
  
  const [showPermissions, setShowPermissions] = useState(showDetails)
  const [roleData, setRoleData] = useState<any>(null)
  const [isLoadingRoleData, setIsLoadingRoleData] = useState(true)

  // Fetch detailed role data from API
  useEffect(() => {
    const fetchRoleData = async () => {
      if (!user) return
      
      try {
        setIsLoadingRoleData(true)
        const response = await fetch('/api/profile/role')
        if (response.ok) {
          const data = await response.json()
          setRoleData(data)
        }
      } catch (error) {
        logger.error('Error fetching role data:', { error: error })
      } finally {
        setIsLoadingRoleData(false)
      }
    }

    fetchRoleData()
  }, [user])

  if (loading || isLoadingRoleData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user || !roleData || !roleData.roles || roleData.roles.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No role information available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const primaryRole = roleData.roles[0] // Get the first (primary) role from API data
  const userPermissions = roleData.permissions || []

  const getRoleColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200'
      case 'moderator': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'sponsor': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'volunteer': return 'bg-green-100 text-green-800 border-green-200'
      case 'donor': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin': return '👑'
      case 'moderator': return '🛡️'
      case 'sponsor': return '💎'
      case 'volunteer': return '🤝'
      case 'donor': return '❤️'
      default: return '👤'
    }
  }

  type Permission = { id: string; name: string; resource?: string; display_name?: string; description?: string }
  const getPermissionCategory = (permission: Permission) => {
    const resource = permission.resource || permission.name?.split(':')[0] || 'general'
    switch (resource.toLowerCase()) {
      case 'admin': return 'Administration'
      case 'cases': return 'Case Management'
      case 'contributions': return 'Contributions'
      case 'users': return 'User Management'
      case 'projects': return 'Projects'
      case 'sponsorships': return 'Sponsorships'
      case 'beneficiaries': return 'Beneficiaries'
      case 'profile': return 'Profile'
      case 'notifications': return 'Notifications'
      case 'reports': return 'Reports'
      default: return 'General'
    }
  }

  const groupedPermissions = userPermissions.reduce((acc: Record<string, Permission[]>, permission: Permission) => {
    const category = getPermissionCategory(permission)
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(permission)
    return acc
  }, {})

  return (
    <Card className={`${className} ${getRoleColor(primaryRole.name).split(' ')[0]} border-2`}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Shield className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-xl text-purple-900">Role Information</CardTitle>
            <CardDescription className="text-purple-700">
              Your current access level and permissions
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Primary Role Display */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{getRoleIcon(primaryRole.name)}</span>
            <div>
              <h3 className="text-2xl font-bold text-purple-900">{primaryRole.display_name}</h3>
              <p className="text-purple-700 text-sm">{primaryRole.description}</p>
            </div>
          </div>
          
          {/* Additional Roles */}
          {roleData.roles.length > 1 && (
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-2">Additional Roles:</p>
              <div className="flex flex-wrap gap-2">
                {roleData.roles.slice(1).map((role: { id: string; display_name: string }) => (
                  <Badge 
                    key={role.id} 
                    variant="outline" 
                    className="text-xs"
                  >
                    {role.display_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Permissions Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Key className="h-4 w-4" />
              Permissions ({roleData.total_permissions || userPermissions.length})
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPermissions(!showPermissions)}
              className="text-purple-600 hover:text-purple-700"
            >
              {showPermissions ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Show Details
                </>
              )}
            </Button>
          </div>

          {showPermissions ? (
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                <div key={category} className="bg-white rounded-lg p-4 shadow-sm">
                  <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    {category}
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(categoryPermissions as Array<{ id: string; name: string; description?: string; display_name?: string }>).map((permission) => (
                      <div 
                        key={permission.id} 
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>{permission.display_name || permission.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Info className="h-4 w-4" />
                <span>You have {roleData.total_permissions || userPermissions.length} permissions across {Object.keys(groupedPermissions).length} categories</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.keys(groupedPermissions).slice(0, 5).map((category) => (
                  <Badge key={category} variant="outline" className="text-xs">
                    {category}
                  </Badge>
                ))}
                {Object.keys(groupedPermissions).length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{Object.keys(groupedPermissions).length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Need More Access?</span>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            If you need additional permissions, contact your administrator or check if you&apos;re missing any required roles.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200">
              Contact Admin
            </Button>
            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200">
              Request Access
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
