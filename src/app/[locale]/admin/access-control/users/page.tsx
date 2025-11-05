'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import PermissionGuard from '../../../../../components/auth/PermissionGuard'
import { useDatabasePermissions } from '../../../../../lib/hooks/useDatabasePermissions'
import { UserRoleAssignmentModal } from '../../../../../components/admin/rbac/UserRoleAssignmentModal'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../../../components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '../../../../../components/ui/avatar'
import { Badge } from '../../../../../components/ui/badge'
import { Checkbox } from '../../../../../components/ui/checkbox'
import { Input } from '../../../../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select'
import { useToast } from '../../../../../hooks/use-toast'
import { Button } from '../../../../../components/ui/button' // Assuming this exists
import { 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  Search, 
  Settings, 
  AlertTriangle
} from 'lucide-react'

interface User {
  id: string
  email: string
  display_name: string
  roles: RoleAssignment[]
  created_at?: string
  last_sign_in_at?: string
}

interface RoleAssignment {
  id: string
  role_id: string
  name: string
  display_name: string
  description: string
  assigned_at: string
  assigned_by: string
}

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  is_system: boolean
  hierarchy_level?: number
  permissions_count: number
  users_count: number
}

interface Statistics {
  totalUsers: number
  usersWithRoles: number
  usersWithoutRoles: number
  roleBreakdown: Record<string, number>
}

