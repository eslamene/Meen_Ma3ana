'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Shield, 
  Key, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Settings,
  Heart,
  DollarSign,
  Bell,
  BarChart3,
  FileText,
  CreditCard,
  User,
  Package
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import PermissionGuard from '@/components/auth/PermissionGuard'

// Icon mapping for modules
const moduleIcons: { [key: string]: any } = {
  Settings, Heart, DollarSign, Users: Users, Bell, BarChart3, FileText, CreditCard, User, Package
}

interface PermissionModule {
  id: string
  name: string
  display_name: string
  description: string
  icon: string
  color: string
  sort_order: number
  permissions: Permission[]
}

interface Permission {
  id: string
  name: string
  display_name: string
  description: string
  resource: string
  action: string
  is_system: boolean
  module_id?: string
}

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  is_system: boolean
}

export default function ModularRBACPage() {
  const { toast } = useToast()
  
  // State
  const [permissionModules, setPermissionModules] = useState<{ [key: string]: PermissionModule }>({})
  const [modules, setModules] = useState<PermissionModule[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Dialog states
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [showModuleDialog, setShowModuleDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Form data
  const [permissionFormData, setPermissionFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    resource: '',
    action: '',
    module_id: ''
  })
  
  const [moduleFormData, setModuleFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    icon: 'Package',
    color: 'gray'
  })
  
  // Available options
  const [availableResources] = useState([
    'admin', 'cases', 'contributions', 'users', 'profile', 'notifications', 
    'reports', 'settings', 'analytics', 'payments', 'files', 'messages'
  ])
  
  const [availableActions] = useState([
    'create', 'read', 'update', 'delete', 'manage', 'approve', 'publish', 
    'archive', 'export', 'import', 'view', 'edit', 'remove'
  ])
  
  const [availableColors] = useState([
    'red', 'blue', 'green', 'purple', 'yellow', 'indigo', 'gray', 'emerald', 'orange'
  ])
  
  const [availableIcons] = useState([
    'Settings', 'Heart', 'DollarSign', 'Users', 'Bell', 'BarChart3', 'FileText', 'CreditCard', 'User', 'Package'
  ])

  // Fetch data
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Add a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.warn('Data fetching is taking too long, showing fallback')
        setLoading(false)
        toast({
          type: 'error',
          title: 'Loading Timeout',
          description: 'Please check if the database migration has been applied and you have proper permissions'
        })
      }, 10000) // 10 second timeout
      
      await Promise.all([
        fetchPermissionModules(),
        fetchRoles()
      ])
      
      clearTimeout(timeout)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to load RBAC data. Please check console for details.'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissionModules = async () => {
    try {
      console.log('Fetching permission modules...')
      const response = await fetch('/api/admin/permission-modules?grouped=true')
      console.log('Permission modules response status:', response.status)
      
      const data = await response.json()
      console.log('Permission modules data:', data)
      
      if (data.success) {
        setPermissionModules(data.modules)
        setModules(Object.values(data.modules))
        console.log('Successfully loaded modules:', Object.keys(data.modules))
      } else {
        console.error('Failed to fetch permission modules:', data.error)
        // Show error to user
        toast({
          type: 'error',
          title: 'API Error',
          description: data.error || 'Failed to fetch permission modules'
        })
      }
    } catch (error) {
      console.error('Error fetching permission modules:', error)
      toast({
        type: 'error',
        title: 'Network Error',
        description: 'Could not connect to permission modules API'
      })
    }
  }

  const fetchRoles = async () => {
    try {
      console.log('Fetching roles...')
      const response = await fetch('/api/admin/rbac?action=roles')
      console.log('Roles response status:', response.status)
      
      const data = await response.json()
      console.log('Roles data:', data)
      
      if (data.success) {
        setRoles(data.roles)
        console.log('Successfully loaded roles:', data.roles.length)
      } else {
        console.error('Failed to fetch roles:', data.error)
        toast({
          type: 'error',
          title: 'API Error',
          description: data.error || 'Failed to fetch roles'
        })
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
      toast({
        type: 'error',
        title: 'Network Error',
        description: 'Could not connect to roles API'
      })
    }
  }

  // Smart permission generation
  const generatePermissionName = (resource: string, action: string) => {
    if (!resource || !action) return ''
    return `${resource}:${action}`
  }

  const generateDisplayName = (resource: string, action: string) => {
    if (!resource || !action) return ''
    
    const actionMap: { [key: string]: string } = {
      'create': 'Create', 'read': 'View', 'update': 'Edit', 'delete': 'Delete',
      'manage': 'Manage', 'approve': 'Approve', 'publish': 'Publish',
      'archive': 'Archive', 'export': 'Export', 'import': 'Import',
      'view': 'View', 'edit': 'Edit', 'remove': 'Remove'
    }
    
    const resourceMap: { [key: string]: string } = {
      'admin': 'Admin', 'cases': 'Cases', 'contributions': 'Contributions', 
      'users': 'Users', 'profile': 'Profile', 'notifications': 'Notifications',
      'reports': 'Reports', 'settings': 'Settings', 'analytics': 'Analytics',
      'payments': 'Payments', 'files': 'Files', 'messages': 'Messages'
    }
    
    const actionText = actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1)
    const resourceText = resourceMap[resource] || resource.charAt(0).toUpperCase() + resource.slice(1)
    
    return `${actionText} ${resourceText}`
  }

  const generateDescription = (resource: string, action: string) => {
    if (!resource || !action) return ''
    
    const actionDescMap: { [key: string]: string } = {
      'create': 'Allow creating new', 'read': 'Allow viewing and accessing',
      'update': 'Allow modifying existing', 'delete': 'Allow removing',
      'manage': 'Allow full management of', 'approve': 'Allow approving or rejecting',
      'publish': 'Allow publishing', 'archive': 'Allow archiving',
      'export': 'Allow exporting data from', 'import': 'Allow importing data to',
      'view': 'Allow viewing', 'edit': 'Allow editing', 'remove': 'Allow removing'
    }
    
    const actionDesc = actionDescMap[action] || `Allow ${action} operations on`
    return `${actionDesc} ${resource} in the system`
  }

  const handlePermissionFieldChange = (field: string, value: string) => {
    const newData = { ...permissionFormData, [field]: value }
    
    // Auto-generate dependent fields when resource or action changes
    if (field === 'resource' || field === 'action') {
      if (newData.resource && newData.action) {
        newData.name = generatePermissionName(newData.resource, newData.action)
        
        // Auto-generate if fields are empty or were auto-generated
        if (!permissionFormData.display_name || permissionFormData.display_name === generateDisplayName(permissionFormData.resource, permissionFormData.action)) {
          newData.display_name = generateDisplayName(newData.resource, newData.action)
        }
        
        if (!permissionFormData.description || permissionFormData.description === generateDescription(permissionFormData.resource, permissionFormData.action)) {
          newData.description = generateDescription(newData.resource, newData.action)
        }
        
        // Auto-assign module based on resource
        const matchingModule = modules.find(m => m.name === newData.resource)
        if (matchingModule) {
          newData.module_id = matchingModule.id
        }
      }
    }
    
    setPermissionFormData(newData)
  }

  // Handle permission submission
  const handlePermissionSubmit = async () => {
    if (!permissionFormData.name || !permissionFormData.display_name) {
      toast({
        type: 'error',
        title: 'Validation Error',
        description: 'Permission name and display name are required'
      })
      return
    }
    
    try {
      setSaving(true)
      
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionFormData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          type: 'success',
          title: 'Success',
          description: 'Permission created successfully'
        })
        setShowPermissionDialog(false)
        resetPermissionForm()
        fetchPermissionModules()
      } else {
        throw new Error(data.error || 'Failed to create permission')
      }
    } catch (error) {
      console.error('Error saving permission:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save permission'
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle module submission
  const handleModuleSubmit = async () => {
    if (!moduleFormData.name || !moduleFormData.display_name) {
      toast({
        type: 'error',
        title: 'Validation Error',
        description: 'Module name and display name are required'
      })
      return
    }
    
    try {
      setSaving(true)
      
      const response = await fetch('/api/admin/permission-modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moduleFormData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          type: 'success',
          title: 'Success',
          description: 'Module created successfully'
        })
        setShowModuleDialog(false)
        resetModuleForm()
        fetchPermissionModules()
      } else {
        throw new Error(data.error || 'Failed to create module')
      }
    } catch (error) {
      console.error('Error saving module:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save module'
      })
    } finally {
      setSaving(false)
    }
  }

  const resetPermissionForm = () => {
    setPermissionFormData({
      name: '',
      display_name: '',
      description: '',
      resource: '',
      action: '',
      module_id: ''
    })
  }

  const resetModuleForm = () => {
    setModuleFormData({
      name: '',
      display_name: '',
      description: '',
      icon: 'Package',
      color: 'gray'
    })
  }

  const getColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      'red': 'bg-red-100 text-red-800 border-red-200',
      'blue': 'bg-blue-100 text-blue-800 border-blue-200',
      'green': 'bg-green-100 text-green-800 border-green-200',
      'purple': 'bg-purple-100 text-purple-800 border-purple-200',
      'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'indigo': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'gray': 'bg-gray-100 text-gray-800 border-gray-200',
      'emerald': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'orange': 'bg-orange-100 text-orange-800 border-orange-200'
    }
    return colorMap[color] || colorMap['gray']
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Loading RBAC Configuration...</h3>
        <p className="text-sm text-gray-600 mb-4">Fetching permission modules and roles</p>
        <div className="text-xs text-gray-500 max-w-md text-center">
          If this takes too long, please check:
          <br />• Database migration has been applied
          <br />• You have admin permissions
          <br />• API endpoints are accessible
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard allowedPermissions={['admin:rbac']}>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Modular RBAC Management</h1>
          <p className="text-gray-600">Manage roles, permissions, and modules with intelligent organization</p>
        </div>

        <Tabs defaultValue="modules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="modules">📦 Permission Modules</TabsTrigger>
            <TabsTrigger value="permissions">🔑 Smart Permissions</TabsTrigger>
            <TabsTrigger value="roles">👥 Roles</TabsTrigger>
          </TabsList>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Permission Modules</h2>
              <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetModuleForm(); setShowModuleDialog(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Module
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Module</DialogTitle>
                    <DialogDescription>
                      Create a new permission module to organize related permissions
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="module-name">Module Name</Label>
                      <Input
                        id="module-name"
                        value={moduleFormData.name}
                        onChange={(e) => setModuleFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., cases"
                      />
                    </div>
                    <div>
                      <Label htmlFor="module-display-name">Display Name</Label>
                      <Input
                        id="module-display-name"
                        value={moduleFormData.display_name}
                        onChange={(e) => setModuleFormData(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="e.g., Case Management"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="module-icon">Icon</Label>
                        <Select value={moduleFormData.icon} onValueChange={(value) => setModuleFormData(prev => ({ ...prev, icon: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableIcons.map(icon => (
                              <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="module-color">Color</Label>
                        <Select value={moduleFormData.color} onValueChange={(value) => setModuleFormData(prev => ({ ...prev, color: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableColors.map(color => (
                              <SelectItem key={color} value={color}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full bg-${color}-500`}></div>
                                  {color.charAt(0).toUpperCase() + color.slice(1)}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="module-description">Description</Label>
                      <Textarea
                        id="module-description"
                        value={moduleFormData.description}
                        onChange={(e) => setModuleFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe this module's purpose..."
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowModuleDialog(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleModuleSubmit} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Creating...' : 'Create Module'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-6">
              {modules.map((module) => {
                const IconComponent = moduleIcons[module.icon] || Package
                return (
                  <Card key={module.id} className="overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg bg-${module.color}-100`}>
                            <IconComponent className={`h-6 w-6 text-${module.color}-600`} />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{module.display_name}</CardTitle>
                            <CardDescription>{module.description}</CardDescription>
                          </div>
                          <Badge variant="outline" className={getColorClass(module.color)}>
                            {module.permissions?.length || 0} permissions
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {module.permissions?.map((permission) => (
                          <div key={permission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Key className="h-4 w-4 text-gray-500" />
                              <div>
                                <div className="font-medium text-sm">{permission.display_name}</div>
                                <div className="text-xs text-gray-500">{permission.name}</div>
                              </div>
                            </div>
                            {permission.is_system && (
                              <Badge variant="secondary" className="text-xs">System</Badge>
                            )}
                          </div>
                        ))}
                        {(!module.permissions || module.permissions.length === 0) && (
                          <div className="text-center py-8 text-gray-500">
                            No permissions in this module yet
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Smart Permission Creation</h2>
              <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetPermissionForm(); setShowPermissionDialog(true) }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Permission
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>🆕 Create Smart Permission</DialogTitle>
                    <DialogDescription>
                      Create a new permission with intelligent auto-generation and module assignment
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>🏷️ Module</Label>
                        <Select 
                          value={permissionFormData.module_id} 
                          onValueChange={(value) => handlePermissionFieldChange('module_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select module..." />
                          </SelectTrigger>
                          <SelectContent>
                            {modules.map(module => {
                              const IconComponent = moduleIcons[module.icon] || Package
                              return (
                                <SelectItem key={module.id} value={module.id}>
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="h-4 w-4" />
                                    {module.display_name}
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>🏷️ Resource</Label>
                          <Select 
                            value={permissionFormData.resource} 
                            onValueChange={(value) => handlePermissionFieldChange('resource', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select resource..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableResources.map(resource => (
                                <SelectItem key={resource} value={resource}>
                                  {resource.charAt(0).toUpperCase() + resource.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>⚡ Action</Label>
                          <Select 
                            value={permissionFormData.action} 
                            onValueChange={(value) => handlePermissionFieldChange('action', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select action..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableActions.map(action => (
                                <SelectItem key={action} value={action}>
                                  {action.charAt(0).toUpperCase() + action.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>🔑 Permission Name <Badge variant="secondary" className="text-xs ml-2">auto-generated</Badge></Label>
                        <Input
                          value={permissionFormData.name}
                          onChange={(e) => handlePermissionFieldChange('name', e.target.value)}
                          className="font-mono bg-gray-50"
                          placeholder="Select resource and action to auto-generate"
                        />
                      </div>
                      
                      <div>
                        <Label>📝 Display Name</Label>
                        <Input
                          value={permissionFormData.display_name}
                          onChange={(e) => handlePermissionFieldChange('display_name', e.target.value)}
                          placeholder="Human-readable permission name"
                        />
                      </div>
                      
                      <div>
                        <Label>📄 Description</Label>
                        <Textarea
                          value={permissionFormData.description}
                          onChange={(e) => handlePermissionFieldChange('description', e.target.value)}
                          placeholder="Detailed description of what this permission allows"
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div className="space-y-4">
                      {permissionFormData.name && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-blue-900 mb-3">🔍 Live Preview</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Name:</span> 
                              <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono text-xs">
                                {permissionFormData.name}
                              </code>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-gray-700">Display:</span> 
                              <span className="text-gray-900">{permissionFormData.display_name}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-gray-700">Description:</span> 
                              <span className="text-gray-700">{permissionFormData.description}</span>
                            </div>
                            {permissionFormData.module_id && (
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-gray-700">Module:</span> 
                                <span className="text-gray-700">
                                  {modules.find(m => m.id === permissionFormData.module_id)?.display_name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                    <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handlePermissionSubmit} 
                      disabled={saving || !permissionFormData.name || !permissionFormData.display_name}
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Create Permission
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Modular Permission System</h3>
              <p>Permissions are now organized by modules. Use the Modules tab to view permissions grouped by their modules.</p>
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Roles</h2>
            </div>
            
            <div className="text-center py-12 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Role Management</h3>
              <p>Role management with modular permissions coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  )
}
