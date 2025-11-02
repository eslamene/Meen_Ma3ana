"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Shield, AlertTriangle, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button" // Assuming Button component exists
import { Checkbox } from "@/components/ui/checkbox" // Assuming Checkbox component exists
// Tooltip components not available - using simple info icons instead
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { slugify } from "@/lib/utils/rbac-helpers" // Assuming this utility exists

interface Role {
  id?: string
  name: string
  display_name: string
  description: string
  is_system: boolean
}

interface RoleFormModalProps {
  role?: Role
  onSave: (roleData: Omit<Role, 'id'>) => Promise<void>
  onSaveAndAssign?: (roleData: Omit<Role, 'id'>) => Promise<void>
  onClose: () => void
  open: boolean
  isSuperAdmin?: boolean
  existingNames?: string[]
}

export function RoleFormModal({
  role,
  onSave,
  onSaveAndAssign,
  onClose,
  open,
  isSuperAdmin = false,
  existingNames = []
}: RoleFormModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<Omit<Role, 'id'>>({
    name: '',
    display_name: '',
    description: '',
    is_system: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [nameInputRef, setNameInputRef] = useState<HTMLInputElement | null>(null)

  // Pre-populate form when role changes (edit mode)
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        is_system: role.is_system
      })
    } else {
      setFormData({
        name: '',
        display_name: '',
        description: '',
        is_system: false
      })
    }
    setErrors({})
  }, [role, open])

  // Auto-slugify name from display_name
  useEffect(() => {
    if (!role && formData.display_name) { // Only auto-slugify in create mode
      setFormData(prev => ({ ...prev, name: slugify(formData.display_name) }))
    }
  }, [formData.display_name, role])

  // Auto-focus on first field
  useEffect(() => {
    if (open && nameInputRef) {
      nameInputRef.focus()
    }
  }, [open, nameInputRef])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, formData])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name) {
      newErrors.name = 'Role name is required'
    } else if (!/^[a-z_]+$/.test(formData.name)) {
      newErrors.name = 'Role name must be lowercase with underscores only'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Role name must be less than 50 characters'
    } else if (existingNames.includes(formData.name) && (!role || role.name !== formData.name)) {
      newErrors.name = 'Role name already exists'
    }
    
    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required'
    } else if (formData.display_name.length > 100) {
      newErrors.display_name = 'Display name must be less than 100 characters'
    }
    
    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async (andAssign = false) => {
    if (!validate()) return
    
    setLoading(true)
    try {
      if (andAssign && onSaveAndAssign) {
        await onSaveAndAssign(formData)
      } else {
        await onSave(formData)
      }
      toast({
        title: "Success",
        description: `Role ${role ? 'updated' : 'created'} successfully`,
      })
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save role",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof Omit<Role, 'id'>, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {role ? 'Edit Role' : 'Create Role'}
          </DialogTitle>
          <DialogDescription>
            {role ? 'Update the role details below.' : 'Create a new role for your system.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Role Name
              <Info className="h-4 w-4 ml-1 inline text-gray-400" title="Unique identifier for the role. Auto-generated from display name." />
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={!!role} // Disabled in edit mode
              ref={setNameInputRef}
              placeholder="e.g., admin_user"
            />
            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">
              Display Name *
              <Info className="h-4 w-4 ml-1 inline text-gray-400" title="Human-readable name shown in the interface." />
            </Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              placeholder="e.g., Admin User"
            />
            {errors.display_name && <p className="text-sm text-red-600">{errors.display_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description
              <Info className="h-4 w-4 ml-1 inline text-gray-400" title="Optional description of what this role does." />
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the role's purpose..."
              rows={3}
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_system"
              checked={formData.is_system}
              onCheckedChange={(checked) => handleInputChange('is_system', !!checked)}
              disabled={!isSuperAdmin}
            />
            <Label htmlFor="is_system" className="text-sm">
              System Role
              <Info className="h-4 w-4 ml-1 inline text-gray-400" title="System roles are built-in and cannot be deleted. Only super-admins can modify." />
            </Label>
          </div>

          {role?.is_system && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                This is a system role. Changes should be made with caution.
              </p>
            </div>
          )}

          <div className="border-t pt-4">
            <Label className="text-sm font-medium">Preview</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="font-medium">{formData.display_name || 'Role Name'}</span>
                {formData.is_system && <span className="text-xs bg-gray-200 px-2 py-1 rounded">System</span>}
              </div>
              {formData.description && (
                <p className="text-sm text-gray-600 mt-1">{formData.description}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-background border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => handleSave(false)} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
          {!role && onSaveAndAssign && (
            <Button onClick={() => handleSave(true)} disabled={loading} variant="secondary">
              {loading ? 'Saving...' : 'Save & Assign Permissions'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}