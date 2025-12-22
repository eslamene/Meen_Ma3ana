'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Shield, Loader2 } from 'lucide-react'
import StandardModal, { StandardFormField } from '@/components/ui/standard-modal'
import { Card, CardContent } from '@/components/ui/card'

import { defaultLogger as logger } from '@/lib/logger'

interface Permission {
  id: string
  name: string
  display_name: string
  description: string
  resource: string
  action: string
  is_system: boolean
}

interface PermissionAssignmentModalProps {
  open: boolean
  onClose: () => void
  role?: {
    id: string
    display_name: string
  }
  roleId?: string
  roleName?: string
  currentPermissions?: string[]
  permissions?: Permission[]
  onSave: (permissionIds: string[]) => Promise<void>
}

export function PermissionAssignmentModal({
  open,
  onClose,
  role,
  roleId,
  roleName,
  currentPermissions = [],
  permissions = [],
  onSave
}: PermissionAssignmentModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(currentPermissions)
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [allPermissions, setAllPermissions] = useState<Permission[]>(permissions)
  const fetchingRef = useRef(false)

  // Use role prop if available, otherwise use roleId/roleName
  const effectiveRole = role || (roleId && roleName ? { id: roleId, display_name: roleName } : undefined)

  // Group permissions by resource
  const permissionsByResource = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  // Filter permissions by search term
  const filteredPermissions = allPermissions.filter(perm =>
    perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    perm.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    perm.resource.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId)
      } else {
        return [...prev, permissionId]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedPermissions.length === filteredPermissions.length) {
      setSelectedPermissions([])
    } else {
      setSelectedPermissions(filteredPermissions.map(p => p.id))
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave(selectedPermissions)
      onClose()
    } catch (error) {
      logger.error('Error saving permissions:', { error: error })
    } finally {
      setSaving(false)
    }
  }

  // Load current permissions when modal opens
  useEffect(() => {
    if (!open) {
      fetchingRef.current = false
      return
    }

    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) return
    fetchingRef.current = true

    if (effectiveRole?.id) {
      // Fetch current permissions for this role
      fetch(`/api/admin/roles/${effectiveRole.id}/permissions`, {
        credentials: 'include'
      })
        .then(res => {
          if (res.ok) {
            return res.json()
          }
          throw new Error(`Failed to fetch permissions: ${res.status} ${res.statusText}`)
        })
        .then(data => {
          // Handle the response format from /api/admin/roles/[id]/permissions
          // It returns { role: {...}, permissions: [...] }
          const permissions = data.permissions || []
          setSelectedPermissions(permissions.map((p: Permission) => p.id) || currentPermissions)
          fetchingRef.current = false
        })
        .catch(error => {
          logger.error('Error fetching permissions:', { error: error })
          setSelectedPermissions(currentPermissions)
          fetchingRef.current = false
        })

      // Fetch all available permissions if not provided
      if (allPermissions.length === 0) {
        fetch('/api/admin/permissions', {
          credentials: 'include'
        })
          .then(res => {
            if (res.ok) {
              return res.json()
            }
            throw new Error(`Failed to fetch all permissions: ${res.status} ${res.statusText}`)
          })
          .then(data => {
            // Handle both flat array and grouped by module formats
            let flatPermissions: Permission[] = []
            if (data.permissionsByModule) {
              // Grouped by module format
              Object.values(data.permissionsByModule).forEach((modulePerms: any) => {
                if (Array.isArray(modulePerms)) {
                  flatPermissions.push(...modulePerms)
                }
              })
            } else if (Array.isArray(data.permissions)) {
              // Flat array format from /api/admin/permissions
              flatPermissions = data.permissions
            }
            setAllPermissions(flatPermissions)
          })
          .catch(error => {
            logger.error('Error fetching all permissions:', { error: error })
            // Don't set empty array, keep existing permissions if any
          })
      }
    } else if (currentPermissions.length > 0) {
      setSelectedPermissions(currentPermissions)
      fetchingRef.current = false
    } else {
      fetchingRef.current = false
    }
  }, [open, effectiveRole?.id])

  const filteredPermissionsByResource = Object.entries(permissionsByResource)
    .filter(([resource]) => 
      filteredPermissions.some(p => p.resource === resource)
    )
    .map(([resource, perms]) => ({
      resource,
      permissions: perms.filter(perm => filteredPermissions.includes(perm))
    }))
    .filter(({ permissions }) => permissions.length > 0)

  return (
    <StandardModal
      open={open}
      onOpenChange={onClose}
      title={`Assign Permissions to ${effectiveRole?.display_name || roleName || 'Role'}`}
      description="Select the permissions to assign to this role. Users with this role will have access to all selected permissions."
      maxWidth="4xl"
      sections={[
        {
          title: "Search & Selection",
          children: (
            <div className="space-y-3">
              <StandardFormField label="Search Permissions" description="Search by name, resource, or action">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search permissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              </StandardFormField>

              {/* Select All */}
              <Card className="border border-gray-200 bg-gray-50/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="select-all"
                        checked={filteredPermissions.length > 0 && selectedPermissions.length === filteredPermissions.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all" className="cursor-pointer text-sm font-medium text-gray-900">
                        Select All ({filteredPermissions.length} {filteredPermissions.length === 1 ? 'permission' : 'permissions'})
                      </Label>
                    </div>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {selectedPermissions.length} {selectedPermissions.length === 1 ? 'selected' : 'selected'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        },
        ...filteredPermissionsByResource.map(({ resource, permissions }) => ({
          title: resource.charAt(0).toUpperCase() + resource.slice(1),
          children: (
            <div className="space-y-2">
              {permissions.map((perm) => {
                const isSelected = selectedPermissions.includes(perm.id)
                return (
                  <Card
                    key={perm.id}
                    className={`border transition-all duration-200 cursor-pointer hover:shadow-sm ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePermissionToggle(perm.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <Checkbox
                            id={`perm-${perm.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handlePermissionToggle(perm.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Label
                              htmlFor={`perm-${perm.id}`}
                              className="cursor-pointer font-medium text-sm text-gray-900"
                            >
                              {perm.display_name}
                            </Label>
                            <Badge variant="outline" className="text-xs font-medium">
                              {perm.action}
                            </Badge>
                            {perm.is_system && (
                              <Badge variant="default" className="text-xs font-medium bg-gray-600">
                                System
                              </Badge>
                            )}
                          </div>
                          {perm.description && (
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                              {perm.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )
        }))
      ]}
      primaryAction={{
        label: "Save Permissions",
        onClick: handleSave,
        loading: saving,
        disabled: saving
      }}
      secondaryAction={{
        label: "Cancel",
        onClick: onClose,
        disabled: saving
      }}
    />
  )
}

