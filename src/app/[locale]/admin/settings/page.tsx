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
import { cn } from '@/lib/utils'
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
  BarChart3,
  Database,
  FolderTree,
  Edit,
  FileText
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import StandardModal, { StandardFormField } from '@/components/ui/standard-modal'
import TranslationButton from '@/components/translation/TranslationButton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { defaultLogger as logger } from '@/lib/logger'

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
      logger.error('Error fetching settings:', { error: error })
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
      logger.error('Error saving settings:', { error: error })
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
      logger.error('Error creating config:', { error: error })
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
          <DetailPageHeader
            backUrl={`/${locale}/admin`}
            icon={Settings}
            title="System Settings"
            description="Manage all system configuration settings"
            menuActions={[
              {
                label: 'Add Config',
                onClick: () => setIsCreateDialogOpen(true),
                icon: Plus,
              },
            ]}
            badge={stats.total > 0 ? {
              label: `${stats.total} ${stats.total === 1 ? 'config' : 'configs'}`,
              variant: 'secondary'
            } : undefined}
          />

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Database className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Total Configs</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <FolderTree className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-green-600">{stats.groups}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Groups</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Edit className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.edited}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Edited</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.filtered}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Filtered</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="mb-6 border border-gray-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search configs by key, value, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger className="w-full sm:w-[180px] h-10 text-sm">
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
                  <div className="flex border border-gray-300 rounded-md overflow-hidden">
                    <Button
                      variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('detailed')}
                      className="rounded-none border-r border-gray-300"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'compact' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('compact')}
                      className="rounded-none"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              {searchQuery && (
                <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
                  <span className="text-gray-600">
                    Found {stats.filtered} config{stats.filtered !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="h-8"
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={expandAll}
                    className="h-9"
                  >
                    <ChevronDown className="h-4 w-4 mr-1.5" />
                    Expand All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAll}
                    className="h-9"
                  >
                    <ChevronUp className="h-4 w-4 mr-1.5" />
                    Collapse All
                  </Button>
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  Showing <span className="text-indigo-600 font-semibold">{stats.filtered}</span> of <span className="text-gray-900">{stats.total}</span> configs
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
                    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-all">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="border-b bg-gradient-to-r from-white via-gray-50/50 to-white hover:from-indigo-50/30 hover:via-gray-50 hover:to-indigo-50/30 transition-colors cursor-pointer py-4 sm:py-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50 border border-indigo-200/50">
                                <span className="text-xl sm:text-2xl">{icon}</span>
                              </div>
                              <div className="text-left">
                                <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-gray-900">
                                  {displayName}
                                  <Badge variant="secondary" className="text-xs font-medium bg-indigo-100 text-indigo-700 border-indigo-200">
                                    {groupConfigs.length}
                                  </Badge>
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                  {groupConfigs.length} configuration{groupConfigs.length !== 1 ? 's' : ''}
                                </CardDescription>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-4 sm:p-6">
                          {viewMode === 'compact' ? (
                            <div className="space-y-2">
                              {groupConfigs.map((config) => {
                                const isEdited = editedConfigs.has(config.config_key)
                                return (
                                  <div
                                    key={config.config_key}
                                    className={cn(
                                      "grid grid-cols-12 gap-3 sm:gap-4 items-center p-3 sm:p-4 border rounded-lg transition-all",
                                      isEdited 
                                        ? "border-amber-300 bg-amber-50/30 hover:bg-amber-50/50" 
                                        : "border-gray-200 hover:border-indigo-200 hover:bg-gray-50"
                                    )}
                                  >
                                    <div className="col-span-12 sm:col-span-4">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Label className="font-mono text-xs sm:text-sm font-medium text-gray-900 break-all">
                                          {config.config_key}
                                        </Label>
                                        <Badge variant="outline" className="text-xs shrink-0">
                                          {config.group_type || 'general'}
                                        </Badge>
                                        {isEdited && (
                                          <Badge variant="default" className="bg-amber-500 text-xs shrink-0">
                                            <Edit className="h-3 w-3 mr-1" />
                                            Edited
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="col-span-12 sm:col-span-8">
                                      <Input
                                        type="text"
                                        value={getConfigValue(config.config_key)}
                                        onChange={(e) => handleConfigChange(config.config_key, 'config_value', e.target.value)}
                                        className={cn(
                                          "h-9 sm:h-10 text-sm font-mono",
                                          isEdited && "border-amber-300 focus-visible:ring-amber-500"
                                        )}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {groupConfigs.map((config) => {
                                const isEdited = editedConfigs.has(config.config_key)
                                return (
                                  <Card 
                                    key={config.config_key} 
                                    className={cn(
                                      "border transition-all",
                                      isEdited 
                                        ? "border-amber-300 bg-amber-50/30 shadow-sm" 
                                        : "border-gray-200 hover:border-indigo-200 hover:shadow-sm"
                                    )}
                                  >
                                    <CardContent className="p-4 sm:p-5">
                                      <div className="space-y-4">
                                        {/* Config Key and Badges */}
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <Label 
                                                htmlFor={config.config_key} 
                                                className="font-semibold text-sm sm:text-base font-mono text-gray-900 break-all"
                                              >
                                                {config.config_key}
                                              </Label>
                                              <Badge variant="outline" className="text-xs font-medium shrink-0">
                                                {config.group_type || 'general'}
                                              </Badge>
                                              {isEdited && (
                                                <Badge variant="default" className="bg-amber-500 text-xs font-medium shrink-0">
                                                  <Edit className="h-3 w-3 mr-1" />
                                                  Edited
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Config Value */}
                                        <div className="space-y-1">
                                          <Label className="text-xs font-medium text-gray-700">Value</Label>
                                          <Input
                                            id={config.config_key}
                                            type="text"
                                            value={getConfigValue(config.config_key)}
                                            onChange={(e) => handleConfigChange(config.config_key, 'config_value', e.target.value)}
                                            className={cn(
                                              "h-11 text-sm font-mono",
                                              isEdited && "border-amber-300 focus-visible:ring-amber-500"
                                            )}
                                            placeholder="Config value"
                                          />
                                        </div>
                                        
                                        {/* Descriptions Preview */}
                                        {(getConfigDescription(config.config_key, 'en') || getConfigDescription(config.config_key, 'ar')) && (
                                          <div className="space-y-2 pt-2 border-t border-gray-200">
                                            {getConfigDescription(config.config_key, 'en') && (
                                              <div>
                                                <p className="text-xs font-medium text-gray-500 mb-1">Description (EN)</p>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                  {getConfigDescription(config.config_key, 'en')}
                                                </p>
                                              </div>
                                            )}
                                            {getConfigDescription(config.config_key, 'ar') && (
                                              <div>
                                                <p className="text-xs font-medium text-gray-500 mb-1">Description (AR)</p>
                                                <p className="text-xs text-gray-600 leading-relaxed text-right" dir="rtl">
                                                  {getConfigDescription(config.config_key, 'ar')}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Description Editors */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                                          <div className="space-y-2">
                                            <Label className="text-xs font-medium text-gray-700">Description (EN)</Label>
                                            <div className="relative">
                                              <Textarea
                                                value={getConfigDescription(config.config_key, 'en') || ''}
                                                onChange={(e) => handleConfigChange(config.config_key, 'description', e.target.value || null)}
                                                className={cn(
                                                  "h-24 text-sm resize-none pr-10",
                                                  isEdited && "border-amber-300 focus-visible:ring-amber-500"
                                                )}
                                                placeholder="English description"
                                              />
                                              <div className="absolute bottom-2 right-2">
                                                <TranslationButton
                                                  sourceText={getConfigDescription(config.config_key, 'ar') || ''}
                                                  direction="ar-to-en"
                                                  onTranslate={(translated) => handleConfigChange(config.config_key, 'description', translated)}
                                                  size="sm"
                                                  variant="ghost"
                                                  iconOnly
                                                  disabled={!getConfigDescription(config.config_key, 'ar')}
                                                  className="h-7 w-7 p-0 bg-white hover:bg-gray-50 shadow-sm"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-xs font-medium text-gray-700">Description (AR)</Label>
                                            <div className="relative">
                                              <Textarea
                                                value={getConfigDescription(config.config_key, 'ar') || ''}
                                                onChange={(e) => handleConfigChange(config.config_key, 'description_ar', e.target.value || null)}
                                                className={cn(
                                                  "h-24 text-sm resize-none pl-10",
                                                  isEdited && "border-amber-300 focus-visible:ring-amber-500"
                                                )}
                                                placeholder="Arabic description"
                                                dir="rtl"
                                              />
                                              <div className="absolute bottom-2 left-2">
                                                <TranslationButton
                                                  sourceText={getConfigDescription(config.config_key, 'en') || ''}
                                                  direction="en-to-ar"
                                                  onTranslate={(translated) => handleConfigChange(config.config_key, 'description_ar', translated)}
                                                  size="sm"
                                                  variant="ghost"
                                                  iconOnly
                                                  disabled={!getConfigDescription(config.config_key, 'en')}
                                                  className="h-7 w-7 p-0 bg-white hover:bg-gray-50 shadow-sm"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                )
                              })}
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}

              {/* Action Buttons */}
              <Card className="border border-gray-200 shadow-sm mt-6">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {hasChanges ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-700">
                            {stats.edited} unsaved change{stats.edited !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">All changes saved</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={saving || !hasChanges}
                        className="flex-1 sm:flex-initial min-w-[100px] h-10"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="flex-1 sm:flex-initial min-w-[140px] h-10 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-sm hover:shadow-md"
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
                </CardContent>
              </Card>
            </div>
          )}
        </Container>
      </div>

      {/* Create Config Dialog */}
      <StandardModal
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Create New Configuration"
        description="Add a new system configuration setting. The group type will be automatically determined based on the config key pattern."
        sections={[
          {
            title: 'Configuration Details',
            children: (
              <div className="space-y-4">
                <StandardFormField
                  label="Config Key"
                  required
                  description={`Group type will be: ${newConfig.config_key ? getGroupType(newConfig.config_key) : 'general'}`}
                >
                  <Input
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
                    className="h-10"
                  />
                </StandardFormField>
                
                <StandardFormField
                  label="Config Value"
                  required
                >
                  <Input
                    value={newConfig.config_value || ''}
                    onChange={(e) => setNewConfig({ ...newConfig, config_value: e.target.value })}
                    placeholder="Enter the configuration value"
                    className="h-10"
                  />
                </StandardFormField>
              </div>
            )
          },
          {
            title: 'Descriptions',
            children: (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Description (EN)</Label>
                  <div className="relative">
                    <Textarea
                      value={newConfig.description || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                      placeholder="English description"
                      className="h-24 text-sm resize-none pr-10"
                    />
                    <div className="absolute bottom-2 right-2">
                      <TranslationButton
                        sourceText={newConfig.description_ar || ''}
                        direction="ar-to-en"
                        onTranslate={(translated) => setNewConfig({ ...newConfig, description: translated })}
                        size="sm"
                        variant="ghost"
                        iconOnly
                        disabled={!newConfig.description_ar}
                        className="h-7 w-7 p-0 bg-white hover:bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Description (AR)</Label>
                  <div className="relative">
                    <Textarea
                      value={newConfig.description_ar || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, description_ar: e.target.value })}
                      placeholder="Arabic description"
                      className="h-24 text-sm resize-none pl-10"
                      dir="rtl"
                    />
                    <div className="absolute bottom-2 left-2">
                      <TranslationButton
                        sourceText={newConfig.description || ''}
                        direction="en-to-ar"
                        onTranslate={(translated) => setNewConfig({ ...newConfig, description_ar: translated })}
                        size="sm"
                        variant="ghost"
                        iconOnly
                        disabled={!newConfig.description}
                        className="h-7 w-7 p-0 bg-white hover:bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          },
          {
            title: 'Advanced',
            children: (
              <StandardFormField
                label="Group Type"
                description="If left empty, will be determined automatically from the config key pattern"
              >
                <Input
                  value={newConfig.group_type || ''}
                  onChange={(e) => setNewConfig({ ...newConfig, group_type: e.target.value || null })}
                  placeholder="Leave empty for auto-detection"
                  className="h-10"
                />
              </StandardFormField>
            )
          }
        ]}
        primaryAction={{
          label: 'Create Config',
          onClick: handleCreateConfig,
          loading: saving,
          disabled: !newConfig.config_key || !newConfig.config_value
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => {
            setIsCreateDialogOpen(false)
            setNewConfig({
              config_key: '',
              config_value: '',
              description: '',
              description_ar: '',
              group_type: null,
            })
          }
        }}
        maxWidth="2xl"
      />
    </PermissionGuard>
  )
}
