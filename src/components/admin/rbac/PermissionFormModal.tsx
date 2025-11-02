'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { getIconWithFallback } from '@/lib/icons/registry'
import { Loader2, AlertTriangle, Copy, Eye, Key, Shield } from 'lucide-react'

interface Permission {
  id: string
  name: string
  display_name: string
  description?: string
  resource: string
  action: string
  module_id: string
  is_system: boolean
}

interface Module {
  id: string
  name: string
  display_name: string
  description?: string
  icon: string
  color: string
  sort_order: number
  is_system: boolean
  permissions_count?: number
}

interface Role {
  id: string
  name: string
  display_name: string
  permissions: Permission[]
}

interface PermissionFormModalProps {
  permission?: Permission
  modules: Module[]
  onSave: (permission: Omit<Permission, 'id' | 'is_system'>) => Promise<void>
  onClose: () => void
  open: boolean
}

const COMMON_ACTIONS = [
  'view', 'create', 'update', 'delete', 'manage', 'approve', 'reject', 'export', 'import'
]

const ACTION_COLORS = {
  view: 'bg-blue-100 text-blue-800',
  create: 'bg-green-100 text-green-800',
  update: 'bg-yellow-100 text-yellow-800',
  delete: 'bg-red-100 text-red-800',
  manage: 'bg-purple-100 text-purple-800',
  approve: 'bg-indigo-100 text-indigo-800',
  reject: 'bg-orange-100 text-orange-800',
  export: 'bg-cyan-100 text-cyan-800',
  import: 'bg-teal-100 text-teal-800'
}

