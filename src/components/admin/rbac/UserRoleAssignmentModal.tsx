'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Shield, AlertTriangle } from 'lucide-react'

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  is_system: boolean
}

interface UserRoleAssignmentModalProps {
  open: boolean
  onClose: () => void
  userId: string
  userEmail: string
  currentRoles: string[] // Array of role IDs
  allRoles: Role[]
  onSave: (roleIds: string[]) => Promise<void>
}

export function UserRoleAssignmentModal({
  open,
  onClose,
  userId,
  userEmail,
  currentRoles,
  allRoles,
  onSave
}: UserRoleAssignmentModalProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(currentRoles)
  const [saving, setSaving] = useState(false)

  // Update selected roles when currentRoles prop changes
  useEffect(() => {
    setSelectedRoles(currentRoles)
  }, [currentRoles])

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId)
      } else {
        return [...prev, roleId]
      }
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await onSave(selectedRoles)
    } catch (error) {
      console.error('Error saving roles:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setSelectedRoles(currentRoles) // Reset to original
    onClose()
  }

  const hasChanges = JSON.stringify(selectedRoles.sort()) !== JSON.stringify(currentRoles.sort())

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Roles for {userEmail}
          </DialogTitle>
          <DialogDescription>
            Select the roles to assign to this user. Changes will be saved when you click Save.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {allRoles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No roles available
            </div>
          ) : (
            <div className="space-y-3">
              {allRoles.map((role) => {
                const isSelected = selectedRoles.includes(role.id)
                const isSystemRole = role.is_system

                return (
                  <div
                    key={role.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={isSelected}
                      onCheckedChange={() => handleRoleToggle(role.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={`role-${role.id}`}
                        className="cursor-pointer flex items-center gap-2"
                      >
                        <span className="font-medium text-gray-900">
                          {role.display_name}
                        </span>
                        {isSystemRole && (
                          <Badge variant="outline" className="text-xs">
                            System
                          </Badge>
                        )}
                      </Label>
                      {role.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selectedRoles.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                This user will have no roles assigned. They may lose access to certain features.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

