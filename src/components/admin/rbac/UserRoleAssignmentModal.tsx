"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Search, User, Shield, Users, Key, ChevronDown, ChevronRight, AlertTriangle, Mail, ExternalLink, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  is_system: boolean
  permissions_count: number
  users_count: number
  permissions?: Permission[]
  assigned_at?: string
  assigned_by?: string
}

interface Permission {
  id: string
  name: string
  display_name: string
  description: string
}

interface UserRoleAssignmentModalProps {
  userId: string
  userEmail: string
  currentRoles: string[]
  allRoles: Role[]
  onSave: (roleIds: string[], notes: string, sendNotification: boolean) => Promise<void>
  onClose: () => void
  open: boolean
}

export function UserRoleAssignmentModal({
  userId,
  userEmail,
  currentRoles,
  allRoles,
  onSave,
  onClose,
  open
}: UserRoleAssignmentModalProps) {
  const { toast } = useToast()
  const [selectedRoles, setSelectedRoles] = useState<string[]>(currentRoles)
  const [searchTerm, setSearchTerm] = useState("")
  const [notes, setNotes] = useState("")
  const [sendNotification, setSendNotification] = useState(false)
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]) // Stub for history

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedRoles(currentRoles)
      setSearchTerm("")
      setNotes("")
      setSendNotification(false)
      setExpandedRoles(new Set())
      setIsSaving(false)
      // Fetch assignment history here if needed
      // For now, stub it
      setAssignmentHistory([])
    }
  }, [open, currentRoles])

  const filteredRoles = allRoles.filter(role =>
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addedRoles = selectedRoles.filter(id => !currentRoles.includes(id))
  const removedRoles = currentRoles.filter(id => !selectedRoles.includes(id))
  const unchangedRoles = selectedRoles.filter(id => currentRoles.includes(id))

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const handleQuickAssign = (roleName: string) => {
    const role = allRoles.find(r => r.name === roleName)
    if (role && !selectedRoles.includes(role.id)) {
      setSelectedRoles(prev => [...prev, role.id])
    }
  }

  const handleRemoveCurrentRole = (roleId: string) => {
    setSelectedRoles(prev => prev.filter(id => id !== roleId))
  }

  const isRemovingLastAdmin = () => {
    const adminRole = allRoles.find(r => r.name === 'admin')
    if (!adminRole) return false
    return currentRoles.includes(adminRole.id) && !selectedRoles.includes(adminRole.id)
  }

  const isRemovingOwnAdmin = () => {
    // Assuming current user ID is available somehow, for now stub
    const currentUserId = "current-user-id" // Replace with actual current user ID
    return userId === currentUserId && isRemovingLastAdmin()
  }

  const hasConflictingRoles = () => {
    // Stub for conflicting roles logic
    return false
  }

  const handleSave = async () => {
    if (isRemovingOwnAdmin()) {
      toast({
        title: "Error",
        description: "You cannot remove your own admin role.",
        type: 'error'
      })
      return
    }

    setIsSaving(true)
    try {
      await onSave(selectedRoles, notes, sendNotification)
      toast({
        title: "Success",
        description: "User roles updated successfully."
      })
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user roles.",
        type: 'error'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleRoleExpansion = (roleId: string) => {
    setExpandedRoles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(roleId)) {
        newSet.delete(roleId)
      } else {
        newSet.add(roleId)
      }
      return newSet
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Roles to User</DialogTitle>
          <DialogDescription>
            Manage role assignments for {userEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src="" alt={userEmail} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold">{userEmail}</h3>
              <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                <a href={`/admin/users/${userId}`} target="_blank" rel="noopener noreferrer">
                  View User Details <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>

          {/* Current Roles */}
          <div>
            <h4 className="font-medium mb-2">Current Roles</h4>
            <div className="flex flex-wrap gap-2">
              {currentRoles.map(roleId => {
                const role = allRoles.find(r => r.id === roleId)
                if (!role) return null
                return (
                  <Badge key={roleId} variant="secondary" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {role.display_name}
                    <button
                      onClick={() => handleRemoveCurrentRole(roleId)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </Badge>
                )
              })}
              {currentRoles.length === 0 && (
                <span className="text-muted-foreground">No roles assigned</span>
              )}
            </div>
          </div>

          {/* Assignment History */}
          {assignmentHistory.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Assignment History</h4>
              <div className="space-y-2">
                {assignmentHistory.map((entry, index) => (
                  <div key={index} className="text-sm text-muted-foreground">
                    {entry.role} assigned by {entry.assigned_by} on {entry.assigned_at}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {(isRemovingLastAdmin() || isRemovingOwnAdmin() || hasConflictingRoles()) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {isRemovingOwnAdmin() && "You cannot remove your own admin role."}
                {isRemovingLastAdmin() && !isRemovingOwnAdmin() && "Removing admin role from the last admin user."}
                {hasConflictingRoles() && "Conflicting roles detected."}
              </AlertDescription>
            </Alert>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Assign */}
          <div>
            <h4 className="font-medium mb-2">Quick Assign</h4>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleQuickAssign('admin')}>
                Make Admin
              </Button>
              <Button size="sm" onClick={() => handleQuickAssign('moderator')}>
                Make Moderator
              </Button>
              <Button size="sm" onClick={() => handleQuickAssign('donor')}>
                Make Donor
              </Button>
            </div>
          </div>

          {/* Roles List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredRoles.map(role => {
              const isSelected = selectedRoles.includes(role.id)
              const isAdded = addedRoles.includes(role.id)
              const isRemoved = removedRoles.includes(role.id)
              const isUnchanged = unchangedRoles.includes(role.id)

              return (
                <div key={role.id} className="border rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleRoleToggle(role.id)}
                      className={cn(
                        isAdded && "border-green-500",
                        isRemoved && "border-red-500",
                        isUnchanged && "border-gray-500"
                      )}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <h5 className="font-medium">{role.display_name}</h5>
                        {role.is_system && <Badge variant="outline">System</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Key className="h-3 w-3" />
                          {role.permissions_count} permissions
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {role.users_count} users
                        </span>
                      </div>
                      <Collapsible open={expandedRoles.has(role.id)} onOpenChange={() => toggleRoleExpansion(role.id)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
                            {expandedRoles.has(role.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            Role Details
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="text-sm">
                            <h6 className="font-medium">Permissions:</h6>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {role.permissions?.map(perm => (
                                <Badge key={perm.id} variant="outline" className="text-xs">
                                  {perm.display_name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
            <Textarea
              placeholder="Document why roles are being changed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Send Notification */}
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={sendNotification}
              onCheckedChange={(checked) => setSendNotification(checked === true)}
              id="send-notification"
            />
            <label htmlFor="send-notification" className="text-sm flex items-center gap-1">
              <Mail className="h-4 w-4" />
              Send notification email to user
            </label>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-background border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isRemovingOwnAdmin()}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}