export default function UserRoleAssignmentPage() {
  const t = useTranslations('rbac.users')
  const tCommon = useTranslations('rbac.common')
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [manageRolesModal, setManageRolesModal] = useState<{
    open: boolean
    user?: User
  }>({ open: false })
  const [bulkAssignModal, setBulkAssignModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })
  const { toast } = useToast()
  const { user: currentUser } = useDatabasePermissions()

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch('/api/admin/rbac/users'),
        fetch('/api/admin/rbac/roles')
      ])

      if (usersRes.ok && rolesRes.ok) {
        const usersData = await usersRes.json()
        const rolesData = await rolesRes.json()
        setUsers(usersData.users || [])
        // Map roles to ensure permissions_count and users_count are present
        interface RoleFromAPI {
          id: string
          name: string
          display_name: string
          description: string
          is_system: boolean
          permissions?: Array<{ id: string }>
          permissions_count?: number
          users_count?: number
          user_count?: number
        }
        const mappedRoles = ((rolesData.roles || []) as RoleFromAPI[]).map((role) => ({
          ...role,
          permissions_count: role.permissions_count ?? role.permissions?.length ?? 0,
          users_count: role.users_count ?? role.user_count ?? 0
        }))
        setRoles(mappedRoles)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch data',
          type: 'error'
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate statistics
  const statistics: Statistics = useMemo(() => {
    const totalUsers = users.length
    const usersWithRoles = users.filter(u => u.roles.length > 0).length
    const usersWithoutRoles = totalUsers - usersWithRoles
    const roleBreakdown: Record<string, number> = {}

    users.forEach(user => {
      user.roles.forEach(role => {
        roleBreakdown[role.display_name] = (roleBreakdown[role.display_name] || 0) + 1
      })
    })

    return {
      totalUsers,
      usersWithRoles,
      usersWithoutRoles,
      roleBreakdown
    }
  }, [users])

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.display_name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesRole = roleFilter === 'all' || 
                         (roleFilter === 'no-roles' && user.roles.length === 0) ||
                         user.roles.some(role => role.name === roleFilter)

      return matchesSearch && matchesRole
    })
  }, [users, searchTerm, roleFilter])

  // Handle role assignment
  const handleRoleAssignment = async (userId: string, roleIds: string[]) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    const warning = checkAdminWarnings(user, roleIds)
    if (warning) {
      // If it's an error (self-removal), prevent the action
      if (warning.startsWith('Error:')) {
        toast({
          title: 'Error',
          description: warning,
          type: 'error'
        })
        return
      }
      
      // If it's a warning, show confirmation dialog
      setConfirmDialog({
        open: true,
        title: 'Confirm Role Change',
        description: warning,
        onConfirm: async () => {
          await performRoleAssignment(userId, roleIds)
          setConfirmDialog({ open: false, title: '', description: '', onConfirm: () => {} })
        }
      })
    } else {
      await performRoleAssignment(userId, roleIds)
    }
  }

  // Perform the actual role assignment
  const performRoleAssignment = async (userId: string, roleIds: string[]) => {
    try {
      const response = await fetch('/api/admin/rbac/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roleIds })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Roles assigned successfully',
          type: 'success'
        })
        fetchData() // Refresh data
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'Failed to assign roles',
          type: 'error'
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to assign roles',
        type: 'error'
      })
    }
  }

  // Check for admin role warnings
  const checkAdminWarnings = (user: User, newRoleIds: string[]) => {
    const adminRole = roles.find(r => r.name === 'admin')
    const hasAdminCurrently = user.roles.some(r => r.role_id === adminRole?.id)
    const willHaveAdmin = newRoleIds.includes(adminRole?.id || '')
    
    // Check if current user is trying to remove their own admin role
    if (currentUser && user.id === currentUser.id && hasAdminCurrently && !willHaveAdmin) {
      return t('confirmations.cannotRemoveOwnAdmin')
    }
    
    if (hasAdminCurrently && !willHaveAdmin) {
      // Removing last admin role
      return t('confirmations.removingLastAdmin')
    }
    
    return null
  }

  // Open manage roles modal
  const openManageRolesModal = (user: User) => {
    setManageRolesModal({ open: true, user })
  }

  // Bulk assign roles
  const handleBulkAssign = () => {
    setBulkAssignModal(true)
  }

  const saveBulkAssign = () => {
    // Implement bulk assignment logic
    selectedUsers.forEach(userId => {
      handleRoleAssignment(userId, selectedRoles)
    })
    setBulkAssignModal(false)
    setSelectedUsers([])
    setSelectedRoles([])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <PermissionGuard permission="manage:rbac">
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.totalUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.usersWithRoles')}</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.usersWithRoles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.usersWithoutRoles')}</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.usersWithoutRoles}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.roleBreakdown')}</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {Object.entries(statistics.roleBreakdown).slice(0, 3).map(([role, count]) => (
                  <div key={role} className="flex justify-between">
                    <span>{role}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={tCommon('searchUsersPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={tCommon('filterByRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tCommon('allUsers')}</SelectItem>
                <SelectItem value="no-roles">{tCommon('noRoles')}</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedUsers.length > 0 && (
            <Button onClick={handleBulkAssign}>
              Assign Roles to {selectedUsers.length} Users
            </Button>
          )}
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4">
                      <Checkbox
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(filteredUsers.map(u => u.id))
                          } else {
                            setSelectedUsers([])
                          }
                        }}
                      />
                    </th>
                    <th className="text-left p-4">{t('table.user')}</th>
                    <th className="text-left p-4">{t('table.assignedRoles')}</th>
                    <th className="text-left p-4">{t('table.roleCount')}</th>
                    <th className="text-left p-4">{t('table.lastUpdated')}</th>
                    <th className="text-left p-4">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers([...selectedUsers, user.id])
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                            }
                          }}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src="" />
                            <AvatarFallback>
                              {user.display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.display_name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.slice(0, 3).map(role => (
                            <Badge key={role.id} variant="secondary">
                              {role.display_name}
                            </Badge>
                          ))}
                          {user.roles.length > 3 && (
                            <Badge variant="outline">+{user.roles.length - 3}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{user.roles.length}</td>
                      <td className="p-4">
                        {user.roles.length > 0 ? 
                          new Date(Math.max(...user.roles.map(r => new Date(r.assigned_at).getTime()))).toLocaleDateString() 
                          : t('table.never')
                        }
                      </td>
                      <td className="p-4">
                        <Button variant="outline" size="sm" onClick={() => openManageRolesModal(user)}>
                          <Settings className="h-4 w-4 mr-2" />
                          {t('manageRoles')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Manage Roles Modal */}
        <UserRoleAssignmentModal
          open={manageRolesModal.open}
          onClose={() => setManageRolesModal({ open: false })}
          userId={manageRolesModal.user?.id || ''}
          userEmail={manageRolesModal.user?.email || ''}
          currentRoles={manageRolesModal.user?.roles.map(r => r.role_id) || []}
          allRoles={roles}
          onSave={async (roleIds: string[]) => {
            await handleRoleAssignment(manageRolesModal.user!.id, roleIds)
            setManageRolesModal({ open: false })
          }}
        />

        {/* Bulk Assign Modal */}
        <Dialog open={bulkAssignModal} onOpenChange={setBulkAssignModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('modals.bulkAssignTitle')}</DialogTitle>
              <DialogDescription>
                {t('modals.bulkAssignDescription', { count: selectedUsers.length })}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{t('modals.selectRolesToAssign')}</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bulk-${role.id}`}
                        checked={selectedRoles.includes(role.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRoles([...selectedRoles, role.id])
                          } else {
                            setSelectedRoles(selectedRoles.filter(id => id !== role.id))
                          }
                        }}
                      />
                      <label htmlFor={`bulk-${role.id}`} className="text-sm cursor-pointer">
                        {role.display_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkAssignModal(false)}>
                Cancel
              </Button>
              <Button onClick={saveBulkAssign}>
                {t('modals.assignToUsers', { count: selectedUsers.length })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                {confirmDialog.title}
              </DialogTitle>
              <DialogDescription>
                {confirmDialog.description}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDialog({ open: false, title: '', description: '', onConfirm: () => {} })}>
                Cancel
              </Button>
              <Button onClick={confirmDialog.onConfirm}>
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  )
}