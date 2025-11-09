'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Module {
  id: string
  name: string
  display_name: string
  description?: string
  icon: string
  color: string
  sort_order: number
  is_system: boolean
  permissions_count: number
}

interface ModuleFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    name: string
    display_name: string
    description?: string
    icon: string
    color: string
    sort_order: number
    is_system?: boolean
    permissions_count?: number
  }) => Promise<void>
  module?: Module
}

const COLORS = ['blue', 'green', 'red', 'purple', 'orange', 'yellow', 'pink', 'indigo', 'teal', 'gray']
const ICONS = ['folder', 'shield', 'users', 'settings', 'bar-chart-3', 'heart', 'credit-card', 'bell', 'package', 'key']

export function ModuleFormModal({
  open,
  onClose,
  onSave,
  module
}: ModuleFormModalProps) {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('folder')
  const [color, setColor] = useState('blue')
  const [sortOrder, setSortOrder] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (module) {
      setName(module.name)
      setDisplayName(module.display_name)
      setDescription(module.description || '')
      setIcon(module.icon)
      setColor(module.color)
      setSortOrder(module.sort_order)
    } else {
      setName('')
      setDisplayName('')
      setDescription('')
      setIcon('folder')
      setColor('blue')
      setSortOrder(0)
    }
  }, [module, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !displayName.trim()) return

    try {
      setSaving(true)
      await onSave({
        name: name.trim(),
        display_name: displayName.trim(),
        description: description.trim() || undefined,
        icon,
        color,
        sort_order: sortOrder,
        is_system: module?.is_system,
        permissions_count: module?.permissions_count
      })
      onClose()
    } catch (error) {
      console.error('Error saving module:', error)
    } finally {
      setSaving(false)
    }
  }

  const isEditMode = !!module

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Module' : 'Create Module'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the module details below.' : 'Create a new module to organize permissions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., cases"
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
              placeholder="e.g., Cases"
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
              placeholder="Describe what this module contains..."
              disabled={saving}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select value={icon} onValueChange={setIcon} disabled={saving}>
                <SelectTrigger id="icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICONS.map(i => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select value={color} onValueChange={setColor} disabled={saving}>
                <SelectTrigger id="color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              disabled={saving}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || !displayName.trim()}>
              {saving ? 'Saving...' : isEditMode ? 'Update Module' : 'Create Module'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

