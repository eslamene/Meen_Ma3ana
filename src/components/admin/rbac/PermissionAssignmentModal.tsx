'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

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
      console.error('Error saving permissions:', error)
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
          console.error('Error fetching permissions:', error)
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
            console.error('Error fetching all permissions:', error)
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Permissions to {effectiveRole?.display_name || roleName || 'Role'}</DialogTitle>
          <DialogDescription>
            Select the permissions to assign to this role. Users with this role will have access to all selected permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between p-2 border rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={filteredPermissions.length > 0 && selectedPermissions.length === filteredPermissions.length}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="cursor-pointer font-medium">
                Select All ({filteredPermissions.length} permissions)
              </Label>
            </div>
            <Badge variant="outline">
              {selectedPermissions.length} selected
            </Badge>
          </div>

          {/* Permissions by Resource */}
          <div className="space-y-4">
            {Object.entries(permissionsByResource)
              .filter(([resource]) => 
                filteredPermissions.some(p => p.resource === resource)
              )
              .map(([resource, perms]) => (
                <div key={resource} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 capitalize">{resource}</h4>
                  <div className="space-y-2">
                    {perms
                      .filter(perm => filteredPermissions.includes(perm))
                      .map((perm) => {
                        const isSelected = selectedPermissions.includes(perm.id)
                        return (
                          <div
                            key={perm.id}
                            className={`flex items-start space-x-3 p-2 rounded border transition-colors ${
                              isSelected
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <Checkbox
                              id={`perm-${perm.id}`}
                              checked={isSelected}
                              onCheckedChange={() => handlePermissionToggle(perm.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <Label
                                htmlFor={`perm-${perm.id}`}
                                className="cursor-pointer flex items-center gap-2"
                              >
                                <span className="font-medium">{perm.display_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {perm.action}
                                </Badge>
                                {perm.is_system && (
                                  <Badge variant="outline" className="text-xs">
                                    System
                                  </Badge>
                                )}
                              </Label>
                              {perm.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {perm.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

