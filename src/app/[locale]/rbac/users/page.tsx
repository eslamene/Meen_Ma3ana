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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  Users, 
  Search, 
  UserCog,
  KeyRound,
  GitMerge,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

// Types
interface User {
  id: string
  email: string
  display_name?: string
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
  const [availableRoles, setAvailableRoles] = useState<Array<{ id: string; name: string; display_name: string }>>([])
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
      console.error('Fetch error:', error)
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

  // Fetch available roles for filter dropdown
  const fetchRoles = useCallback(async () => {
    try {
      const rolesRes = await safeFetch('/api/admin/roles')
      if (rolesRes.ok) {
        setAvailableRoles(rolesRes.data?.roles || [])
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
      toast.error('Error', { description: 'Failed to fetch roles' })
    }
  }, [toast])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const totalPages = pagination.totalPages
    const currentPage = pagination.page

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <PermissionGuard permission="admin:users">
      <div className="min-h-screen bg-gray-50">
        <Container variant={containerVariant} className="py-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage user profiles, reset passwords, and merge accounts
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  {pagination.total > 0 
                    ? `Showing ${((pagination.page - 1) * pagination.limit) + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} users`
                    : 'Manage users and their accounts'
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[200px]">
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
                <div className="space-y-2">
                  {users.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>
                            {user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.email}</div>
                          {user.display_name && user.display_name !== user.email.split('@')[0] && (
                            <div className="text-sm text-muted-foreground">{user.display_name}</div>
                          )}
                          <div className="text-sm text-muted-foreground mt-1">
                            {user.roles.length > 0 ? (
                              <div className="flex gap-2 flex-wrap">
                                {user.roles.map(role => (
                                  <Badge key={role.id} variant="outline">
                                    {role.display_name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-orange-600">No roles assigned</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditProfileModal({ open: true, userId: user.id })}
                          title="Edit Profile"
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPasswordResetModal({ open: true, userId: user.id, userEmail: user.email })}
                          title="Reset Password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMergeAccountModal({ open: true, userId: user.id })}
                          title="Merge Account"
                        >
                          <GitMerge className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.hasPrevPage}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {getPageNumbers().map((pageNum, index) => (
                          pageNum === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                              ...
                            </span>
                          ) : (
                            <Button
                              key={pageNum}
                              variant={pagination.page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum as number)}
                              className={`min-w-[40px] ${
                                pagination.page === pageNum
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : ''
                              }`}
                            >
                              {pageNum}
                            </Button>
                          )
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasNextPage}
                        className="flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
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
        </Container>
      </div>
    </PermissionGuard>
  )
}
