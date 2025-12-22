'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Search, Filter, Edit2, Trash2, Eye, Shield, Key, Package, Users } from 'lucide-react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { getIconWithFallback } from '@/lib/icons/registry'
import { PermissionFormModal } from '@/components/admin/rbac/PermissionFormModal'

import { defaultLogger as logger } from '@/lib/logger'

interface Module {
  id: string
  name: string
  display_name: string
  description: string
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
  description: string
  resource: string
  action: string
  is_system: boolean
  module_id: string
}

interface Role {
  id: string
  name: string
  display_name: string
  permissions: Permission[]
}

interface PermissionsByModule {
  [moduleName: string]: {
    module: Module
    permissions: Permission[]
  }
}

const getActionColor = (action: string) => {
  switch (action.toLowerCase()) {
    case 'view': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'create': return 'bg-green-100 text-green-800 border-green-200'
    case 'update': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'delete': return 'bg-red-100 text-red-800 border-red-200'
    case 'manage': return 'bg-purple-100 text-purple-800 border-purple-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}


const ViewRolesModal: React.FC<{
  open: boolean
  onClose: () => void
  permission: Permission
  roles: Role[]
}> = ({ open, onClose, permission, roles }) => {
  const t = useTranslations('rbac.permissions.modals')
  const tCommon = useTranslations('rbac.common')
  const rolesWithPermission = roles.filter(role => 
    role.permissions.some(p => p.id === permission.id)
  )

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('viewRoles', { permissionName: permission.display_name })}</DialogTitle>
          <DialogDescription>
            {t('viewRolesDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {rolesWithPermission.length > 0 ? (
            <div className="space-y-2">
              {rolesWithPermission.map(role => (
                <div key={role.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium">{role.display_name}</span>
                  <Badge variant="outline">{t('permissionsCount', { count: role.permissions.length })}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{t('noRolesAssigned')}</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>{tCommon('close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function PermissionsPage() {
  const t = useTranslations('rbac.permissions')
  const tCommon = useTranslations('rbac.common')
  const [permissionsByModule, setPermissionsByModule] = useState<PermissionsByModule>({})
  const [modules, setModules] = useState<Module[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModule, setSelectedModule] = useState<string>('all')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | undefined>()
  const [viewingRoles, setViewingRoles] = useState<Permission | undefined>()

  const fetchData = useCallback(async () => {
    try {
      const [permissionsRes, rolesRes] = await Promise.all([
        fetch('/api/admin/permissions', { credentials: 'include' }),
        fetch('/api/admin/roles', { credentials: 'include' })
      ])

      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json()
        // Group permissions by resource (module)
        const grouped: Record<string, Permission[]> = {}
        if (permissionsData.permissions) {
          permissionsData.permissions.forEach((p: Permission) => {
            const moduleName = p.resource || 'other'
            if (!grouped[moduleName]) grouped[moduleName] = []
            grouped[moduleName].push(p)
          })
        }
        setPermissionsByModule(grouped as unknown as PermissionsByModule)
      } else {
        // Handle non-JSON responses
        const contentType = permissionsRes.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const errorData = await permissionsRes.json().catch(() => ({}))
          logger.error('Permissions fetch error:', { error: errorData })
        } else {
          logger.error('Permissions fetch error: Non-JSON response', { error: permissionsRes.status })
        }
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        setRoles(rolesData.roles || [])
      } else {
        const errorData = await rolesRes.json().catch(() => ({}))
        logger.error('Roles fetch error:', { error: errorData })
      }
    } catch (error) {
      logger.error('Fetch data error:', { error: error })
      toast.error('Error', {
        description: 'Failed to fetch data'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreatePermission = async (data: Partial<Permission>) => {
    const response = await fetch('/api/admin/rbac/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('Failed to create permission')
    }

    await fetchData()
  }

  const handleUpdatePermission = async (permissionId: string, data: Partial<Permission>) => {
    const response = await fetch(`/api/admin/rbac/permissions/${permissionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('Failed to update permission')
    }

    await fetchData()
  }

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) return

    try {
      const response = await fetch(`/api/admin/rbac/permissions/${permissionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete permission')
      }

      toast.success('Success', {
        description: 'Permission deleted successfully'
      })

      await fetchData()
    } catch {
      toast.error('Error', {
        description: 'Failed to delete permission'
      })
    }
  }

  const filteredModules = useMemo(() => {
    type ModuleEntry = [string, { module: Module; permissions: Permission[] }]
    let filtered: ModuleEntry[] = Object.entries(permissionsByModule) as ModuleEntry[]

    if (selectedModule !== 'all') {
      filtered = filtered.filter(([, data]) => data.module.id === selectedModule)
    }

    if (searchTerm) {
      filtered = filtered.map(([moduleName, data]) => [
        moduleName,
        {
          ...data,
          permissions: data.permissions.filter(permission =>
            permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            permission.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            permission.resource.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }
      ] as ModuleEntry).filter(([, data]) => data.permissions.length > 0)
    }

    return filtered
  }, [permissionsByModule, selectedModule, searchTerm])

  const stats = useMemo(() => {
    const allPermissions = Object.values(permissionsByModule).flatMap(m => m.permissions)
    return {
      totalPermissions: allPermissions.length,
      totalModules: modules.length,
      systemPermissions: allPermissions.filter(p => p.is_system).length,
      customPermissions: allPermissions.filter(p => !p.is_system).length
    }
  }, [permissionsByModule, modules])

  if (loading) {
    return (
      <PermissionGuard permission="manage:rbac">
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </PermissionGuard>
    )
  }

  return (
    <PermissionGuard permission="manage:rbac">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('createPermission')}
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.totalPermissions')}</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPermissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.totalModules')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalModules}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.systemPermissions')}</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.systemPermissions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('stats.customPermissions')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.customPermissions}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={tCommon('searchPermissionsPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedModule} onValueChange={setSelectedModule}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder={tCommon('filterByModule')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('allModules')}</SelectItem>
              {modules.map(module => (
                <SelectItem key={module.id} value={module.id}>
                  {module.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Modules */}
        <div className="space-y-4">
          {filteredModules.map(([moduleName, data]) => {
            const IconComponent = getIconWithFallback(data.module.icon)
            return (
              <Collapsible key={moduleName} defaultOpen>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: data.module.color + '20', color: data.module.color }}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{data.module.display_name}</CardTitle>
                            <CardDescription>{data.module.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{data.permissions.length} permissions</Badge>
                          <Button 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              setCreateModalOpen(true)
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Create
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent>
                      {data.permissions.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">{t('table.permissionName')}</th>
                                <th className="text-left p-2">{t('table.displayName')}</th>
                                <th className="text-left p-2">{t('table.description')}</th>
                                <th className="text-left p-2">{t('table.resource')}</th>
                                <th className="text-left p-2">{t('table.action')}</th>
                                <th className="text-left p-2">{t('table.type')}</th>
                                <th className="text-left p-2">{t('table.actions')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.permissions.map(permission => (
                                <tr key={permission.id} className="border-b hover:bg-gray-50">
                                  <td className="p-2 font-mono text-sm">{permission.name}</td>
                                  <td className="p-2">{permission.display_name}</td>
                                  <td className="p-2 text-muted-foreground">{permission.description}</td>
                                  <td className="p-2">{permission.resource}</td>
                                  <td className="p-2">
                                    <Badge className={getActionColor(permission.action)}>
                                      {permission.action}
                                    </Badge>
                                  </td>
                                  <td className="p-2">
                                    {permission.is_system && (
                                      <Badge variant="secondary">{tCommon('systemItem')}</Badge>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setViewingRoles(permission)}
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                      {!permission.is_system && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setEditingPermission(permission)}
                                          >
                                            <Edit2 className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDeletePermission(permission.id)}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">{t('noPermissions')}</p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })}
        </div>

        {/* Modals */}
        <PermissionFormModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          modules={modules}
          onSave={handleCreatePermission}
        />

        <PermissionFormModal
          open={!!editingPermission}
          onClose={() => setEditingPermission(undefined)}
          permission={editingPermission}
          modules={modules}
          onSave={async (data: Partial<Permission>) => {
            if (editingPermission) {
              await handleUpdatePermission(editingPermission.id, data)
              setEditingPermission(undefined)
            }
          }}
        />

        {viewingRoles && (
          <ViewRolesModal
            open={!!viewingRoles}
            onClose={() => setViewingRoles(undefined)}
            permission={viewingRoles}
            roles={roles}
          />
        )}
      </div>
    </PermissionGuard>
  )
}