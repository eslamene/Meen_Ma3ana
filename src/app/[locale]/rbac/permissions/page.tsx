'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { PermissionFormModal } from '@/components/admin/rbac/PermissionFormModal'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Edit2, Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react'

interface Permission {
  id: string
  name: string
  display_name: string
  description: string
  resource: string
  action: string
  is_system: boolean
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export default function AdminPermissionsPage() {
  const { containerVariant } = useLayout()
  const params = useParams()
  const locale = params.locale as string
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [createPermissionModal, setCreatePermissionModal] = useState(false)
  const [editPermissionModal, setEditPermissionModal] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState<Permission | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  })

  // Fetch permissions
  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true)
      const permissionsRes = await safeFetch('/api/admin/permissions')

      if (permissionsRes.ok) {
        const allPermissions = permissionsRes.data?.permissions || []
        setPermissions(allPermissions)
        
        // Update pagination
        const total = allPermissions.length
        const totalPages = Math.ceil(total / pagination.limit)
        setPagination(prev => ({
          ...prev,
          total,
          totalPages,
          hasNextPage: prev.page < totalPages,
          hasPrevPage: prev.page > 1,
        }))
      } else {
        toast.error('Error', {
          description: 'Failed to fetch permissions'
        })
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Error', {
        description: 'Failed to fetch permissions'
      })
    } finally {
      setLoading(false)
    }
  }, [toast, pagination.limit])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  // Filter permissions by search term
  const filteredPermissions = useMemo(() => {
    if (!searchTerm) return permissions
    
    const searchLower = searchTerm.toLowerCase()
    return permissions.filter(permission =>
      permission.name.toLowerCase().includes(searchLower) ||
      permission.display_name.toLowerCase().includes(searchLower) ||
      permission.description.toLowerCase().includes(searchLower) ||
      permission.resource.toLowerCase().includes(searchLower) ||
      permission.action.toLowerCase().includes(searchLower)
    )
  }, [permissions, searchTerm])

  // Paginate filtered permissions
  const paginatedPermissions = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.limit
    const endIndex = startIndex + pagination.limit
    return filteredPermissions.slice(startIndex, endIndex)
  }, [filteredPermissions, pagination.page, pagination.limit])

  // Update pagination when filtered results change
  useEffect(() => {
    const total = filteredPermissions.length
    const totalPages = Math.ceil(total / pagination.limit)
    setPagination(prev => ({
      ...prev,
      total,
      totalPages,
      hasNextPage: prev.page < totalPages,
      hasPrevPage: prev.page > 1,
    }))
  }, [filteredPermissions.length, pagination.limit, pagination.page])

  // Reset to page 1 when search term changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [searchTerm])

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

  const handleCreatePermission = async (permissionData: {
    name: string
    display_name: string
    description: string
    resource: string
    action: string
  }) => {
    try {
      const response = await safeFetch('/api/admin/permissions', {
        method: 'POST',
        body: JSON.stringify(permissionData)
      })

      if (response.ok) {
        toast.success('Success', { description: 'Permission created successfully' })  
        setCreatePermissionModal(false)
        fetchPermissions()
      }
    } catch (error) {
      console.error('Create permission error:', error)
      toast.error('Error', {
        description: 'Failed to create permission'
      })
    }
  }

  const handleEditPermission = async (permissionData: {
    display_name: string
    description: string
  }) => {
    if (!selectedPermission) return

    try {
      const response = await safeFetch(`/api/admin/permissions/${selectedPermission.id}`, {
        method: 'PUT',
        body: JSON.stringify(permissionData)
      })

      if (response.ok) {
        toast.success('Success', {
          description: 'Permission updated successfully'
        })
        setEditPermissionModal(false)
        setSelectedPermission(undefined)
        fetchPermissions()
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to update permission'
      })
    }
  }

  return (
    <PermissionGuard permission="admin:permissions">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
        <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
          {/* Page Header */}
          <DetailPageHeader
            backUrl={`/${locale}/rbac`}
            icon={Shield}
            title="Permission Management"
            description="Create and manage permissions for role-based access control"
            backLabel="Back to RBAC"
            showBackButton={true}
            actions={
              <Button onClick={() => setCreatePermissionModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Permission
              </Button>
            }
          />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>
                  {loading 
                    ? 'Loading permissions...'
                    : pagination.total > 0
                    ? `Showing ${((pagination.page - 1) * pagination.limit) + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} permissions`
                    : searchTerm
                    ? 'No permissions match your search'
                    : 'No permissions found'
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search permissions by name, display name, description, resource, or action..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading permissions...</div>
            ) : paginatedPermissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No permissions match your search criteria' : 'No permissions found'}
              </div>
            ) : (
              <>
              <div className="space-y-2">
                {paginatedPermissions.map(permission => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{permission.display_name}</span>
                        {permission.is_system && (
                          <Badge variant="secondary">System</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {permission.description}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{permission.resource}</Badge>
                        <Badge variant="outline">{permission.action}</Badge>
                        <Badge variant="outline" className="font-mono text-xs">
                          {permission.name}
                        </Badge>
                      </div>
                    </div>
                    {!permission.is_system && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPermission(permission)
                          setEditPermissionModal(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrevPage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, index) => (
                        <React.Fragment key={index}>
                          {page === '...' ? (
                            <span className="px-2 text-muted-foreground">...</span>
                          ) : (
                            <Button
                              variant={pagination.page === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handlePageChange(page as number)}
                              className="min-w-[40px]"
                            >
                              {page}
                            </Button>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNextPage}
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

        {/* Create Permission Modal */}
        {createPermissionModal && (
          <PermissionFormModal
            open={createPermissionModal}
            onClose={() => setCreatePermissionModal(false)}
            onSubmit={handleCreatePermission}
          />
        )}

        {/* Edit Permission Modal */}
        {editPermissionModal && selectedPermission && (
          <PermissionFormModal
            open={editPermissionModal}
            onClose={() => {
              setEditPermissionModal(false)
              setSelectedPermission(undefined)
            }}
            onSubmit={handleEditPermission}
            permission={selectedPermission}
          />
        )}
        </Container>
      </div>
    </PermissionGuard>
  )
}

