'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

interface PermissionFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit?: (data: {
    name: string
    display_name: string
    description: string
    resource: string
    action: string
  }) => Promise<void>
  onSave?: (data: Partial<Permission>) => Promise<void>
  permission?: Permission
  modules?: Array<{ id: string; name: string; display_name?: string; description?: string }>
}

const ACTIONS = ['view', 'create', 'update', 'delete', 'manage', 'read', 'approve']
const RESOURCES = ['cases', 'contributions', 'users', 'roles', 'permissions', 'dashboard', 'profile', 'analytics', 'categories', 'sponsorships', 'rbac']

export function PermissionFormModal({
  open,
  onClose,
  onSubmit,
  onSave,
  permission,
  modules
}: PermissionFormModalProps) {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [resource, setResource] = useState('')
  const [action, setAction] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (permission) {
      setName(permission.name)
      setDisplayName(permission.display_name)
      setDescription(permission.description || '')
      setResource(permission.resource)
      setAction(permission.action)
    } else {
      setName('')
      setDisplayName('')
      setDescription('')
      setResource('')
      setAction('')
    }
  }, [permission, open])

  // Auto-generate name from resource and action
  useEffect(() => {
    if (!permission && resource && action) {
      setName(`${action}:${resource}`)
      if (!displayName) {
        setDisplayName(`${action.charAt(0).toUpperCase() + action.slice(1)} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`)
      }
    }
  }, [resource, action, permission, displayName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !displayName.trim() || !resource || !action) return

    try {
      setSaving(true)
      const submitHandler = onSave || onSubmit
      if (submitHandler) {
        if (onSave) {
          await onSave({
            name: name.trim(),
            display_name: displayName.trim(),
            description: description.trim(),
            resource,
            action
          })
        } else if (onSubmit) {
      await onSubmit({
        name: name.trim(),
        display_name: displayName.trim(),
        description: description.trim(),
        resource,
        action
      })
        }
      }
      onClose()
    } catch (error) {
      logger.error('Error saving permission:', { error: error })
    } finally {
      setSaving(false)
    }
  }

  const isEditMode = !!permission

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Permission' : 'Create Permission'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the permission details below.' : 'Create a new permission with resource and action.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resource">Resource *</Label>
              <Select value={resource} onValueChange={setResource} disabled={isEditMode || saving}>
                <SelectTrigger id="resource">
                  <SelectValue placeholder="Select resource" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCES.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action *</Label>
              <Select value={action} onValueChange={setAction} disabled={isEditMode || saving}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., view:cases"
              disabled={isEditMode || saving}
              required
            />
            <p className="text-xs text-muted-foreground">
              Format: action:resource (auto-generated)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., View Cases"
              disabled={saving}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this permission allows..."
              disabled={saving}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || !displayName.trim() || !resource || !action}>
              {saving ? 'Saving...' : isEditMode ? 'Update Permission' : 'Create Permission'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

