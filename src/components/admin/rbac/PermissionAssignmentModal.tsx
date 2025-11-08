'use client'

import React, { useState, useEffect } from 'react'
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
  role: {
    id: string
    display_name: string
  }
  permissions: Permission[]
  onSave: (permissionIds: string[]) => Promise<void>
}

export function PermissionAssignmentModal({
  open,
  onClose,
  role,
  permissions,
  onSave
}: PermissionAssignmentModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)

  // Group permissions by resource
  const permissionsByResource = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  // Filter permissions by search term
  const filteredPermissions = permissions.filter(perm =>
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
    if (open && role.id) {
      // Fetch current permissions for this role
      fetch(`/api/admin/roles/${role.id}/permissions`, {
        credentials: 'include'
      })
        .then(res => {
          if (res.ok) {
            return res.json()
          }
          throw new Error('Failed to fetch permissions')
        })
        .then(data => {
          if (data.permissions) {
            setSelectedPermissions(data.permissions.map((p: Permission) => p.id))
          } else {
            setSelectedPermissions([])
          }
        })
        .catch(() => {
          setSelectedPermissions([])
        })
    } else if (!open) {
      setSelectedPermissions([])
      setSearchTerm('')
    }
  }, [open, role.id])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Permissions to {role.display_name}</DialogTitle>
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

