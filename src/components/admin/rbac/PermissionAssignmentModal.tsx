'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getIconWithFallback } from '@/lib/icons/registry'
import { useToast } from '@/hooks/use-toast'
import { ChevronDown, Search, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface PermissionAssignmentModalProps {
  roleId: string
  roleName: string
  currentPermissions: string[]
  onSave: (permissionIds: string[]) => Promise<void>
  onClose: () => void
  open: boolean
}

const colorMap: Record<string, string> = {
  blue: '#3b82f6',
  green: '#10b981',
  red: '#ef4444',
  purple: '#8b5cf6',
  yellow: '#f59e0b',
  indigo: '#6366f1',
  gray: '#6b7280',
  emerald: '#059669',
  orange: '#f97316'
}

export function PermissionAssignmentModal({
  roleId,
  roleName,
  currentPermissions,
  onSave,
  onClose,
  open
}: PermissionAssignmentModalProps) {
  const [permissionsByModule, setPermissionsByModule] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(currentPermissions)
  const [searchTerm, setSearchTerm] = useState('')
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [changesOpen, setChangesOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchPermissions()
      setSelectedPermissions(currentPermissions)
      setSearchTerm('')
      setChangesOpen(false)
    }
  }, [open, currentPermissions])

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/rbac/permissions')
      if (res.ok) {
        const data = await res.json()
        setPermissionsByModule(data.permissionsByModule)
      } else {
        toast({ title: 'Error', description: 'Failed to fetch permissions', type: 'error' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch permissions', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const filteredPermissionsByModule = useMemo(() => {
    if (!searchTerm) return permissionsByModule
    const filtered: Record<string, any> = {}
    Object.entries(permissionsByModule).forEach(([moduleName, moduleData]) => {
      const filteredPerms = moduleData.permissions.filter((p: any) =>
        p.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      if (filteredPerms.length > 0) {
        filtered[moduleName] = { ...moduleData, permissions: filteredPerms }
      }
    })
    return filtered
  }, [permissionsByModule, searchTerm])

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setSelectedPermissions(prev =>
      checked ? [...prev, permissionId] : prev.filter(id => id !== permissionId)
    )
  }

  const handleSelectAll = (moduleName: string, select: boolean) => {
    const permissionModule = filteredPermissionsByModule[moduleName]
    if (!permissionModule) return
    const permIds = permissionModule.permissions.map((p: any) => p.id)
    setSelectedPermissions(prev =>
      select ? [...new Set([...prev, ...permIds])] : prev.filter(id => !permIds.includes(id))
    )
  }

  const isModuleFullySelected = (moduleName: string) => {
    const permissionModule = filteredPermissionsByModule[moduleName]
    if (!permissionModule) return false
    return permissionModule.permissions.every((p: any) => selectedPermissions.includes(p.id))
  }

  const isModulePartiallySelected = (moduleName: string) => {
    const permissionModule = filteredPermissionsByModule[moduleName]
    if (!permissionModule) return false
    const selectedInModule = permissionModule.permissions.filter((p: any) => selectedPermissions.includes(p.id))
    return selectedInModule.length > 0 && selectedInModule.length < permissionModule.permissions.length
  }

  const totalPermissions = Object.values(filteredPermissionsByModule).reduce((sum, mod: any) => sum + mod.permissions.length, 0)
  const selectedCount = selectedPermissions.length
  const addedPermissions = selectedPermissions.filter(id => !currentPermissions.includes(id))
  const removedPermissions = currentPermissions.filter(id => !selectedPermissions.includes(id))

  const findPermissionById = (id: string) => {
    for (const mod of Object.values(permissionsByModule) as any[]) {
      const perm = mod.permissions.find((p: any) => p.id === id)
      if (perm) return perm
    }
    return null
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(selectedPermissions)
      toast({ title: 'Success', description: 'Permissions updated successfully', type: 'success' })
      onClose()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update permissions', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleQuickPreset = (preset: string) => {
    let newSelected: string[] = []
    if (preset === 'read-only') {
      newSelected = Object.values(permissionsByModule).flatMap((mod: any) =>
        mod.permissions.filter((p: any) => p.action === 'view').map((p: any) => p.id)
      )
    } else if (preset === 'full-access') {
      newSelected = Object.values(permissionsByModule).flatMap((mod: any) =>
        mod.permissions.map((p: any) => p.id)
      )
    } else if (preset === 'moderator') {
      newSelected = Object.values(permissionsByModule).flatMap((mod: any) =>
        mod.permissions.filter((p: any) => ['view', 'create', 'update'].includes(p.action)).map((p: any) => p.id)
      )
    }
    setSelectedPermissions(newSelected)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Permissions to {roleName}</DialogTitle>
          <DialogDescription>
            Select the permissions you want to assign to the {roleName} role. Changes will be saved when you click Save.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => handleQuickPreset('read-only')}>Read Only</Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickPreset('moderator')}>Moderator</Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickPreset('full-access')}>Full Access</Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
            ) : (
              Object.entries(filteredPermissionsByModule).map(([moduleName, moduleData]: [string, any]) => {
                const IconComp = getIconWithFallback(moduleData.module?.icon || 'Shield')
                const isOpen = openModules.has(moduleName)
                const fullySelected = isModuleFullySelected(moduleName)
                const partiallySelected = isModulePartiallySelected(moduleName)
                return (
                  <Collapsible key={moduleName} open={isOpen} onOpenChange={(open) =>
                    setOpenModules(prev => {
                      const newSet = new Set(prev)
                      if (open) newSet.add(moduleName)
                      else newSet.delete(moduleName)
                      return newSet
                    })
                  }>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-md mb-2 hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <IconComp 
                          className="h-5 w-5" 
                          style={{ color: colorMap[moduleData.module?.color] || colorMap.blue }} 
                        />
                        <span className="font-medium">{moduleData.module?.display_name || moduleName}</span>
                        <Badge variant="secondary">{moduleData.permissions.length}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-sm text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1 rounded hover:bg-muted/50"
                          onClick={(e) => { e.stopPropagation(); handleSelectAll(moduleName, !fullySelected) }}
                        >
                          {fullySelected ? 'Deselect All' : 'Select All'}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 pb-2">
                      <div className="space-y-2">
                        {moduleData.permissions.map((perm: any) => (
                          <div key={perm.id} className="flex items-start gap-2 p-2 rounded border bg-background">
                            <Checkbox
                              checked={selectedPermissions.includes(perm.id)}
                              onCheckedChange={(checked) => handlePermissionChange(perm.id, checked as boolean)}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{perm.display_name}</div>
                              <div className="text-sm text-muted-foreground">{perm.description}</div>
                              <div className="text-xs text-muted-foreground">{perm.name}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })
            )}
          </div>
          <div className="border-t pt-4 mt-4">
            <div className="text-sm text-muted-foreground mb-2">
              {selectedCount} of {totalPermissions} permissions selected
            </div>
            {(addedPermissions.length > 0 || removedPermissions.length > 0) && (
              <Collapsible open={changesOpen} onOpenChange={setChangesOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm">
                  <span>Changes Preview</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1">
                  {addedPermissions.map(id => {
                    const perm = findPermissionById(id)
                    return perm ? (
                      <div key={id} className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>+ {perm.display_name}</span>
                      </div>
                    ) : null
                  })}
                  {removedPermissions.map(id => {
                    const perm = findPermissionById(id)
                    return perm ? (
                      <div key={id} className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span>- {perm.display_name}</span>
                      </div>
                    ) : null
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}