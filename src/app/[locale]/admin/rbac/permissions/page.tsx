'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle,
  Save,
  X,
  Settings,
  Heart,
  DollarSign,
  Users,
  User,
  Bell,
  BarChart3,
  FileText,
  CreditCard,
  Shield,
  Globe,
  TrendingUp,
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useDatabaseRBAC } from '@/lib/hooks/useDatabaseRBAC'
import { dbRBAC, Permission } from '@/lib/rbac/database-rbac'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { useToast } from '@/hooks/use-toast'

interface PermissionFormData {
  name: string
  display_name: string
  description: string
  resource: string
  action: string
}

export default function PermissionsManagementPage() {
  const { permissions, loading } = useDatabaseRBAC()
  const { toast } = useToast()
  
  // Group permissions by resource/module
  const groupedPermissions = permissions.reduce((groups, permission) => {
    const resource = permission.resource || 'other'
    if (!groups[resource]) {
      groups[resource] = []
    }
    groups[resource].push(permission)
    return groups
  }, {} as Record<string, Permission[]>)
  
  // Get module display information
  const getModuleInfo = (resource: string) => {
    const moduleMap: Record<string, { name: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }> = {
      admin: { 
        name: 'Administration', 
        icon: Settings, 
        color: 'from-red-500 to-red-600', 
        description: 'System administration and configuration' 
      },
      cases: { 
        name: 'Case Management', 
        icon: Heart, 
        color: 'from-blue-500 to-blue-600', 
        description: 'Managing charity cases and requests' 
      },
      contributions: { 
        name: 'Contributions', 
        icon: DollarSign, 
        color: 'from-green-500 to-green-600', 
        description: 'Donation and contribution management' 
      },
      projects: { 
        name: 'Project Management', 
        icon: Package, 
        color: 'from-teal-500 to-teal-600', 
        description: 'Charity project creation and management' 
      },
      users: { 
        name: 'User Management', 
        icon: Users, 
        color: 'from-purple-500 to-purple-600', 
        description: 'User accounts and profile management' 
      },
      profile: { 
        name: 'Profile & Settings', 
        icon: User, 
        color: 'from-orange-500 to-orange-600', 
        description: 'Personal profile and account settings' 
      },
      notifications: { 
        name: 'Notifications', 
        icon: Bell, 
        color: 'from-yellow-500 to-yellow-600', 
        description: 'System notifications and messaging' 
      },
      reports: { 
        name: 'Reports & Analytics', 
        icon: BarChart3, 
        color: 'from-indigo-500 to-indigo-600', 
        description: 'Data analysis and reporting tools' 
      },
      files: { 
        name: 'File Management', 
        icon: FileText, 
        color: 'from-gray-500 to-gray-600', 
        description: 'File upload and document management' 
      },
      payments: { 
        name: 'Payment Processing', 
        icon: CreditCard, 
        color: 'from-emerald-500 to-emerald-600', 
        description: 'Payment and transaction management' 
      },
      rbac: { 
        name: 'RBAC Management', 
        icon: Shield, 
        color: 'from-red-500 to-red-600', 
        description: 'Role-based access control system' 
      },
      content: { 
        name: 'Content Management', 
        icon: Globe, 
        color: 'from-cyan-500 to-cyan-600', 
        description: 'Public content and page management' 
      },
      stats: { 
        name: 'Statistics', 
        icon: TrendingUp, 
        color: 'from-pink-500 to-pink-600', 
        description: 'System statistics and metrics' 
      },
      other: { 
        name: 'Other', 
        icon: Package, 
        color: 'from-gray-400 to-gray-500', 
        description: 'Miscellaneous permissions' 
      }
    }
    
    return moduleMap[resource] || moduleMap.other
  }
  
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null)
  const [permissionFormData, setPermissionFormData] = useState<PermissionFormData>({
    name: '',
    display_name: '',
    description: '',
    resource: '',
    action: ''
  })
  
  // Dynamic form helpers - populated from database
  const [availableResources, setAvailableResources] = useState<string[]>([])
  const [availableActions, setAvailableActions] = useState<string[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  
  // Generate dynamic permission templates based on common patterns
  const getPermissionTemplates = () => {
    const commonTemplates = [
      { resource: 'cases', action: 'create', display: 'Create Cases', desc: 'Allow creating new charity cases' },
      { resource: 'cases', action: 'read', display: 'View Cases', desc: 'Allow viewing case details and listings' },
      { resource: 'cases', action: 'update', display: 'Edit Cases', desc: 'Allow modifying existing cases' },
      { resource: 'cases', action: 'delete', display: 'Delete Cases', desc: 'Allow removing cases from system' },
      { resource: 'projects', action: 'create', display: 'Create Projects', desc: 'Allow creating new charity projects' },
      { resource: 'projects', action: 'read', display: 'View Projects', desc: 'Allow viewing project details and listings' },
      { resource: 'projects', action: 'update', display: 'Edit Projects', desc: 'Allow modifying existing projects' },
      { resource: 'projects', action: 'delete', display: 'Delete Projects', desc: 'Allow removing projects from system' },
      { resource: 'contributions', action: 'approve', display: 'Approve Contributions', desc: 'Allow approving or rejecting contributions' },
      { resource: 'users', action: 'manage', display: 'Manage Users', desc: 'Allow creating, updating, and deleting users' },
      { resource: 'admin', action: 'read', display: 'Access Admin Dashboard', desc: 'Allow viewing admin dashboard and analytics' },
      { resource: 'files', action: 'upload', display: 'Upload Files', desc: 'Allow uploading files to the system' },
      { resource: 'reports', action: 'view', display: 'View Reports', desc: 'Allow viewing system reports and analytics' },
      { resource: 'notifications', action: 'manage', display: 'Manage Notifications', desc: 'Allow managing system notifications' }
    ]
    
    // Filter templates to only show those with available resources/actions
    return commonTemplates.filter(template => 
      availableResources.includes(template.resource) && 
      availableActions.includes(template.action)
    )
  }
  
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set())

  // Toggle module collapse
  const toggleModuleCollapse = (resource: string) => {
    const newCollapsed = new Set(collapsedModules)
    if (newCollapsed.has(resource)) {
      newCollapsed.delete(resource)
    } else {
      newCollapsed.add(resource)
    }
    setCollapsedModules(newCollapsed)
  }

  // Load dynamic options from database
  useEffect(() => {
    if (permissions.length > 0) {
      // Try API first, but have immediate fallback
      loadAvailableOptions().catch(() => {
        // Immediate fallback using current permissions data
        loadOptionsFromPermissions()
      })
    }
  }, [permissions])

  // Direct fallback function using permissions data
  const loadOptionsFromPermissions = () => {
    try {
      setOptionsLoading(true)
      
      // Extract from current permissions
      const resources = [...new Set(permissions.map(p => p.resource).filter(Boolean))].sort()
      const actions = [...new Set(permissions.map(p => p.action).filter(Boolean))].sort()
      
      // Add common defaults
      const defaultResources = ['admin', 'cases', 'contributions', 'users', 'profile', 'notifications', 'reports', 'files', 'payments']
      const defaultActions = ['create', 'read', 'update', 'delete', 'manage', 'approve', 'publish', 'view', 'export']
      
      const allResources = [...new Set([...resources, ...defaultResources])].sort()
      const allActions = [...new Set([...actions, ...defaultActions])].sort()
      
      setAvailableResources(allResources)
      setAvailableActions(allActions)
      
      console.log('Loaded options from permissions data:', { resources: allResources.length, actions: allActions.length })
    } finally {
      setOptionsLoading(false)
    }
  }

  const loadAvailableOptions = async () => {
    try {
      setOptionsLoading(true)
      
      // Fetch options from API endpoint with credentials
      const response = await fetch('/api/admin/permissions/options', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setAvailableResources(result.data.resources)
        setAvailableActions(result.data.actions)
        console.log(`Loaded ${result.data.total.resources} resources and ${result.data.total.actions} actions`)
      } else {
        console.warn('API returned error:', result.error)
        // Use fallback data from API response
        if (result.data) {
          setAvailableResources(result.data.resources)
          setAvailableActions(result.data.actions)
        } else {
          throw new Error(result.error || 'Failed to load options')
        }
      }
    } catch (error) {
      console.error('Error loading available options:', error)
      
      // Fallback: Extract from current permissions if API fails
      const resources = [...new Set(permissions.map(p => p.resource).filter(Boolean))].sort()
      const actions = [...new Set(permissions.map(p => p.action).filter(Boolean))].sort()
      
      // Add basic defaults if no permissions exist
      const fallbackResources = resources.length > 0 ? resources : ['admin', 'cases', 'contributions', 'users', 'profile']
      const fallbackActions = actions.length > 0 ? actions : ['create', 'read', 'update', 'delete', 'manage']
      
      setAvailableResources(fallbackResources)
      setAvailableActions(fallbackActions)
      
      console.log('Using fallback options:', { resources: fallbackResources.length, actions: fallbackActions.length })
    } finally {
      setOptionsLoading(false)
    }
  }

  // Handle permission form submission
  const handlePermissionSubmit = async () => {
    if (!permissionFormData.name || !permissionFormData.display_name) {
      toast({
        type: 'error',
        title: 'Validation Error',
        description: 'Permission name and display name are required'
      })
      return
    }

    if (!isEditing && (!permissionFormData.resource || !permissionFormData.action)) {
      toast({
        type: 'error',
        title: 'Validation Error',
        description: 'Resource and action are required for new permissions'
      })
      return
    }
    
    try {
      setSaving(true)
      
      const url = '/api/admin/permissions'
      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing && selectedPermission 
        ? {
            id: selectedPermission.id,
            display_name: permissionFormData.display_name,
            description: permissionFormData.description
          }
        : {
            name: permissionFormData.name,
            display_name: permissionFormData.display_name,
            description: permissionFormData.description,
            resource: permissionFormData.resource,
            action: permissionFormData.action
          }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          type: 'success',
          title: 'Success',
          description: `Permission ${isEditing ? 'updated' : 'created'} successfully`
        })
        setShowPermissionDialog(false)
        resetPermissionForm()
        window.location.reload() // Refresh permissions list
      } else {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} permission`)
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

  // Reset forms
  const resetPermissionForm = () => {
    setPermissionFormData({
      name: '',
      display_name: '',
      description: '',
      resource: '',
      action: ''
    })
    setSelectedPermission(null)
    setIsEditing(false)
  }

  // Edit permission
  const editPermission = (permission: Permission) => {
    setSelectedPermission(permission)
    setPermissionFormData({
      name: permission.name || '',
      display_name: permission.display_name || '',
      description: permission.description || '',
      resource: permission.resource || '',
      action: permission.action || ''
    })
    
    // Ensure current permission's resource and action are in the dropdown options
    // (This is still needed as a fallback for edge cases)
    if (permission.resource && !availableResources.includes(permission.resource)) {
      setAvailableResources(prev => [...prev, permission.resource].sort())
    }
    if (permission.action && !availableActions.includes(permission.action)) {
      setAvailableActions(prev => [...prev, permission.action].sort())
    }
    
    setIsEditing(true)
    setShowPermissionDialog(true)
  }

  // Delete permission
  const deletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) return
    
    try {
      await dbRBAC.deletePermission(permissionId)
      toast({
        type: 'success',
        title: 'Success',
        description: 'Permission deleted successfully'
      })
      window.location.reload()
    } catch (error) {
      console.error('Error deleting permission:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete permission'
      })
    }
  }

  // Smart permission form helpers
  const generatePermissionName = (resource: string, action: string) => {
    if (!resource || !action) return ''
    return `${resource}:${action}`
  }

  const generateDisplayName = (resource: string, action: string) => {
    if (!resource || !action) return ''
    
    const actionMap: { [key: string]: string } = {
      'create': 'Create',
      'read': 'View', 
      'update': 'Edit',
      'delete': 'Delete',
      'manage': 'Manage',
      'approve': 'Approve',
      'publish': 'Publish',
      'archive': 'Archive',
      'export': 'Export',
      'import': 'Import',
      'view': 'View',
      'edit': 'Edit',
      'remove': 'Remove'
    }
    
    const resourceMap: { [key: string]: string } = {
      'admin': 'Admin',
      'cases': 'Cases',
      'contributions': 'Contributions', 
      'users': 'Users',
      'profile': 'Profile',
      'notifications': 'Notifications',
      'reports': 'Reports',
      'settings': 'Settings',
      'analytics': 'Analytics',
      'payments': 'Payments',
      'files': 'Files',
      'messages': 'Messages'
    }
    
    const actionText = actionMap[action] || action.charAt(0).toUpperCase() + action.slice(1)
    const resourceText = resourceMap[resource] || resource.charAt(0).toUpperCase() + resource.slice(1)
    
    return `${actionText} ${resourceText}`
  }

  const generateDescription = (resource: string, action: string) => {
    if (!resource || !action) return ''
    
    const template = getPermissionTemplates().find(t => t.resource === resource && t.action === action)
    if (template) return template.desc
    
    const actionDescMap: { [key: string]: string } = {
      'create': 'Allow creating new',
      'read': 'Allow viewing and accessing',
      'update': 'Allow modifying existing', 
      'delete': 'Allow removing',
      'manage': 'Allow full management of',
      'approve': 'Allow approving or rejecting',
      'publish': 'Allow publishing',
      'archive': 'Allow archiving',
      'export': 'Allow exporting data from',
      'import': 'Allow importing data to',
      'view': 'Allow viewing',
      'edit': 'Allow editing',
      'remove': 'Allow removing'
    }
    
    const actionDesc = actionDescMap[action] || `Allow ${action} operations on`
    return `${actionDesc} ${resource} in the system`
  }

  const applyTemplate = (template: ReturnType<typeof getPermissionTemplates>[0]) => {
    setPermissionFormData({
      name: generatePermissionName(template.resource, template.action),
      display_name: template.display,
      description: template.desc,
      resource: template.resource,
      action: template.action
    })
  }

  const handlePermissionFieldChange = (field: keyof PermissionFormData, value: string) => {
    const newData = { ...permissionFormData, [field]: value }
    
    // Auto-generate dependent fields when resource or action changes
    if (field === 'resource' || field === 'action') {
      if (newData.resource && newData.action) {
        newData.name = generatePermissionName(newData.resource, newData.action)
        
        // Only auto-generate if fields are empty or were auto-generated
        if (!permissionFormData.display_name || permissionFormData.display_name === generateDisplayName(permissionFormData.resource, permissionFormData.action)) {
          newData.display_name = generateDisplayName(newData.resource, newData.action)
        }
        
        if (!permissionFormData.description || permissionFormData.description === generateDescription(permissionFormData.resource, permissionFormData.action)) {
          newData.description = generateDescription(newData.resource, newData.action)
        }
      }
    }
    
    setPermissionFormData(newData)
  }

  if (loading || optionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard allowedPermissions={['admin:rbac']} fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to manage permissions.</p>
        </div>
      </div>
    }>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Permission Management</h1>
          <p className="text-gray-600">Create and manage system permissions for roles</p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Permissions ({permissions.length})</h2>
              <p className="text-sm text-gray-600 mt-1">
                Organized by {Object.keys(groupedPermissions).length} modules
              </p>
            </div>
            <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetPermissionForm(); setShowPermissionDialog(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Permission
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {isEditing ? '✏️ Edit Permission' : '🆕 Create Smart Permission'}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditing ? 'Update permission details' : 'Create a new permission with intelligent auto-generation and templates'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Quick Templates */}
                  <div className="lg:col-span-1">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      📋 Quick Templates
                    </h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {getPermissionTemplates().map((template, index) => (
                        <div
                          key={index}
                          onClick={() => applyTemplate(template)}
                          className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200 group"
                        >
                          <div className="font-medium text-sm text-gray-900 group-hover:text-blue-900">
                            {template.display}
                          </div>
                          <div className="text-xs text-blue-600 mt-1 font-mono bg-blue-100 px-2 py-1 rounded">
                            {template.resource}:{template.action}
                          </div>
                          <div className="text-xs text-gray-600 mt-2 line-clamp-2">
                            {template.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column - Smart Form */}
                  <div className="lg:col-span-2">
                    <div className="space-y-5">
                      {/* Resource & Action Selection */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="perm-resource" className="text-sm font-medium flex items-center gap-2">
                            🏷️ Resource
                          </Label>
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
                          <Label htmlFor="perm-action" className="text-sm font-medium flex items-center gap-2">
                            ⚡ Action
                          </Label>
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

                      {/* Auto-generated Permission Name */}
                      <div>
                        <Label htmlFor="perm-name" className="text-sm font-medium flex items-center gap-2">
                          🔑 Permission Name
                          <Badge variant="secondary" className="text-xs">auto-generated</Badge>
                        </Label>
                        <Input
                          id="perm-name"
                          value={permissionFormData.name}
                          onChange={(e) => handlePermissionFieldChange('name', e.target.value)}
                          placeholder="Select resource and action to auto-generate"
                          className="font-mono bg-gray-50"
                          disabled={isEditing}
                        />
                      </div>
                      
                      {/* Auto-generated Display Name */}
                      <div>
                        <Label htmlFor="perm-display-name" className="text-sm font-medium flex items-center gap-2">
                          📝 Display Name
                          <Badge variant="outline" className="text-xs">editable</Badge>
                        </Label>
                        <Input
                          id="perm-display-name"
                          value={permissionFormData.display_name}
                          onChange={(e) => handlePermissionFieldChange('display_name', e.target.value)}
                          placeholder="Human-readable permission name"
                        />
                      </div>
                      
                      {/* Auto-generated Description */}
                      <div>
                        <Label htmlFor="perm-description" className="text-sm font-medium flex items-center gap-2">
                          📄 Description
                          <Badge variant="outline" className="text-xs">editable</Badge>
                        </Label>
                        <Textarea
                          id="perm-description"
                          value={permissionFormData.description}
                          onChange={(e) => handlePermissionFieldChange('description', e.target.value)}
                          placeholder="Detailed description of what this permission allows"
                          rows={3}
                        />
                      </div>

                      {/* Live Preview */}
                      {permissionFormData.name && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            🔍 Live Preview
                          </h5>
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
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                  <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handlePermissionSubmit} 
                    disabled={saving || !permissionFormData.name || !permissionFormData.display_name}
                    className="min-w-[120px]"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {isEditing ? 'Update' : 'Create'}
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-8">
            {Object.entries(groupedPermissions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([resource, modulePermissions]) => {
                const moduleInfo = getModuleInfo(resource)
                const IconComponent = moduleInfo.icon
                const isCollapsed = collapsedModules.has(resource)
                
                return (
                  <div key={resource} className="space-y-4">
                    {/* Module Header - Clickable */}
                    <button
                      onClick={() => toggleModuleCollapse(resource)}
                      className="w-full flex items-center gap-4 pb-4 border-b border-gray-200 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                    >
                      <div className={`p-3 bg-gradient-to-r ${moduleInfo.color} rounded-xl shadow-lg`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-xl font-semibold text-gray-900">{moduleInfo.name}</h3>
                        <p className="text-sm text-gray-600">{moduleInfo.description}</p>
                      </div>
                      <Badge variant="outline" className="text-sm">
                        {modulePermissions.length} permission{modulePermissions.length !== 1 ? 's' : ''}
                      </Badge>
                      {isCollapsed ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    
                    {/* Module Permissions - Collapsible */}
                    {!isCollapsed && (
                      <div className="grid gap-3 ml-4">
                        {modulePermissions.map((permission) => (
                        <Card key={permission.id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                  <Key className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                  <CardTitle className="text-base">{permission.display_name}</CardTitle>
                                  <CardDescription className="font-mono text-xs">
                                    {permission.name}
                                  </CardDescription>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {permission.action}
                                </Badge>
                                {permission.is_system && (
                                  <Badge variant="secondary" className="text-xs">System</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => editPermission(permission)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {!permission.is_system && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => deletePermission(permission.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          {permission.description && (
                            <CardContent className="pt-0">
                              <p className="text-sm text-gray-600">{permission.description}</p>
                            </CardContent>
                          )}
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
