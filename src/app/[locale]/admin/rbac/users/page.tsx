'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Users, 
  Edit, 
  UserCheck,
  AlertTriangle,
  Save
} from 'lucide-react'
import { useDatabaseRBAC } from '@/lib/hooks/useDatabaseRBAC'
import { Role } from '@/lib/rbac/database-rbac'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { useToast } from '@/hooks/use-toast'

export default function UserManagementPage() {
  const { roles, loading } = useDatabaseRBAC()
  const { toast } = useToast()
  
  const [showUserRoleDialog, setShowUserRoleDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // User management state
  const [users, setUsers] = useState<{ id: string; email: string }[]>([])
  const [userRoles, setUserRoles] = useState<{ user_id: string; role_id: string }[]>([])
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string } | null>(null)
  const [selectedUserRoles, setSelectedUserRoles] = useState<string[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Fetch users and their roles
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      
      // Fetch all users from Supabase Auth
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
        setUserRoles(data.userRoles)
      } else {
        throw new Error(data.error || 'Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to fetch users'
      })
    } finally {
      setLoadingUsers(false)
    }
  }

  // Open user role assignment dialog
  const openUserRoleDialog = (user: { id: string; email: string }) => {
    setSelectedUser(user)
    
    // Get current user roles
    const currentRoles = userRoles
      .filter(ur => ur.user_id === user.id)
      .map(ur => ur.role_id)
    
    setSelectedUserRoles(currentRoles)
    setShowUserRoleDialog(true)
  }

  // Save user role assignments
  const saveUserRoles = async () => {
    if (!selectedUser) return
    
    try {
      setSaving(true)
      
      const response = await fetch('/api/admin/assign-user-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          roleIds: selectedUserRoles
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          type: 'success',
          title: 'Success',
          description: 'User roles updated successfully'
        })
        
        // Signal that RBAC has been updated
        localStorage.setItem('rbac_updated', Date.now().toString())
        window.dispatchEvent(new CustomEvent('rbac-updated'))
        
        setShowUserRoleDialog(false)
        fetchUsers() // Refresh user data
      } else {
        throw new Error(data.error || 'Failed to update user roles')
      }
    } catch (error) {
      console.error('Error saving user roles:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to update user roles'
      })
    } finally {
      setSaving(false)
    }
  }

  // Toggle user role selection
  const toggleUserRole = (roleId: string) => {
    setSelectedUserRoles(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  // Get user role names
  const getUserRoleNames = (userId: string): string[] => {
    return userRoles
      .filter(ur => ur.user_id === userId)
      .map(ur => {
        const role = roles.find(r => r.id === ur.role_id)
        return role?.display_name || 'Unknown'
      })
  }

  // Fetch users when component mounts
  useEffect(() => {
    fetchUsers()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading user management...</p>
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
          <p className="text-gray-600">You don&apos;t have permission to manage users.</p>
        </div>
      </div>
    }>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">Assign roles and manage user permissions</p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Users ({users.length})</h2>
            <Button onClick={() => fetchUsers()} disabled={loadingUsers}>
              {loadingUsers ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              Refresh Users
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>User Role Assignment</CardTitle>
              <CardDescription>
                Manage user roles and permissions. Click on a user to assign or modify their roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => openUserRoleDialog(user)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {user.email?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-sm text-gray-500">
                            ID: {user.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getUserRoleNames(user.id).map((roleName) => (
                          <Badge key={roleName} variant="outline">
                            {roleName}
                          </Badge>
                        ))}
                        {getUserRoleNames(user.id).length === 0 && (
                          <Badge variant="outline" className="text-gray-400">
                            No roles
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Role Assignment Dialog */}
        <Dialog open={showUserRoleDialog} onOpenChange={setShowUserRoleDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Roles to User</DialogTitle>
              <DialogDescription>
                Select roles for {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={selectedUserRoles.includes(role.id)}
                      onCheckedChange={() => toggleUserRole(role.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`role-${role.id}`} className="font-medium">
                        {role.display_name}
                      </Label>
                      <p className="text-sm text-gray-500">{role.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowUserRoleDialog(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={saveUserRoles} disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Roles
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  )
}
