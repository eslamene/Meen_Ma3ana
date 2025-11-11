'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  is_system: boolean
}

interface RoleFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit?: (data: { name: string; display_name: string; description: string }) => Promise<void>
  onSave?: (data: { name: string; display_name: string; description: string; is_system?: boolean }) => Promise<void>
  role?: Role
  existingNames?: string[]
}

export function RoleFormModal({
  open,
  onClose,
  onSubmit,
  onSave,
  role
}: RoleFormModalProps) {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (role) {
      setName(role.name)
      setDisplayName(role.display_name)
      setDescription(role.description || '')
    } else {
      setName('')
      setDisplayName('')
      setDescription('')
    }
  }, [role, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !displayName.trim()) return

    try {
      setSaving(true)
      const submitHandler = onSave || onSubmit
      if (submitHandler) {
        if (isEditMode) {
          // For edit mode, only send display_name and description (name cannot be changed)
          await submitHandler({
            display_name: displayName.trim(),
            description: description.trim()
          } as any)
        } else {
          // For create mode, send all fields
          await submitHandler({
            name: name.trim(),
            display_name: displayName.trim(),
            description: description.trim(),
            ...(onSave && { is_system: false })
          })
        }
      }
      onClose()
    } catch (error) {
      console.error('Error saving role:', error)
      // Don't close modal on error - let the parent handle error display
      throw error
    } finally {
      setSaving(false)
    }
  }

  const isEditMode = !!role

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Role' : 'Create Role'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the role details below.' : 'Create a new role with a unique name and display name.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., editor"
              disabled={isEditMode || saving}
              required
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier (lowercase, no spaces)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Editor"
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
              placeholder="Describe what this role can do..."
              disabled={saving}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || !displayName.trim()}>
              {saving ? 'Saving...' : isEditMode ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

