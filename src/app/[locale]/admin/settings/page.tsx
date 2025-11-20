'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import {
  Settings,
  Save,
  RefreshCw,
  Loader2,
  Info,
  AlertCircle,
  CheckCircle,
  Plus,
  X,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Grid3x3,
  List,
  BarChart3
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SystemConfig {
  config_key: string
  config_value: string
  description: string | null
  description_ar: string | null
  group_type: string | null
}

type ConfigGroup = {
  [key: string]: SystemConfig[]
}

const GROUP_DISPLAY_NAMES: { [key: string]: string } = {
  auth: 'Authentication',
  validation: 'Validation',
  pagination: 'Pagination',
  contact: 'Contact Information',
  general: 'General Settings',
}

const GROUP_ICONS: { [key: string]: string } = {
  auth: '🔐',
  validation: '✓',
  pagination: '📄',
  contact: '📞',
  general: '⚙️',
}

type ViewMode = 'detailed' | 'compact'

export default function SystemSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin')
  const { containerVariant } = useLayout()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [editedConfigs, setEditedConfigs] = useState<Map<string, SystemConfig>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [newConfig, setNewConfig] = useState<Partial<SystemConfig>>({
    config_key: '',
    config_value: '',
    description: '',
    description_ar: '',
    group_type: null,
  })

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/settings')
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast.error('Error', { description: 'Unauthorized access to system settings' })
          return
        }
        throw new Error(`Failed to load system settings: ${response.statusText}`)
      }

      const data = await response.json()
      const configs = data.configs || []
      setConfigs(configs)
      setEditedConfigs(new Map())
      setHasChanges(false)
      
      // Auto-expand all groups initially
      const groups = new Set(configs.map((c: any) => c.group_type || 'general'))
      setExpandedGroups(groups as Set<string>)
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Error', { description: 'Failed to load system settings' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Group configs by group_type
  const groupedConfigs: ConfigGroup = useMemo(() => {
    return configs.reduce((acc, config) => {
      const group = config.group_type || 'general'
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(config)
      return acc
    }, {} as ConfigGroup)
  }, [configs])

  // Filter configs based on search query and selected group
  const filteredConfigs = useMemo(() => {
    let filtered = configs

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(config =>
        config.config_key.toLowerCase().includes(query) ||
        config.config_value.toLowerCase().includes(query) ||
        (config.description && config.description.toLowerCase().includes(query)) ||
        (config.description_ar && config.description_ar.toLowerCase().includes(query))
      )
    }

    // Filter by selected group
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(config => (config.group_type || 'general') === selectedGroup)
    }

    return filtered
  }, [configs, searchQuery, selectedGroup])

  // Group filtered configs
  const filteredGroupedConfigs: ConfigGroup = useMemo(() => {
    return filteredConfigs.reduce((acc, config) => {
      const group = config.group_type || 'general'
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(config)
      return acc
    }, {} as ConfigGroup)
  }, [filteredConfigs])

  // Get all group types for tabs
  const groupTypes = useMemo(() => {
    const groups = Array.from(new Set(configs.map(c => c.group_type || 'general')))
    return groups.sort()
  }, [configs])

  // Stats
  const stats = useMemo(() => {
    const total = configs.length
    const edited = editedConfigs.size
    const groups = Object.keys(groupedConfigs).length
    const filtered = filteredConfigs.length
    return { total, edited, groups, filtered }
  }, [configs.length, editedConfigs.size, groupedConfigs, filteredConfigs.length])

  const handleConfigChange = (configKey: string, field: keyof SystemConfig, value: string | null) => {
    const config = configs.find(c => c.config_key === configKey)
    if (!config) return

    const edited = editedConfigs.get(configKey) || { ...config }
    edited[field] = value as any
    editedConfigs.set(configKey, edited)
    setEditedConfigs(new Map(editedConfigs))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const configsToSave = Array.from(editedConfigs.values())

      if (configsToSave.length === 0) {
        toast.info('No changes to save')
        return
      }

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          configs: configsToSave
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast.error('Error', { description: errorData.error || 'Failed to save system settings' })
        return
      }

      toast.success('Success', { description: 'System settings updated successfully' })
      setHasChanges(false)
      await fetchSettings()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Error', { description: 'Failed to save system settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateConfig = async () => {
    if (!newConfig.config_key || !newConfig.config_value) {
      toast.error('Error', { description: 'Config key and value are required' })
      return
    }

    try {
      setSaving(true)

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig)
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast.error('Error', { description: errorData.error || 'Failed to create config' })
        return
      }

      toast.success('Success', { description: 'Config created successfully' })
      setIsCreateDialogOpen(false)
      setNewConfig({
        config_key: '',
        config_value: '',
        description: '',
        description_ar: '',
        group_type: null,
      })
      await fetchSettings()
    } catch (error) {
      console.error('Error creating config:', error)
      toast.error('Error', { description: 'Failed to create config' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    fetchSettings()
    setHasChanges(false)
  }

  const toggleGroup = (groupType: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupType)) {
        next.delete(groupType)
      } else {
        next.add(groupType)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedGroups(new Set(groupTypes))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  const getConfigValue = (configKey: string): string => {
    const edited = editedConfigs.get(configKey)
    if (edited) return edited.config_value
    const config = configs.find(c => c.config_key === configKey)
    return config?.config_value || ''
  }

  const getConfigDescription = (configKey: string, lang: 'en' | 'ar'): string | null => {
    const edited = editedConfigs.get(configKey)
    if (edited) {
      return lang === 'en' ? edited.description : edited.description_ar
    }
    const config = configs.find(c => c.config_key === configKey)
    return lang === 'en' ? (config?.description || null) : (config?.description_ar || null)
  }

  const getGroupType = (configKey: string): string => {
    if (!configKey) return 'general'
    
    if (configKey.includes('.')) {
      const firstSegment = configKey.split('.')[0]
      if (['auth', 'validation', 'pagination', 'contact', 'notification', 'email', 'storage'].includes(firstSegment)) {
        return firstSegment
      }
      return firstSegment
    }
    
    const contactKeys = ['email', 'facebook_url', 'instagram_url', 'whatsapp_number', 'whatsapp_default_message', 'whatsapp_default_message_ar']
    if (contactKeys.includes(configKey)) {
      return 'contact'
    }
    
    return 'general'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading system settings...</p>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard permissions={['admin:dashboard']} fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to access system settings.</p>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
        <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <DetailPageHeader
              backUrl={`/${locale}/admin`}
              icon={Settings}
              title="System Settings"
              description="Manage all system configuration settings"
            />
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Config
            </Button>
          </div>

          {/* Stats Bar */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-xs text-gray-500">Total Configs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.groups}</div>
                  <div className="text-xs text-gray-500">Groups</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.edited}</div>
                  <div className="text-xs text-gray-500">Edited</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.filtered}</div>
                  <div className="text-xs text-gray-500">Filtered</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filters */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search configs by key, value, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups ({stats.total})</SelectItem>
                      {groupTypes.map(group => (
                        <SelectItem key={group} value={group}>
                          {GROUP_DISPLAY_NAMES[group] || group} ({groupedConfigs[group]?.length || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex border rounded-md">
                    <Button
                      variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('detailed')}
                      className="rounded-r-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'compact' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('compact')}
                      className="rounded-l-none"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              {searchQuery && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Found {stats.filtered} config{stats.filtered !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Content */}
          {Object.keys(filteredGroupedConfigs).length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No configurations found</p>
                <p className="text-gray-400 text-sm mb-4">
                  {searchQuery ? 'Try adjusting your search query' : 'Get started by creating your first configuration'}
                </p>
                <Button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedGroup('all')
                    setIsCreateDialogOpen(true)
                  }}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Config
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Group Controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={expandAll}
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Expand All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAll}
                  >
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Collapse All
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  Showing {stats.filtered} of {stats.total} configs
                </div>
              </div>

              {/* Config Groups */}
              {Object.entries(filteredGroupedConfigs).map(([groupType, groupConfigs]) => {
                const isExpanded = expandedGroups.has(groupType)
                const displayName = GROUP_DISPLAY_NAMES[groupType] || groupType
                const icon = GROUP_ICONS[groupType] || '⚙️'

                return (
                  <Collapsible
                    key={groupType}
                    open={isExpanded}
                    onOpenChange={() => toggleGroup(groupType)}
                  >
                    <Card className="shadow-lg">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="border-b bg-gradient-to-r from-white to-gray-50 hover:from-gray-50 hover:to-gray-100 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">{icon}</div>
                              <div className="text-left">
                                <CardTitle className="flex items-center gap-2">
                                  {displayName}
                                  <Badge variant="secondary" className="text-xs">
                                    {groupConfigs.length}
                                  </Badge>
                                </CardTitle>
                                <CardDescription>
                                  {groupConfigs.length} configuration{groupConfigs.length !== 1 ? 's' : ''}
                                </CardDescription>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-6">
                          {viewMode === 'compact' ? (
                            <div className="space-y-2">
                              {groupConfigs.map((config) => (
                                <div
                                  key={config.config_key}
                                  className="grid grid-cols-12 gap-4 items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <div className="col-span-4">
                                    <div className="flex items-center gap-2">
                                      <Label className="font-mono text-sm">{config.config_key}</Label>
                                      <Badge variant="outline" className="text-xs">
                                        {config.group_type || 'general'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="col-span-6">
                                    <Input
                                      type="text"
                                      value={getConfigValue(config.config_key)}
                                      onChange={(e) => handleConfigChange(config.config_key, 'config_value', e.target.value)}
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                  <div className="col-span-2 text-right">
                                    {editedConfigs.has(config.config_key) && (
                                      <Badge variant="default" className="bg-amber-500">
                                        Edited
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {groupConfigs.map((config) => (
                                <div key={config.config_key} className="space-y-3 pb-4 border-b last:border-b-0 last:pb-0">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Label htmlFor={config.config_key} className="font-semibold text-sm font-mono">
                                          {config.config_key}
                                        </Label>
                                        <Badge variant="outline" className="text-xs">
                                          {config.group_type || 'general'}
                                        </Badge>
                                        {editedConfigs.has(config.config_key) && (
                                          <Badge variant="default" className="bg-amber-500 text-xs">
                                            Edited
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      <Input
                                        id={config.config_key}
                                        type="text"
                                        value={getConfigValue(config.config_key)}
                                        onChange={(e) => handleConfigChange(config.config_key, 'config_value', e.target.value)}
                                        className="h-10"
                                        placeholder="Config value"
                                      />
                                      
                                      {getConfigDescription(config.config_key, 'en') && (
                                        <p className="text-xs text-gray-500">
                                          {getConfigDescription(config.config_key, 'en')}
                                        </p>
                                      )}
                                      
                                      {getConfigDescription(config.config_key, 'ar') && (
                                        <p className="text-xs text-gray-500 text-right" dir="rtl">
                                          {getConfigDescription(config.config_key, 'ar')}
                                        </p>
                                      )}

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                        <div className="space-y-1">
                                          <Label className="text-xs text-gray-500">Description (EN)</Label>
                                          <Textarea
                                            value={getConfigDescription(config.config_key, 'en') || ''}
                                            onChange={(e) => handleConfigChange(config.config_key, 'description', e.target.value || null)}
                                            className="h-16 text-sm"
                                            placeholder="English description"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs text-gray-500">Description (AR)</Label>
                                          <Textarea
                                            value={getConfigDescription(config.config_key, 'ar') || ''}
                                            onChange={(e) => handleConfigChange(config.config_key, 'description_ar', e.target.value || null)}
                                            className="h-16 text-sm"
                                            placeholder="Arabic description"
                                            dir="rtl"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  {hasChanges && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{stats.edited} unsaved change{stats.edited !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={saving || !hasChanges}
                    className="min-w-[100px]"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="min-w-[120px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Container>
      </div>

      {/* Create Config Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Configuration</DialogTitle>
            <DialogDescription>
              Add a new system configuration setting. The group type will be automatically determined based on the config key pattern.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new_config_key">Config Key *</Label>
              <Input
                id="new_config_key"
                value={newConfig.config_key || ''}
                onChange={(e) => {
                  const key = e.target.value
                  setNewConfig({
                    ...newConfig,
                    config_key: key,
                    group_type: getGroupType(key) || null
                  })
                }}
                placeholder="e.g., validation.case.title.min_length"
              />
              <p className="text-xs text-gray-500">
                Group type will be: <Badge variant="outline">{newConfig.config_key ? getGroupType(newConfig.config_key) : 'general'}</Badge>
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new_config_value">Config Value *</Label>
              <Input
                id="new_config_value"
                value={newConfig.config_value || ''}
                onChange={(e) => setNewConfig({ ...newConfig, config_value: e.target.value })}
                placeholder="Enter the configuration value"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_description">Description (EN)</Label>
                <Textarea
                  id="new_description"
                  value={newConfig.description || ''}
                  onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                  placeholder="English description"
                  className="h-20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_description_ar">Description (AR)</Label>
                <Textarea
                  id="new_description_ar"
                  value={newConfig.description_ar || ''}
                  onChange={(e) => setNewConfig({ ...newConfig, description_ar: e.target.value })}
                  placeholder="Arabic description"
                  className="h-20"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_group_type">Group Type (Optional)</Label>
              <Input
                id="new_group_type"
                value={newConfig.group_type || ''}
                onChange={(e) => setNewConfig({ ...newConfig, group_type: e.target.value || null })}
                placeholder="Leave empty for auto-detection"
              />
              <p className="text-xs text-gray-500">
                If left empty, will be determined automatically from the config key pattern
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setNewConfig({
                  config_key: '',
                  config_value: '',
                  description: '',
                  description_ar: '',
                  group_type: null,
                })
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateConfig}
              disabled={saving || !newConfig.config_key || !newConfig.config_value}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Config
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  )
}
