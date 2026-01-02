'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { useAdmin } from '@/lib/admin/hooks'
import { UserProfileEditModal } from '@/components/admin/UserProfileEditModal'
import { PasswordResetModal } from '@/components/admin/PasswordResetModal'
import { AccountMergeModal } from '@/components/admin/AccountMergeModal'
import { UserRoleAssignmentModal } from '@/components/admin/rbac/UserRoleAssignmentModal'
import { AddUserModal } from '@/components/admin/AddUserModal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { theme, brandColors } from '@/lib/theme'
import Pagination from '@/components/ui/pagination'
import { defaultLogger as logger } from '@/lib/logger'

import { 
  Users, 
  Search, 
  UserCog,
  KeyRound,
  GitMerge,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Trash2,
  AlertTriangle,
  MoreVertical,
  LayoutDashboard,
  Mail,
  Calendar,
  Phone,
  User,
  UserPlus
} from 'lucide-react'

// Types
interface User {
  id: string
  email: string
  display_name?: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
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

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function AdminUsersPage() {
  const { containerVariant } = useLayout()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [editProfileModal, setEditProfileModal] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null })
  const [passwordResetModal, setPasswordResetModal] = useState<{ open: boolean; userId: string | null; userEmail: string | null }>({ open: false, userId: null, userEmail: null })
  const [mergeAccountModal, setMergeAccountModal] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null })
  const [roleAssignmentModal, setRoleAssignmentModal] = useState<{ open: boolean; userId: string | null; userEmail: string | null }>({ open: false, userId: null, userEmail: null })
  const [availableRoles, setAvailableRoles] = useState<Array<{ id: string; name: string; display_name: string; description: string; is_system: boolean }>>([])
  const [userCurrentRoles, setUserCurrentRoles] = useState<string[]>([])
  const [loadingUserRoles, setLoadingUserRoles] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string | null; userEmail: string | null }>({ open: false, userId: null, userEmail: null })
  const [deleting, setDeleting] = useState(false)
  const [openMenuForId, setOpenMenuForId] = useState<string | null>(null)
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const [selectedUserForActions, setSelectedUserForActions] = useState<User | null>(null)
  const [addUserModalOpen, setAddUserModalOpen] = useState(false)
  const { user: currentUser } = useAdmin()

  // Fetch users with pagination, search, and filtering
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && roleFilter !== 'all' && { role: roleFilter })
      })

      const usersRes = await safeFetch(`/api/admin/users?${params.toString()}`)

      if (usersRes.ok) {
        setUsers(usersRes.data?.users || [])
        if (usersRes.data?.pagination) {
          setPagination(usersRes.data.pagination)
        }
      } else {
        toast.error('Error', { description: usersRes.error || 'Failed to fetch users' })
      }
    } catch (error) {
      const errorDetails = error instanceof Error 
        ? { message: error.message, name: error.name }
        : { error: String(error) }
      logger.error('Fetch error:', error instanceof Error ? error : undefined, errorDetails)
      toast.error('Error', { description: 'Failed to fetch users' })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, searchTerm, roleFilter, toast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [searchTerm, roleFilter])

  // Fetch available roles for filter dropdown and role assignment
  const fetchRoles = useCallback(async () => {
    try {
      const rolesRes = await safeFetch('/api/admin/roles')
      if (rolesRes.ok) {
        const roles = rolesRes.data?.roles || []
        setAvailableRoles(roles.map((role: any) => ({
          id: role.id,
          name: role.name,
          display_name: role.display_name,
          description: role.description || '',
          is_system: role.is_system || false
        })))
      }
    } catch (error) {
      const errorDetails = error instanceof Error 
        ? { message: error.message, name: error.name }
        : { error: String(error) }
      logger.error('Error fetching roles:', error instanceof Error ? error : undefined, errorDetails)
      toast.error('Error', { description: 'Failed to fetch roles' })
    }
  }, [toast])

  // Fetch user's current roles
  const fetchUserRoles = useCallback(async (userId: string) => {
    try {
      setLoadingUserRoles(true)
      const rolesRes = await safeFetch(`/api/admin/users/${userId}/roles`)
      if (rolesRes.ok) {
        const userRoles = rolesRes.data?.userRoles || []
        // Extract role_id from each user role assignment
        const roleIds = userRoles
          .map((ur: any) => {
            // Handle both direct role_id and nested role object
            return ur.role_id || (ur.role && (Array.isArray(ur.role) ? ur.role[0]?.id : ur.role.id))
          })
          .filter(Boolean)
        setUserCurrentRoles(roleIds)
      } else {
        toast.error('Error', { description: rolesRes.error || 'Failed to fetch user roles' })
        setUserCurrentRoles([])
      }
    } catch (error) {
      const errorDetails = error instanceof Error 
        ? { message: error.message, name: error.name, userId }
        : { error: String(error), userId }
      logger.error('Error fetching user roles:', error instanceof Error ? error : undefined, errorDetails)
      toast.error('Error', { description: 'Failed to fetch user roles' })
      setUserCurrentRoles([])
    } finally {
      setLoadingUserRoles(false)
    }
  }, [toast])

  // Handle opening role assignment modal
  const handleOpenRoleAssignment = async (userId: string, userEmail: string) => {
    setRoleAssignmentModal({ open: true, userId, userEmail })
    await fetchUserRoles(userId)
  }

  // Handle saving role assignments
  const handleSaveRoles = async (userId: string, roleIds: string[]) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role_ids: roleIds })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign roles')
      }

      toast.success('Success', {
        description: 'User roles updated successfully'
      })

      // Refresh users list to show updated roles
      await fetchUsers()
      
      // Close modal
      setRoleAssignmentModal({ open: false, userId: null, userEmail: null })
    } catch (error) {
      const errorDetails = error instanceof Error 
        ? { message: error.message, name: error.name, userId }
        : { error: String(error), userId }
      logger.error('Error saving roles:', error instanceof Error ? error : undefined, errorDetails)
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to assign roles'
      })
      throw error
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuForId) {
        setOpenMenuForId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuForId])

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!deleteDialog.userId || deleting) return

    try {
      setDeleting(true)

      const response = await fetch(`/api/admin/users/${deleteDialog.userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.message || errorData.error || 'Failed to delete user'
        
        // Check if it's a validation error (user has activities that cannot be removed)
        if (response.status === 400 && errorMessage.includes('related activities')) {
          // Show a more user-friendly error message
          toast.error('Cannot Delete User', {
            description: errorMessage,
            duration: 6000,
          })
        } else {
          throw new Error(errorMessage)
        }
        
        return
      }

      toast.success('Success', {
        description: 'User deleted successfully. Role assignments were automatically removed if present.'
      })

      setDeleteDialog({ open: false, userId: null, userEmail: null })
      await fetchUsers()
    } catch (error) {
      // Properly extract error information for logging
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user'
      const errorDetails = error instanceof Error 
        ? { 
            message: error.message,
            name: error.name,
            stack: error.stack,
            userId: deleteDialog.userId 
          }
        : { 
            error: String(error),
            userId: deleteDialog.userId 
          }
      
      logger.error('Error deleting user:', error instanceof Error ? error : undefined, errorDetails)
      toast.error('Error', {
        description: errorMessage,
      })
    } finally {
      setDeleting(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }


  return (
    <PermissionGuard permission="admin:users">
      <div className="min-h-screen bg-gray-50">
        <Container variant={containerVariant} className="py-4 sm:py-6">
        {/* Enhanced Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-white via-indigo-50/30 to-white rounded-xl border border-gray-200/60 shadow-sm p-4 sm:p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="relative shrink-0">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
                  <LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-400 rounded-full border-2 border-white"></div>
              </div>

              {/* Title and Description */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                  User Management
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage user profiles, reset passwords, and merge accounts
          </p>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-xl">Users</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">
                  {pagination.total > 0 
                    ? `Showing ${((pagination.page - 1) * pagination.limit) + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} users`
                    : 'Manage users and their accounts'
                  }
                </CardDescription>
              </div>
              <Button
                onClick={() => setAddUserModalOpen(true)}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add User</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm sm:text-base"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="no-roles">No Roles</SelectItem>
                    {availableRoles.map(role => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Users Table */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || roleFilter !== 'all' 
                  ? 'No users found matching your criteria' 
                  : 'No users found'
                }
              </div>
            ) : (
              <>
                <div className="space-y-2 sm:space-y-3">
                  {users.map(user => {
                    const getInitials = (user: User) => {
                      // Prefer first_name and last_name
                      if (user.first_name || user.last_name) {
                        const first = user.first_name?.charAt(0) || ''
                        const last = user.last_name?.charAt(0) || ''
                        if (first && last) {
                          return (first + last).toUpperCase()
                        }
                        if (first) return first.toUpperCase()
                        if (last) return last.toUpperCase()
                      }
                      // Fallback to display_name
                      if (user.display_name && user.display_name !== user.email.split('@')[0]) {
                        const nameParts = user.display_name.split(' ')
                        if (nameParts.length >= 2) {
                          return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                        }
                        return user.display_name.substring(0, 2).toUpperCase()
                      }
                      // Final fallback to email
                      return user.email.charAt(0).toUpperCase()
                    }

                    const formatDate = (dateString?: string) => {
                      if (!dateString) return null
                      const date = new Date(dateString)
                      const now = new Date()
                      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
                      
                      if (diffInDays === 0) return 'Today'
                      if (diffInDays === 1) return 'Yesterday'
                      if (diffInDays < 7) return `${diffInDays} days ago`
                      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    }

                    return (
                    <div
                      key={user.id}
                        className="group relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-indigo-200/50 transition-all duration-200 overflow-hidden"
                      >
                        <div 
                          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 sm:cursor-default"
                          onClick={(e) => {
                            // Only open bottom sheet on mobile, and prevent if clicking action buttons
                            if (window.innerWidth < 640 && !(e.target as HTMLElement).closest('button')) {
                              setSelectedUserForActions(user)
                              setBottomSheetOpen(true)
                            }
                          }}
                    >
                          <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0 w-full">
                            {/* Enhanced Avatar */}
                            <div className="relative flex-shrink-0">
                              <Avatar className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 ring-2 ring-gray-100 group-hover:ring-indigo-200 transition-all duration-200">
                                <AvatarFallback className="text-xs sm:text-sm md:text-base font-bold bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                                  {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                              {user.roles.some(r => r.name === 'administrator' || r.name === 'super_admin') && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                                  <Shield className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-yellow-900" />
                                </div>
                              )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0 w-full">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-xs sm:text-sm text-gray-900 truncate break-words">
                                    {user.first_name || user.last_name
                                      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                      : user.display_name && user.display_name !== user.email.split('@')[0]
                                      ? user.display_name
                                      : user.email.split('@')[0]}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-1.5 sm:gap-2 md:gap-3 text-[10px] sm:text-xs text-gray-500 mb-1">
                                <div className="flex items-center gap-1 min-w-0 flex-1 sm:flex-initial">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate min-w-0">{user.email}</span>
                                </div>
                                {user.phone && (
                                  <div className="flex items-center gap-1 min-w-0 flex-1 sm:flex-initial">
                                    <Phone className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate min-w-0">{user.phone}</span>
                                  </div>
                          )}
                              </div>
                              {user.last_sign_in_at && (
                                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] md:text-xs text-gray-400 mb-1.5">
                                  <Calendar className="h-2.5 w-2.5 flex-shrink-0" />
                                  <span className="truncate">Last active: {formatDate(user.last_sign_in_at)}</span>
                                </div>
                              )}
                              
                              {/* Role Badges */}
                              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                            {user.roles.length > 0 ? (
                                  user.roles.map(role => (
                                    <Badge 
                                      key={role.id} 
                                      variant="outline" 
                                      className={`text-[8px] sm:text-[9px] md:text-[10px] font-medium py-0 px-1 sm:px-1.5 ${
                                        role.name === 'administrator' || role.name === 'super_admin'
                                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                          : role.name === 'donor'
                                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                                          : 'bg-gray-50 text-gray-700 border-gray-200'
                                      }`}
                                    >
                                      {role.name === 'administrator' || role.name === 'super_admin' ? (
                                        <>
                                          <Shield className="h-2 w-2 mr-0.5 hidden sm:inline" />
                                          <span className="truncate">{role.display_name}</span>
                                        </>
                                      ) : (
                                        <span className="truncate">{role.display_name}</span>
                                      )}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="outline" className="text-[8px] sm:text-[9px] md:text-[10px] bg-orange-50 text-orange-600 border-orange-200 py-0 px-1 sm:px-1.5">
                                    No roles
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons - Desktop */}
                          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRoleAssignment(user.id, user.email)}
                          title="Assign Roles"
                              className="h-8 w-8 md:h-9 md:w-9 p-0 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                        >
                              <Shield className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditProfileModal({ open: true, userId: user.id })}
                          title="Edit Profile"
                              className="h-8 w-8 md:h-9 md:w-9 p-0 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all"
                        >
                              <UserCog className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPasswordResetModal({ open: true, userId: user.id, userEmail: user.email })}
                          title="Reset Password"
                              className="h-8 w-8 md:h-9 md:w-9 p-0 border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600 transition-all"
                        >
                              <KeyRound className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMergeAccountModal({ open: true, userId: user.id })}
                          title="Merge Account"
                              className="h-8 w-8 md:h-9 md:w-9 p-0 border-gray-200 hover:border-green-300 hover:bg-green-50 hover:text-green-600 transition-all"
                        >
                              <GitMerge className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, userId: user.id, userEmail: user.email })}
                          title="Delete User"
                              className="h-8 w-8 md:h-9 md:w-9 p-0 border-gray-200 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-all"
                        >
                              <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="mt-4 sm:mt-6 pt-4 border-t">
                    <Pagination
                      page={pagination.page}
                      totalPages={pagination.totalPages}
                      total={pagination.total}
                      limit={pagination.limit}
                      onPageChange={handlePageChange}
                      showItemCount={true}
                      itemName="users"
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* User Profile Edit Modal */}
        <UserProfileEditModal
          open={editProfileModal.open}
          userId={editProfileModal.userId}
          onClose={() => setEditProfileModal({ open: false, userId: null })}
          onSuccess={() => {
            fetchUsers()
            toast.success('Success', { description: 'User profile updated successfully' })
          }}
        />

        {/* Password Reset Modal */}
        <PasswordResetModal
          open={passwordResetModal.open}
          userId={passwordResetModal.userId}
          userEmail={passwordResetModal.userEmail}
          onClose={() => setPasswordResetModal({ open: false, userId: null, userEmail: null })}
          onSuccess={() => {
            toast.success('Success', { description: 'Password reset email sent successfully' })
          }}
        />

        {/* Account Merge Modal */}
        <AccountMergeModal
          open={mergeAccountModal.open}
          sourceUserId={mergeAccountModal.userId}
          onClose={() => setMergeAccountModal({ open: false, userId: null })}
          onSuccess={() => {
            fetchUsers()
            toast.success('Success', { description: 'Accounts merged successfully' })
          }}
        />

        {/* Role Assignment Modal */}
        {roleAssignmentModal.userId && roleAssignmentModal.userEmail && (
          <UserRoleAssignmentModal
            open={roleAssignmentModal.open}
            onClose={() => setRoleAssignmentModal({ open: false, userId: null, userEmail: null })}
            userId={roleAssignmentModal.userId}
            userEmail={roleAssignmentModal.userEmail}
            currentRoles={userCurrentRoles}
            allRoles={availableRoles}
            onSave={async (roleIds) => {
              await handleSaveRoles(roleAssignmentModal.userId!, roleIds)
            }}
          />
        )}

        {/* Mobile Bottom Sheet for Actions */}
        <Dialog open={bottomSheetOpen} onOpenChange={(open) => {
          setBottomSheetOpen(open)
          if (!open) {
            setSelectedUserForActions(null)
          }
        }}>
          <DialogContent className="sm:hidden !fixed !bottom-0 !left-0 !right-0 !top-auto !translate-x-0 !translate-y-0 rounded-t-2xl rounded-b-none max-w-full w-full max-h-[80vh] p-0 gap-0 [&>button]:hidden">
            <div className="w-full">
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>
              
              {/* Header */}
              <div className="px-4 pb-3 border-b border-gray-200">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">
                    {selectedUserForActions?.first_name || selectedUserForActions?.last_name
                      ? `${selectedUserForActions.first_name || ''} ${selectedUserForActions.last_name || ''}`.trim()
                      : selectedUserForActions?.display_name || selectedUserForActions?.email?.split('@')[0] || 'User'}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-500">
                    {selectedUserForActions?.email}
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* Action Items */}
              <div className="px-4 py-2 max-h-[60vh] overflow-y-auto">
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      if (selectedUserForActions) {
                        setBottomSheetOpen(false)
                        handleOpenRoleAssignment(selectedUserForActions.id, selectedUserForActions.email)
                      }
                    }}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-indigo-100">
                      <Shield className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Assign Roles</div>
                      <div className="text-xs text-gray-500">Manage user permissions</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      if (selectedUserForActions) {
                        setBottomSheetOpen(false)
                        setEditProfileModal({ open: true, userId: selectedUserForActions.id })
                      }
                    }}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-blue-100">
                      <UserCog className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Edit Profile</div>
                      <div className="text-xs text-gray-500">Update user information</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      if (selectedUserForActions) {
                        setBottomSheetOpen(false)
                        setPasswordResetModal({ open: true, userId: selectedUserForActions.id, userEmail: selectedUserForActions.email })
                      }
                    }}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-purple-100">
                      <KeyRound className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Reset Password</div>
                      <div className="text-xs text-gray-500">Send password reset email</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      if (selectedUserForActions) {
                        setBottomSheetOpen(false)
                        setMergeAccountModal({ open: true, userId: selectedUserForActions.id })
                      }
                    }}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-green-100">
                      <GitMerge className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Merge Account</div>
                      <div className="text-xs text-gray-500">Combine with another account</div>
                    </div>
                  </button>

                  <div className="border-t border-gray-200 my-2"></div>

                  <button
                    onClick={() => {
                      if (selectedUserForActions) {
                        setBottomSheetOpen(false)
                        setDeleteDialog({ open: true, userId: selectedUserForActions.id, userEmail: selectedUserForActions.email })
                      }
                    }}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-red-100">
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-red-600">Delete User</div>
                      <div className="text-xs text-gray-500">Permanently remove account</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Cancel Button */}
              <div className="px-4 pb-4 pt-2 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setBottomSheetOpen(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, userId: null, userEmail: null })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Delete User
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2">
                  <div>
                    Are you sure you want to delete <strong>{deleteDialog.userEmail}</strong>?
                  </div>
                  <div className="text-sm text-muted-foreground">
                    This action will permanently delete the user account. Users can only be deleted if they have no related activities (contributions, cases, projects, role assignments, messages, notifications, etc.).
                  </div>
                  <div className="text-sm font-medium text-red-600 mt-2">
                    This action cannot be undone!
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialog({ open: false, userId: null, userEmail: null })}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add User Modal */}
        <AddUserModal
          open={addUserModalOpen}
          onClose={() => setAddUserModalOpen(false)}
          onSuccess={() => {
            fetchUsers()
            setAddUserModalOpen(false)
          }}
          availableRoles={availableRoles}
        />
        </Container>
      </div>
    </PermissionGuard>
  )
}
