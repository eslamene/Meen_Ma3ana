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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import {
  Sparkles,
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Edit,
  Info,
  Settings,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  X,
  GripVertical,
  Eye,
  EyeOff,
  Grid3x3,
  List,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface AIRule {
  id: string
  rule_key: string
  instruction: string
  scope: string
  scope_reference: string | null
  priority: number
  version: number
  is_active: boolean
  metadata: any
  created_at: string
  updated_at: string
}

interface AIRuleParameter {
  id: string
  rule_key: string
  parameter_key: string
  parameter_value: string
  created_at: string
  updated_at: string
}

// Category configuration
const CATEGORIES = {
  title: {
    label: 'Title Generation',
    icon: '📝',
    description: 'Configure how AI generates case titles',
  },
  description: {
    label: 'Description Generation',
    icon: '📄',
    description: 'Configure how AI generates case descriptions',
  },
  content: {
    label: 'Content Safety Rules',
    icon: '🛡️',
    description: 'Rules that ensure generated content follows safety guidelines',
  },
}

// Parameter options for select fields
const PARAMETER_OPTIONS: Record<string, string[]> = {
  'title.style': ['catchy', 'emotional', 'direct', 'compelling'],
  'title.tone': ['professional', 'compassionate', 'urgent', 'hopeful', 'friendly'],
  'description.style': ['storytelling', 'factual', 'emotional', 'detailed', 'structured'],
  'description.tone': ['professional', 'compassionate', 'urgent', 'hopeful'],
  'description.structure': ['paragraph', 'structured', 'narrative'],
}

// Sortable Rule Item Component
function SortableRuleItem({
  rule,
  parameters,
  editedRules,
  editedParameters,
  onRuleChange,
  onParameterChange,
  getRule,
  getParameter,
  getParameterValue,
  showAdvanced,
}: {
  rule: AIRule
  parameters: AIRuleParameter[]
  editedRules: Map<string, AIRule>
  editedParameters: Map<string, AIRuleParameter>
  onRuleChange: (rule: AIRule, field: keyof AIRule, value: any) => void
  onParameterChange: (param: AIRuleParameter, value: string) => void
  getRule: (ruleKey: string) => AIRule | undefined
  getParameter: (ruleKey: string, parameterKey: string) => AIRuleParameter | undefined
  getParameterValue: (ruleKey: string, parameterKey: string) => string
  showAdvanced: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isEdited = editedRules.has(rule.rule_key)
  const editedRule = getRule(rule.rule_key)!
  const ruleParams = parameters.filter(p => p.rule_key === rule.rule_key)
  const ruleType = rule.metadata?.type || 'guideline'
  const ruleLanguage = rule.metadata?.language

  const getRuleLabel = (ruleKey: string): string => {
    const parts = ruleKey.split('.')
    const lastPart = parts[parts.length - 1]
    return lastPart.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-50")}>
      <Card className={cn("border transition-all", isEdited && "border-amber-300 shadow-md", isDragging && "shadow-lg")}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Drag Handle */}
              <button
                {...attributes}
                {...listeners}
                className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-5 w-5" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <CardTitle className="text-sm font-semibold">
                    {getRuleLabel(rule.rule_key)}
                  </CardTitle>
                  {isEdited && (
                    <Badge variant="default" className="bg-amber-500 text-xs">
                      <Edit className="h-3 w-3 mr-1" />
                      Edited
                    </Badge>
                  )}
                  {ruleType && (
                    <Badge variant="outline" className="text-xs">
                      {ruleType}
                    </Badge>
                  )}
                  {ruleLanguage && (
                    <Badge variant="secondary" className="text-xs">
                      {ruleLanguage.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs break-all">
                  {rule.rule_key} • Priority: {rule.priority} • Version: {rule.version}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Label className="text-xs text-gray-600 hidden sm:inline">Active</Label>
              <Switch
                checked={editedRule.is_active}
                onCheckedChange={(checked) => onRuleChange(editedRule, 'is_active', checked)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instruction */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Instruction</Label>
            <Textarea
              value={editedRule.instruction}
              onChange={(e) => onRuleChange(editedRule, 'instruction', e.target.value)}
              className={cn("min-h-[80px] text-sm font-mono", isEdited && "border-amber-300")}
              placeholder="AI instruction text..."
            />
            <p className="text-xs text-gray-500">
              Use {'{{parameter_name}}'} for parameter substitution.
            </p>
          </div>

          {/* Parameters */}
          {ruleParams.length > 0 && (
            <div className="space-y-3 pt-3 border-t">
              <Label className="text-xs font-medium text-gray-700">Parameters</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ruleParams.map((param) => {
                  const editedParam = getParameter(param.rule_key, param.parameter_key)!
                  const isParamEdited = editedParameters.has(`${param.rule_key}.${param.parameter_key}`)
                  const paramValue = getParameterValue(param.rule_key, param.parameter_key)
                  const options = PARAMETER_OPTIONS[param.rule_key]

                  return (
                    <div key={param.id} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-600">
                          {param.parameter_key}
                        </Label>
                        {isParamEdited && (
                          <Badge variant="default" className="bg-amber-500 text-xs">
                            Edited
                          </Badge>
                        )}
                      </div>
                      {options ? (
                        <Select
                          value={paramValue}
                          onValueChange={(value) => onParameterChange(editedParam, value)}
                        >
                          <SelectTrigger className={cn("h-9 text-sm", isParamEdited && "border-amber-300")}>
                            <SelectValue placeholder="Select value..." />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map(option => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={param.parameter_key.includes('length') ? 'number' : 'text'}
                          value={paramValue}
                          onChange={(e) => onParameterChange(editedParam, e.target.value)}
                          className={cn("h-9 text-sm", isParamEdited && "border-amber-300")}
                          placeholder="Enter value..."
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Advanced fields */}
          {showAdvanced && (
            <div className="space-y-3 pt-3 border-t">
              <Label className="text-xs font-medium text-gray-700">Advanced</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Priority</Label>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={editedRule.priority}
                    onChange={(e) => onRuleChange(editedRule, 'priority', parseInt(e.target.value) || 100)}
                    className={cn("h-9 text-sm", isEdited && "border-amber-300")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Version</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editedRule.version}
                    onChange={(e) => onRuleChange(editedRule, 'version', parseInt(e.target.value) || 1)}
                    className={cn("h-9 text-sm", isEdited && "border-amber-300")}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AISettingsPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin')
  const { containerVariant } = useLayout()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rules, setRules] = useState<AIRule[]>([])
  const [parameters, setParameters] = useState<AIRuleParameter[]>([])
  const [editedRules, setEditedRules] = useState<Map<string, AIRule>>(new Map())
  const [editedParameters, setEditedParameters] = useState<Map<string, AIRuleParameter>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['title', 'description', 'content']))
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'category' | 'flat'>('category')

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/settings/ai')
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast.error('Error', { description: 'Unauthorized access to AI settings' })
          return
        }
        throw new Error(`Failed to load AI settings: ${response.statusText}`)
      }

      const data = await response.json()
      const fetchedRules = data.rules || []
      const fetchedParameters = data.parameters || []
      
      setRules(fetchedRules)
      setParameters(fetchedParameters)
      setEditedRules(new Map())
      setEditedParameters(new Map())
      setHasChanges(false)
    } catch (error) {
      // Use console.error for client-side logging to avoid serialization issues
      // eslint-disable-next-line no-console
      console.error('Error fetching AI settings:', error instanceof Error ? error.message : String(error), error)
      toast.error('Error', { description: 'Failed to load AI settings' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Filter and search rules
  const filteredRules = useMemo(() => {
    let filtered = [...rules]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(rule =>
        rule.rule_key.toLowerCase().includes(query) ||
        rule.instruction.toLowerCase().includes(query) ||
        (rule.metadata?.category || '').toLowerCase().includes(query) ||
        (rule.metadata?.type || '').toLowerCase().includes(query)
      )
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(rule => (rule.metadata?.category || 'other') === filterCategory)
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(rule => (rule.metadata?.type || 'guideline') === filterType)
    }

    // Active filter
    if (filterActive !== 'all') {
      const isActive = filterActive === 'active'
      filtered = filtered.filter(rule => {
        const edited = editedRules.get(rule.rule_key)
        return edited ? edited.is_active === isActive : rule.is_active === isActive
      })
    }

    return filtered
  }, [rules, searchQuery, filterCategory, filterType, filterActive, editedRules])

  // Group rules by category
  const categorizedRules = useMemo(() => {
    const categorized: { [key: string]: { rules: AIRule[], parameters: AIRuleParameter[] } } = {
      title: { rules: [], parameters: [] },
      description: { rules: [], parameters: [] },
      content: { rules: [], parameters: [] },
      other: { rules: [], parameters: [] },
    }

    filteredRules.forEach((rule) => {
      const category = rule.metadata?.category || 'other'
      if (category in categorized) {
        categorized[category].rules.push(rule)
      } else {
        categorized.other.rules.push(rule)
      }
    })

    parameters.forEach((param) => {
      const rule = filteredRules.find(r => r.rule_key === param.rule_key)
      const category = rule?.metadata?.category || 'other'
      if (category in categorized) {
        categorized[category].parameters.push(param)
      } else {
        categorized.other.parameters.push(param)
      }
    })

    // Sort rules by priority
    Object.keys(categorized).forEach(key => {
      categorized[key].rules.sort((a, b) => a.priority - b.priority)
    })

    return categorized
  }, [filteredRules, parameters])

  // Flat list of all filtered rules (for flat view)
  const flatRules = useMemo(() => {
    return filteredRules.sort((a, b) => a.priority - b.priority)
  }, [filteredRules])

  const getRule = (ruleKey: string): AIRule | undefined => {
    const edited = editedRules.get(ruleKey)
    if (edited) return edited
    return rules.find(r => r.rule_key === ruleKey)
  }

  const getParameter = (ruleKey: string, parameterKey: string): AIRuleParameter | undefined => {
    const key = `${ruleKey}.${parameterKey}`
    const edited = editedParameters.get(key)
    if (edited) return edited
    return parameters.find(p => p.rule_key === ruleKey && p.parameter_key === parameterKey)
  }

  const getParameterValue = (ruleKey: string, parameterKey: string): string => {
    const param = getParameter(ruleKey, parameterKey)
    return param?.parameter_value || ''
  }

  const handleRuleChange = (rule: AIRule, field: keyof AIRule, value: any) => {
    const edited = { ...rule, [field]: value }
    editedRules.set(rule.rule_key, edited)
    setEditedRules(new Map(editedRules))
    setHasChanges(true)
  }

  const handleParameterChange = (param: AIRuleParameter, value: string) => {
    const edited = { ...param, parameter_value: value }
    editedParameters.set(`${param.rule_key}.${param.parameter_key}`, edited)
    setEditedParameters(new Map(editedParameters))
    setHasChanges(true)
  }

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent, categoryRules: AIRule[]) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = categoryRules.findIndex(r => r.id === active.id)
    const newIndex = categoryRules.findIndex(r => r.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const reorderedRules = arrayMove(categoryRules, oldIndex, newIndex)
    
    // Update priorities based on new order
    const updatedRules = reorderedRules.map((rule, index) => {
      const basePriority = Math.min(...categoryRules.map(r => r.priority))
      const newPriority = basePriority + index
      const edited = { ...rule, priority: newPriority }
      editedRules.set(rule.rule_key, edited)
      return edited
    })

    setEditedRules(new Map(editedRules))
    setHasChanges(true)
    toast.success('Rules reordered', { description: 'Priorities updated. Save to apply changes.' })
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const rulesToUpdate = Array.from(editedRules.values())
      const parametersToUpdate = Array.from(editedParameters.values())

      if (rulesToUpdate.length === 0 && parametersToUpdate.length === 0) {
        toast.info('No changes to save')
        return
      }

      const response = await fetch('/api/admin/settings/ai', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rules: rulesToUpdate,
          parameters: parametersToUpdate,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast.error('Error', { description: errorData.error || 'Failed to save AI settings' })
        return
      }

      toast.success('Success', { description: 'AI settings updated successfully' })
      setHasChanges(false)
      await fetchSettings()
    } catch (error) {
      // Use console.error for client-side logging to avoid serialization issues
      // eslint-disable-next-line no-console
      console.error('Error saving AI settings:', error instanceof Error ? error.message : String(error), error)
      toast.error('Error', { description: 'Failed to save AI settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    fetchSettings()
    setHasChanges(false)
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterCategory('all')
    setFilterType('all')
    setFilterActive('all')
  }

  const hasActiveFilters = searchQuery || filterCategory !== 'all' || filterType !== 'all' || filterActive !== 'all'

  const stats = useMemo(() => {
    const totalRules = rules.length
    const activeRules = rules.filter(r => r.is_active).length
    const editedRulesCount = editedRules.size
    const editedParamsCount = editedParameters.size
    const filteredCount = filteredRules.length
    return { totalRules, activeRules, editedRulesCount, editedParamsCount, filteredCount }
  }, [rules, editedRules.size, editedParameters.size, filteredRules.length])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading AI settings...</p>
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
            <p className="text-gray-600 mb-4">You don&apos;t have permission to access AI settings.</p>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-50">
        <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
          <DetailPageHeader
            backUrl={`/${locale}/admin/settings`}
            icon={Sparkles}
            title="AI Content Generation Settings"
            description="Configure AI rules and parameters for generating case titles and descriptions"
            badge={stats.totalRules > 0 ? {
              label: `${stats.activeRules}/${stats.totalRules} active rules`,
              variant: 'secondary'
            } : undefined}
          />

          {/* Search and Filter Bar */}
          <Card className="mb-6 border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search rules by key, instruction, category, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600 flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      Category
                    </Label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="description">Description</SelectItem>
                        <SelectItem value="content">Content</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Type</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="guideline">Guideline</SelectItem>
                        <SelectItem value="constraint">Constraint</SelectItem>
                        <SelectItem value="restriction">Restriction</SelectItem>
                        <SelectItem value="style">Style</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Status</Label>
                    <Select value={filterActive} onValueChange={setFilterActive}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">View</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={viewMode === 'category' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('category')}
                        className="flex-1 h-9"
                      >
                        <Grid3x3 className="h-4 w-4 mr-1" />
                        Category
                      </Button>
                      <Button
                        variant={viewMode === 'flat' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('flat')}
                        className="flex-1 h-9"
                      >
                        <List className="h-4 w-4 mr-1" />
                        Flat
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Active Filters Indicator */}
                {hasActiveFilters && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Showing {stats.filteredCount} of {stats.totalRules} rules</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-7 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info Banner */}
          <Card className="mb-6 border-indigo-200 bg-indigo-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-indigo-900 font-medium mb-1">
                    How AI Rules Work
                  </p>
                  <p className="text-xs text-indigo-700">
                    Rules are small, human-written instructions that are combined at runtime into AI system prompts. 
                    Drag rules to reorder (updates priority). Rules are ordered by priority and can be enabled/disabled. 
                    Parameters allow dynamic values in instructions.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rules Display */}
          {viewMode === 'category' ? (
            // Category View
            <div className="space-y-6">
              {Object.entries(CATEGORIES).map(([categoryKey, category]) => {
                const categoryData = categorizedRules[categoryKey]
                const isExpanded = expandedCategories.has(categoryKey)
                const hasRules = categoryData.rules.length > 0

                if (!hasRules) return null

                return (
                  <Card key={categoryKey} className="border border-gray-200 shadow-sm">
                    <CardHeader 
                      className="border-b bg-gradient-to-r from-white via-purple-50/30 to-white cursor-pointer hover:bg-gray-50/50 transition-colors"
                      onClick={() => toggleCategory(categoryKey)}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3">
                          <span className="text-2xl">{category.icon}</span>
                          <div>
                            <div className="text-lg font-semibold text-gray-900">
                              {category.label}
                            </div>
                            <CardDescription className="text-xs mt-0.5">
                              {category.description} • {categoryData.rules.length} rule{categoryData.rules.length !== 1 ? 's' : ''}
                            </CardDescription>
                          </div>
                        </CardTitle>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="p-6">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleDragEnd(e, categoryData.rules)}
                        >
                          <SortableContext
                            items={categoryData.rules.map(r => r.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-4">
                              {categoryData.rules.map(rule => (
                                <SortableRuleItem
                                  key={rule.id}
                                  rule={rule}
                                  parameters={parameters}
                                  editedRules={editedRules}
                                  editedParameters={editedParameters}
                                  onRuleChange={handleRuleChange}
                                  onParameterChange={handleParameterChange}
                                  getRule={getRule}
                                  getParameter={getParameter}
                                  getParameterValue={getParameterValue}
                                  showAdvanced={showAdvanced}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </CardContent>
                    )}
                  </Card>
                )
              })}

              {/* Other/Uncategorized Rules */}
              {categorizedRules.other.rules.length > 0 && (
                <Card className="border border-gray-200 shadow-sm">
                  <CardHeader 
                    className="border-b bg-gradient-to-r from-white via-gray-50/50 to-white cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => toggleCategory('other')}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-3">
                        <Settings className="h-5 w-5 text-gray-600" />
                        <div>
                          <div className="text-lg font-semibold text-gray-900">
                            Other Rules
                          </div>
                          <CardDescription className="text-xs mt-0.5">
                            Uncategorized rules • {categorizedRules.other.rules.length} rule{categorizedRules.other.rules.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                      </CardTitle>
                      {expandedCategories.has('other') ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </CardHeader>
                  {expandedCategories.has('other') && (
                    <CardContent className="p-6">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, categorizedRules.other.rules)}
                      >
                        <SortableContext
                          items={categorizedRules.other.rules.map(r => r.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-4">
                            {categorizedRules.other.rules.map(rule => (
                              <SortableRuleItem
                                key={rule.id}
                                rule={rule}
                                parameters={parameters}
                                editedRules={editedRules}
                                editedParameters={editedParameters}
                                onRuleChange={handleRuleChange}
                                onParameterChange={handleParameterChange}
                                getRule={getRule}
                                getParameter={getParameter}
                                getParameterValue={getParameterValue}
                                showAdvanced={showAdvanced}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          ) : (
            // Flat View
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="border-b">
                <CardTitle>All Rules</CardTitle>
                <CardDescription>
                  {flatRules.length} rule{flatRules.length !== 1 ? 's' : ''} • Drag to reorder
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, flatRules)}
                >
                  <SortableContext
                    items={flatRules.map(r => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {flatRules.map(rule => (
                        <SortableRuleItem
                          key={rule.id}
                          rule={rule}
                          parameters={parameters}
                          editedRules={editedRules}
                          editedParameters={editedParameters}
                          onRuleChange={handleRuleChange}
                          onParameterChange={handleParameterChange}
                          getRule={getRule}
                          getParameter={getParameter}
                          getParameterValue={getParameterValue}
                          showAdvanced={showAdvanced}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          )}

          {/* Advanced Settings Toggle */}
          <Card className="border border-gray-200 shadow-sm mt-6">
            <CardHeader 
              className="border-b bg-gradient-to-r from-white via-gray-50/50 to-white cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="text-lg font-semibold text-gray-900">
                      Advanced Settings
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      Show priority, version, and other technical fields
                    </CardDescription>
                  </div>
                </CardTitle>
                {showAdvanced ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Action Buttons */}
          <Card className="border border-gray-200 shadow-sm mt-6">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {hasChanges ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700">
                        {stats.editedRulesCount + stats.editedParamsCount} unsaved change{(stats.editedRulesCount + stats.editedParamsCount) !== 1 ? 's' : ''}
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
                    className="flex-1 sm:flex-initial min-w-[140px] h-10 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-sm hover:shadow-md"
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
        </Container>
      </div>
    </PermissionGuard>
  )
}
