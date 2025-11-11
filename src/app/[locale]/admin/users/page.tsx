'use client'

import React, { useState, useEffect, useCallback } from 'react'
import PermissionGuard from '@/components/auth/PermissionGuard'
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
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  Search, 
  UserCog,
  KeyRound,
  GitMerge,
  Settings
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [editProfileModal, setEditProfileModal] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null })
  const [passwordResetModal, setPasswordResetModal] = useState<{ open: boolean; userId: string | null; userEmail: string | null }>({ open: false, userId: null, userEmail: null })
  const [mergeAccountModal, setMergeAccountModal] = useState<{ open: boolean; userId: string | null }>({ open: false, userId: null })
  const { toast } = useToast()
  const { user: currentUser } = useAdmin()

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const usersRes = await safeFetch('/api/admin/users')

      if (usersRes.ok) {
        setUsers(usersRes.data?.users || [])
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch users',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Get unique roles for filter
  const allRoles = Array.from(new Set(
    users.flatMap(u => u.roles.map(r => r.name))
  ))

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    
    const matchesRole = roleFilter === 'all' || 
                       (roleFilter === 'no-roles' && user.roles.length === 0) ||
                       user.roles.some(r => r.name === roleFilter)
    
    return matchesSearch && matchesRole
  })

  return (
    <PermissionGuard permission="admin:users">
      <div className="container mx-auto py-6 space-y-6">
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
                <CardDescription>Manage users and their accounts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
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
                  {allRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Users Table */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map(user => (
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
                        <div className="text-sm text-muted-foreground">
                          {user.roles.length > 0 ? (
                            <div className="flex gap-2 mt-1">
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
            toast({
              title: 'Success',
              description: 'User profile updated successfully'
            })
          }}
        />

        {/* Password Reset Modal */}
        <PasswordResetModal
          open={passwordResetModal.open}
          userId={passwordResetModal.userId}
          userEmail={passwordResetModal.userEmail}
          onClose={() => setPasswordResetModal({ open: false, userId: null, userEmail: null })}
          onSuccess={() => {
            toast({
              title: 'Success',
              description: 'Password reset email sent successfully'
            })
          }}
        />

        {/* Account Merge Modal */}
        <AccountMergeModal
          open={mergeAccountModal.open}
          sourceUserId={mergeAccountModal.userId}
          onClose={() => setMergeAccountModal({ open: false, userId: null })}
          onSuccess={() => {
            fetchUsers()
            toast({
              title: 'Success',
              description: 'Accounts merged successfully'
            })
          }}
        />
      </div>
    </PermissionGuard>
  )
}
