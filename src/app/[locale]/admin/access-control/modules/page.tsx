'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { getIcon } from '@/lib/icons/registry'
import { ChevronDown, Edit, Trash, Plus, GripVertical, Search, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { ModuleFormModal } from '@/components/admin/rbac/ModuleFormModal'
import { PermissionsByModule } from '@/hooks/useRBACData'

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

interface Permission {
  id: string
  name: string
  display_name: string
  description?: string
  resource: string
  action: string
  is_system: boolean
  module_id?: string
}


// Manage Permissions Content Component
function ManagePermissionsContent({ 
  module, 
  modules, 
  permissionsByModule, 
  onClose, 
  onSuccess,
  tCommon
}: {
  module: Module
  modules: Module[]
  permissionsByModule: PermissionsByModule
  onClose: () => void
  onSuccess: () => void
  tCommon: (key: string) => string
}) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [targetModuleId, setTargetModuleId] = useState<string>('')
  const [isMoving, setIsMoving] = useState(false)

  const modulePermissions = permissionsByModule[module.name] || []
  const availableModules = modules.filter(m => m.id !== module.id)

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const handleSelectAll = () => {
    if (selectedPermissions.length === modulePermissions.length) {
      setSelectedPermissions([])
    } else {
      setSelectedPermissions(modulePermissions.map((p: Permission) => p.id))
    }
  }

  const handleMovePermissions = async () => {
    if (selectedPermissions.length === 0) {
      toast.error('Error', {
        description: 'Please select at least one permission to move',
      })
      return
    }

    if (!targetModuleId) {
      toast.error('Error', {
        description: 'Please select a target module',
      })
      return
    }

    setIsMoving(true)

    try {
      // Move each selected permission to the target module
      const movePromises = selectedPermissions.map(permissionId => 
        fetch(`/api/admin/rbac/permissions/${permissionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            module_id: targetModuleId 
          })
        })
      )

      const results = await Promise.allSettled(movePromises)
      
      const failed = results.filter(result => result.status === 'rejected' || 
        (result.status === 'fulfilled' && !result.value.ok))
      
      if (failed.length > 0) {
        toast.warning('Warning', {
          description: `Failed to move ${failed.length} permission(s). Some may have been moved successfully.`,
        })
      } else {
        toast.success('Success', {
          description: `Successfully moved ${selectedPermissions.length} permission(s) to ${modules.find(m => m.id === targetModuleId)?.display_name}`,
        })
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to move permissions:', error)
      toast.error('Error', {
        description: 'Failed to move permissions',
      })
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <h3 className="font-medium mb-2">Select Permissions to Move</h3>
          <div className="border rounded-lg p-3 max-h-64 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={selectedPermissions.length === modulePermissions.length && modulePermissions.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                Select All ({modulePermissions.length})
              </span>
            </div>
            <div className="space-y-1">
              {modulePermissions.map((permission: Permission) => (
                <div key={permission.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                  <Checkbox
                    checked={selectedPermissions.includes(permission.id)}
                    onCheckedChange={() => handlePermissionToggle(permission.id)}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{permission.display_name}</div>
                    <div className="text-xs text-muted-foreground">{permission.name}</div>
                  </div>
                  <Badge variant={permission.is_system ? 'secondary' : 'outline'} className="text-xs">
                    {permission.is_system ? tCommon('systemItem') : tCommon('customItem')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <ArrowRight className="w-6 h-6 text-muted-foreground" />
        </div>

        <div className="flex-1">
          <h3 className="font-medium mb-2">Target Module</h3>
          <Select value={targetModuleId} onValueChange={setTargetModuleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select target module" />
            </SelectTrigger>
            <SelectContent>
              {availableModules.map(targetModule => {
                const IconComponent = getIcon(targetModule.icon) || getIcon('Circle')
                return (
                  <SelectItem key={targetModule.id} value={targetModule.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: targetModule.color }}
                      >
                        {IconComponent && <IconComponent className="w-4 h-4 text-white" />}
                      </div>
                      <span>{targetModule.display_name}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={isMoving}>
          Cancel
        </Button>
        <Button 
          onClick={handleMovePermissions} 
          disabled={selectedPermissions.length === 0 || !targetModuleId || isMoving}
        >
          {isMoving ? (
            <>
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Moving...
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4 mr-2" />
              Move {selectedPermissions.length} Permission{selectedPermissions.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default function ModulesPage() {
  const t = useTranslations('rbac.modules')
  const tCommon = useTranslations('rbac.common')
  const [modules, setModules] = useState<Module[]>([])
  const [permissionsByModule, setPermissionsByModule] = useState<PermissionsByModule>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [managePermissionsModalOpen, setManagePermissionsModalOpen] = useState(false)
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [draggedModule, setDraggedModule] = useState<Module | null>(null)

  // Fetch data
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [modulesRes, permissionsRes] = await Promise.all([
        fetch('/api/admin/rbac/modules'),
        fetch('/api/admin/rbac/permissions')
      ])

      const modulesData = await modulesRes.json()
      const permissionsData = await permissionsRes.json()

      setModules(modulesData.modules || [])
      setPermissionsByModule(permissionsData.permissionsByModule || {})
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const totalModules = modules.length
  const systemModules = modules.filter(m => m.is_system).length
  const customModules = totalModules - systemModules
  const avgPermissions = totalModules > 0 ? Math.round(modules.reduce((sum, m) => sum + m.permissions_count, 0) / totalModules) : 0

  // Calculate module usage (roles with permissions from this module)
  const getModuleUsage = () => {
    // Note: Role type from rbac-helpers doesn't include permissions array
    // This would need to be fetched separately or roles should include permissions
    return 0 // Placeholder - would need to fetch role permissions separately
  }

  // Filtered modules
  const filteredModules = modules.filter(m => {
    const matchesSearch = m.display_name.toLowerCase().includes(search.toLowerCase()) || 
                         m.name.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || 
                         (filter === 'system' && m.is_system) || 
                         (filter === 'custom' && !m.is_system)
    return matchesSearch && matchesFilter
  }).sort((a, b) => a.sort_order - b.sort_order)

  // Handle create
  const createModule = async (data: Omit<Module, 'id'>) => {
    const res = await fetch('/api/admin/rbac/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to create module')
    }
  }

  // Handle edit
  const handleEdit = (module: Module) => {
    setSelectedModule(module)
    setEditModalOpen(true)
  }

  // Handle delete
  const handleDelete = async (module: Module) => {
    if (module.is_system) {
      toast.error('Error',  {
        description: 'Cannot delete system modules',
      })
      return
    }

    if (module.permissions_count > 0) {
      toast.error('Error', {
        description: 'Cannot delete modules with permissions. Move permissions first.',
      })
      return
    }

    if (!confirm('Are you sure you want to delete this module?')) return

    try {
      const res = await fetch(`/api/admin/rbac/modules/${module.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Success', {
          description: 'Module deleted successfully'
        })
        fetchData()
      } else {
        const error = await res.json()
        toast.error('Error', {
          description: error.error || 'Failed to delete module',
        })
      }
    } catch (error) {
      console.error('Failed to delete module:', error)
    }
  }

  // Handle reorder
  const handleReorder = async (draggedId: string, targetId: string) => {
    const draggedIndex = modules.findIndex(m => m.id === draggedId)
    const targetIndex = modules.findIndex(m => m.id === targetId)
    
    if (draggedIndex === -1 || targetIndex === -1) return

    const newModules = [...modules]
    const [dragged] = newModules.splice(draggedIndex, 1)
    newModules.splice(targetIndex, 0, dragged)

    // Update sort orders
    const updatedModules = newModules.map((m, index) => ({ ...m, sort_order: index + 1 }))
    setModules(updatedModules)

    // Update on server
    try {
      await Promise.all(updatedModules.map(m => 
        fetch(`/api/admin/rbac/modules/${m.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: m.sort_order })
        })
      ))
    } catch {
      toast.error('Error', {
        description: 'Failed to update sort order',
      })
      fetchData() // Revert on error
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, module: Module) => {
    setDraggedModule(module)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetModule: Module) => {
    e.preventDefault()
    if (draggedModule && draggedModule.id !== targetModule.id) {
      handleReorder(draggedModule.id, targetModule.id)
    }
    setDraggedModule(null)
  }

  // Check if module is visible in menu (simplified - assume system modules are visible)
  const isModuleVisibleInMenu = (module: Module) => module.is_system

  if (loading) {
    return (
      <PermissionGuard permission="manage:rbac">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard permission="manage:rbac">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('createModule')}
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.totalModules')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalModules}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.systemModules')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemModules}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.customModules')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customModules}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.avgPermissionsPerModule')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgPermissions}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={tCommon('searchModulesPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('allModules')}</SelectItem>
              <SelectItem value="system">{tCommon('systemItem')}</SelectItem>
              <SelectItem value="custom">{tCommon('customItem')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map(module => {
            const IconComponent = getIcon(module.icon) || getIcon('Circle')
            const modulePermissions = permissionsByModule[module.name] || []
            const usageCount = getModuleUsage()
            const visibleInMenu = isModuleVisibleInMenu(module)

            return (
              <Card 
                key={module.id} 
                className="relative cursor-move"
                draggable
                onDragStart={(e) => handleDragStart(e, module)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, module)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg relative" style={{ backgroundColor: module.color }}>
                        {IconComponent && <IconComponent className="w-6 h-6 text-white" />}
                        <GripVertical className="absolute -top-1 -right-1 w-3 h-3 text-white opacity-50" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{module.display_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{module.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={module.is_system ? 'secondary' : 'outline'}>
                        {module.is_system ? tCommon('systemItem') : tCommon('customItem')}
                      </Badge>
                      {visibleInMenu ? (
                        <div title="Visible in menu">
                          <Eye className="w-4 h-4 text-green-500" />
                        </div>
                      ) : (
                        <div title="Not visible in menu">
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{module.description}</p>
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Permissions: {module.permissions_count}</span>
                    <span>Sort: {module.sort_order}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Used by {usageCount} role{usageCount !== 1 ? 's' : ''}
                  </div>

                  {/* Expandable permissions */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm hover:text-blue-600">
                      View Permissions ({modulePermissions.length})
                      <ChevronDown className="w-4 h-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {modulePermissions.map((p: Permission) => (
                          <div key={p.id} className="text-xs p-1 bg-gray-50 rounded">
                            {p.display_name}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(module)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDelete(module)}
                      disabled={module.is_system || module.permissions_count > 0}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setSelectedModule(module)
                        setManagePermissionsModalOpen(true)
                      }}
                    >
                      Manage Permissions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Create Modal */}
        <ModuleFormModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSave={async (data: {
            name: string
            display_name: string
            description?: string
            icon: string
            color: string
            sort_order: number
            is_system?: boolean
            permissions_count?: number
          }) => {
            await createModule({
              ...data,
              description: data.description || '',
              is_system: data.is_system ?? false,
              permissions_count: data.permissions_count ?? 0
            })
            await fetchData()
          }}
        />

        {/* Edit Modal */}
        <ModuleFormModal
          module={selectedModule || undefined}
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={async () => {
            if (selectedModule) {
              // Update module logic would go here
              await fetchData()
            }
          }}
        />

        {/* Manage Permissions Modal */}
        <Dialog open={managePermissionsModalOpen} onOpenChange={setManagePermissionsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Manage Permissions - {selectedModule?.display_name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm text-muted-foreground mb-4">
                Move permissions to other modules. Select permissions and choose target module.
              </p>
              
              {selectedModule && (
                <ManagePermissionsContent 
                  module={selectedModule}
                  modules={modules}
                  permissionsByModule={permissionsByModule}
                  tCommon={tCommon}
                  onClose={() => setManagePermissionsModalOpen(false)}
                  onSuccess={() => {
                    fetchData()
                    setManagePermissionsModalOpen(false)
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  )
}