export function PermissionFormModal({
  permission,
  modules,
  onSave,
  onClose,
  open
}: PermissionFormModalProps) {
  const { toast } = useToast()
  const isEdit = !!permission

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    resource: '',
    action: '',
    module_id: ''
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [existingPermissions, setExistingPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens/closes or permission changes
  useEffect(() => {
    if (open) {
      if (permission) {
        setFormData({
          name: permission.name,
          display_name: permission.display_name,
          description: permission.description || '',
          resource: permission.resource,
          action: permission.action,
          module_id: permission.module_id
        })
      } else {
        setFormData({
          name: '',
          display_name: '',
          description: '',
          resource: '',
          action: '',
          module_id: ''
        })
      }
      setErrors({})
      fetchData()
    }
  }, [open, permission])

  // Auto-generate name from action and resource
  useEffect(() => {
    if (formData.action && formData.resource && !isEdit) {
      const generatedName = `${formData.action}:${formData.resource}`
      setFormData(prev => ({ ...prev, name: generatedName }))
    }
  }, [formData.action, formData.resource, isEdit])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch existing permissions for validation and suggestions
      const permissionsRes = await fetch('/api/admin/rbac/permissions')
      if (permissionsRes.ok) {
        const data = await permissionsRes.json()
        const allPermissions: Permission[] = []
        Object.values(data.permissionsByModule).forEach((moduleData: any) => {
          allPermissions.push(...moduleData.permissions)
        })
        setExistingPermissions(allPermissions)
      }

      // Fetch roles for showing which roles have this permission
      const rolesRes = await fetch('/api/admin/rbac/roles')
      if (rolesRes.ok) {
        const data = await rolesRes.json()
        setRoles(data.roles)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.display_name.trim()) newErrors.display_name = 'Display name is required'
    if (!formData.resource.trim()) newErrors.resource = 'Resource is required'
    if (!formData.action.trim()) newErrors.action = 'Action is required'
    if (!formData.module_id) newErrors.module_id = 'Module is required'

    // Validate name format
    if (formData.name && !/^[^:]+:[^:]+$/.test(formData.name)) {
      newErrors.name = 'Name must be in format action:resource'
    }

    // Check for duplicate name
    if (formData.name && existingPermissions.some(p => p.name === formData.name && p.id !== permission?.id)) {
      newErrors.name = 'A permission with this name already exists'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Get unique resources for suggestions
  const resourceSuggestions = useMemo(() => {
    const resources = [...new Set(existingPermissions.map(p => p.resource))]
    return resources.sort()
  }, [existingPermissions])

  // Check for similar names
  const similarPermissions = useMemo(() => {
    if (!formData.name) return []
    return existingPermissions
      .filter(p => p.name !== permission?.name && 
                   p.name.toLowerCase().includes(formData.name.toLowerCase().split(':')[0] || ''))
      .slice(0, 3)
  }, [formData.name, existingPermissions, permission])

  // Get roles that have this permission
  const rolesWithPermission = useMemo(() => {
    if (!permission) return []
    return roles.filter(role => 
      role.permissions.some(p => p.id === permission.id)
    )
  }, [roles, permission])

  // Get selected module
  const selectedModule = modules.find(m => m.id === formData.module_id)

  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      await onSave({
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description,
        resource: formData.resource,
        action: formData.action,
        module_id: formData.module_id
      })

      toast({
        title: 'Success',
        description: `Permission ${isEdit ? 'updated' : 'created'} successfully`,
        type: 'success'
      })

      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${isEdit ? 'update' : 'create'} permission`,
        type: 'error'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = () => {
    if (!permission) return

    setFormData({
      ...formData,
      name: `${permission.name}_copy`,
      display_name: `${permission.display_name} (Copy)`
    })

    toast({
      title: 'Duplicated',
      description: 'Permission duplicated for editing',
      type: 'default'
    })
  }

  const updateFormField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {isEdit ? 'Edit Permission' : 'Create Permission'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the permission details below.' : 'Create a new permission by filling out the form below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Permission Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name Builder Helper */}
                {!isEdit && (
                  <div className="space-y-2">
                    <Label>Name Builder</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={formData.action} onValueChange={(value) => updateFormField('action', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_ACTIONS.map(action => (
                            <SelectItem key={action} value={action}>
                              <div className="flex items-center gap-2">
                                <Badge className={ACTION_COLORS[action as keyof typeof ACTION_COLORS] || 'bg-gray-100'}>
                                  {action}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={formData.resource} onValueChange={(value) => updateFormField('resource', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resource" />
                        </SelectTrigger>
                        <SelectContent>
                          {resourceSuggestions.map(resource => (
                            <SelectItem key={resource} value={resource}>
                              {resource}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-gray-500">
                      Choose action and resource to auto-generate the permission name
                    </p>
                  </div>
                )}

                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    disabled={isEdit}
                    placeholder="e.g., view:cases, create:users"
                  />
                  {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                  {!isEdit && (
                    <p className="text-xs text-gray-500">
                      Format: action:resource (e.g., view:cases, manage:rbac)
                    </p>
                  )}
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => updateFormField('display_name', e.target.value)}
                    placeholder="Human-readable name"
                  />
                  {errors.display_name && <p className="text-sm text-red-600">{errors.display_name}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormField('description', e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>

                {/* Resource and Action (if edit mode) */}
                {isEdit && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="resource">Resource *</Label>
                      <Input
                        id="resource"
                        value={formData.resource}
                        onChange={(e) => updateFormField('resource', e.target.value)}
                      />
                      {errors.resource && <p className="text-sm text-red-600">{errors.resource}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="action">Action *</Label>
                      <Select value={formData.action} onValueChange={(value) => updateFormField('action', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_ACTIONS.map(action => (
                            <SelectItem key={action} value={action}>
                              <Badge className={ACTION_COLORS[action as keyof typeof ACTION_COLORS] || 'bg-gray-100'}>
                                {action}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.action && <p className="text-sm text-red-600">{errors.action}</p>}
                    </div>
                  </div>
                )}

                {/* Module */}
                <div className="space-y-2">
                  <Label htmlFor="module">Module *</Label>
                  <Select value={formData.module_id} onValueChange={(value) => updateFormField('module_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map(module => {
                        const IconComponent = getIconWithFallback(module.icon)
                        return (
                          <SelectItem key={module.id} value={module.id}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" style={{ color: module.color }} />
                              {module.display_name}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {errors.module_id && <p className="text-sm text-red-600">{errors.module_id}</p>}
                </div>

                {/* Similar Permissions Warning */}
                {similarPermissions.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Similar permissions exist:</strong>
                      <ul className="mt-1 list-disc list-inside">
                        {similarPermissions.map(p => (
                          <li key={p.id} className="text-sm">{p.name}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview and Info Section */}
          <div className="space-y-6">
            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={ACTION_COLORS[formData.action as keyof typeof ACTION_COLORS] || 'bg-gray-100'}>
                      {formData.action || 'action'}
                    </Badge>
                    <span className="text-sm text-gray-600">on</span>
                    <Badge variant="outline">{formData.resource || 'resource'}</Badge>
                  </div>
                  <div className="text-sm">
                    <strong>{formData.display_name || 'Display Name'}</strong>
                    {formData.description && <p className="text-gray-600 mt-1">{formData.description}</p>}
                  </div>
                  {selectedModule && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>In module:</span>
                      {(() => {
                        const IconComponent = getIconWithFallback(selectedModule.icon)
                        return <IconComponent className="h-4 w-4" style={{ color: selectedModule.color }} />
                      })()}
                      {selectedModule.display_name}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Roles with this permission (Edit mode only) */}
            {isEdit && rolesWithPermission.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Assigned to Roles ({rolesWithPermission.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rolesWithPermission.map(role => (
                      <Badge key={role.id} variant="secondary">
                        {role.display_name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Examples */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Examples</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>view:cases</strong> - View case records</div>
                  <div><strong>create:users</strong> - Create new users</div>
                  <div><strong>manage:rbac</strong> - Manage roles and permissions</div>
                  <div><strong>approve:donations</strong> - Approve donation requests</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {isEdit && (
              <Button variant="outline" onClick={handleDuplicate} className="mr-2">
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Update' : 'Create'} Permission
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}