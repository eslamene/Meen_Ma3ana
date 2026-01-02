'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  Plus,
  Trash2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { brandColors, theme } from '@/lib/theme'

interface AIRule {
  id: string
  rule_key: string
  instruction: string
  scope: string
  scope_reference: string | null
  priority: number
  version: number
  is_active: boolean
  lang: string | null
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

// Extract parameter names from instruction text (e.g., {{parameter_name}})
function extractParametersFromInstruction(instruction: string): string[] {
  if (!instruction) return []
  const regex = /\{\{(\w+)\}\}/g
  const matches = instruction.matchAll(regex)
  const parameters = new Set<string>()
  for (const match of matches) {
    parameters.add(match[1])
  }
  return Array.from(parameters).sort()
}

// Inline Editable Field Component
function InlineEditableField({
  value,
  onSave,
  placeholder,
  type = 'text',
  className = '',
  multiline = false,
  options,
}: {
  value: string | null
  onSave: (value: string | null) => void
  placeholder?: string
  type?: 'text' | 'select' | 'textarea'
  className?: string
  multiline?: boolean
  options?: { value: string; label: string }[]
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.select()
      }
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setEditValue(value || '')
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave(editValue.trim() || null)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value || '')
    setIsEditing(false)
  }

  if (isEditing) {
    if (type === 'textarea') {
      return (
        <Textarea
          ref={inputRef as React.LegacyRef<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              handleCancel()
            } else if (e.key === 'Enter' && e.ctrlKey) {
              handleSave()
            }
          }}
          className={cn("min-h-[80px] text-sm font-mono px-3 py-2 resize-none", className)}
          placeholder={placeholder}
        />
      )
    }
    if (type === 'select' && options) {
      return (
        <Select
          value={editValue}
          onValueChange={(val) => {
            setEditValue(val)
            onSave(val || null)
            setIsEditing(false)
          }}
          onOpenChange={(open) => {
            if (!open && !editValue) {
              handleCancel()
            }
          }}
        >
          <SelectTrigger className={cn("h-9 text-sm px-3", className)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    return (
      <Input
        ref={inputRef as React.LegacyRef<HTMLInputElement>}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleCancel()
          } else if (e.key === 'Enter') {
            handleSave()
          }
        }}
        className={cn("h-9 text-sm px-3", className)}
        placeholder={placeholder}
      />
    )
  }

  const displayValue = value || placeholder || 'Click to edit...'
  const isEmpty = !value

  return (
    <div
      onClick={handleStartEdit}
      className={cn(
        "min-h-[36px] px-3 py-2 bg-gray-50 border border-gray-200 rounded cursor-text hover:bg-gray-100 transition-colors text-sm",
        isEmpty && "text-gray-400 italic",
        type === 'textarea' ? "whitespace-pre-wrap" : "flex items-center",
        className
      )}
    >
      {displayValue}
    </div>
  )
}

// Edit Rule Dialog Component
function EditRuleDialog({
  rule,
  open,
  onOpenChange,
  parameters,
  editedRules,
  editedParameters,
  onRuleChange,
  onParameterChange,
  getRule,
  getParameter,
  getParameterValue,
}: {
  rule: AIRule
  open: boolean
  onOpenChange: (open: boolean) => void
  parameters: AIRuleParameter[]
  editedRules: Map<string, AIRule>
  editedParameters: Map<string, AIRuleParameter>
  onRuleChange: (rule: AIRule, field: keyof AIRule, value: any) => void
  onParameterChange: (param: AIRuleParameter, value: string) => void
  getRule: (ruleKey: string) => AIRule | undefined
  getParameter: (ruleKey: string, parameterKey: string) => AIRuleParameter | undefined
  getParameterValue: (ruleKey: string, parameterKey: string) => string
}) {
  const isEdited = editedRules.has(rule.rule_key)
  const editedRule = getRule(rule.rule_key)!
  const currentRuleKey = editedRule.rule_key || rule.rule_key
  // Get all parameters for this rule from the database (ai_rule_parameters table)
  // Check current rule_key, edited rule_key, and original rule_key to handle rule_key changes
  const ruleParams = parameters.filter(p => {
    return p.rule_key === currentRuleKey || 
           p.rule_key === rule.rule_key ||
           (editedRule.rule_key && p.rule_key === editedRule.rule_key)
  })
  const instructionParams = extractParametersFromInstruction(editedRule.instruction)
  // Filter parameters to only show those referenced in instruction
  // These come from ai_rule_parameters table via the parameters prop
  const activeParams = ruleParams.filter(param => 
    instructionParams.includes(param.parameter_key)
  )
  const existingParamKeys = new Set(ruleParams.map(p => p.parameter_key))
  const newParams = instructionParams
    .filter(key => !existingParamKeys.has(key))
    .map(parameter_key => ({
      id: `new-${currentRuleKey}-${parameter_key}`,
      rule_key: currentRuleKey,
      parameter_key,
      parameter_value: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
  const allActiveParams = [...activeParams, ...newParams]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Rule: {rule.rule_key}</DialogTitle>
          <DialogDescription>
            Update rule configuration and parameters
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Main Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Rule Key *</Label>
              <Input
                value={editedRule.rule_key}
                onChange={(e) => onRuleChange(editedRule, 'rule_key', e.target.value)}
                className={cn("font-mono", isEdited && "border-amber-300")}
                placeholder="title.use_only_hint"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Scope</Label>
              <Select
                value={editedRule.scope}
                onValueChange={(value) => onRuleChange(editedRule, 'scope', value)}
              >
                <SelectTrigger className={cn(isEdited && "border-amber-300")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global</SelectItem>
                  <SelectItem value="module">Module</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Language</Label>
              <Input
                value={editedRule.lang || ''}
                onChange={(e) => onRuleChange(editedRule, 'lang', e.target.value || null)}
                className={cn("font-mono", isEdited && "border-amber-300")}
                placeholder="EN,AR"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Type</Label>
              <Select
                value={editedRule.metadata?.type || 'guideline'}
                onValueChange={(value) => {
                  const updatedMetadata = { ...(editedRule.metadata || {}), type: value }
                  onRuleChange(editedRule, 'metadata', updatedMetadata)
                }}
              >
                <SelectTrigger className={cn(isEdited && "border-amber-300")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guideline">Guideline</SelectItem>
                  <SelectItem value="constraint">Constraint</SelectItem>
                  <SelectItem value="restriction">Restriction</SelectItem>
                  <SelectItem value="style">Style</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Category</Label>
              <Select
                value={editedRule.metadata?.category || 'other'}
                onValueChange={(value) => {
                  const updatedMetadata = { ...(editedRule.metadata || {}), category: value }
                  onRuleChange(editedRule, 'metadata', updatedMetadata)
                }}
              >
                <SelectTrigger className={cn(isEdited && "border-amber-300")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="description">Description</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editedRule.scope !== 'global' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Scope Reference</Label>
                <Input
                  value={editedRule.scope_reference || ''}
                  onChange={(e) => onRuleChange(editedRule, 'scope_reference', e.target.value || null)}
                  className={cn(isEdited && "border-amber-300")}
                  placeholder="Required reference"
                />
              </div>
            )}
          </div>

          {/* Instruction */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Instruction *</Label>
            <Textarea
              value={editedRule.instruction}
              onChange={(e) => onRuleChange(editedRule, 'instruction', e.target.value)}
              className={cn("min-h-[100px] font-mono", isEdited && "border-amber-300")}
              placeholder="AI instruction text..."
            />
          </div>

          {/* Parameters */}
          {allActiveParams.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">
                  Parameters
                  {newParams.length > 0 && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {newParams.length} new
                    </Badge>
                  )}
                </Label>
                <p className="text-xs text-gray-500">
                  Detected: {instructionParams.map(p => `{{${p}}}`).join(', ')}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allActiveParams.map((param) => {
                  const isNewParam = param.id.startsWith('new-')
                  const paramKey = `${param.rule_key}.${param.parameter_key}`
                  const isParamEdited = editedParameters.has(paramKey)
                  
                  // Get parameter value: prioritize edited, then use param's value (from DB), then fallback
                  let paramValue = ''
                  if (isParamEdited) {
                    // Use edited value if exists
                    paramValue = editedParameters.get(paramKey)?.parameter_value || ''
                  } else if (!isNewParam) {
                    // For existing params from DB, use the value directly from the param object (from ai_rule_parameters table)
                    // param.parameter_value should always be present for existing params
                    paramValue = param.parameter_value || ''
                    // If still empty, try to get from the parameters array directly
                    // Check all possible rule_key variations: current, edited, and original
                    if (!paramValue) {
                      const dbParam = parameters.find(p => 
                        (p.rule_key === param.rule_key || 
                         p.rule_key === currentRuleKey || 
                         p.rule_key === rule.rule_key ||
                         (editedRule.rule_key && p.rule_key === editedRule.rule_key)) &&
                        p.parameter_key === param.parameter_key
                      )
                      paramValue = dbParam?.parameter_value || ''
                    }
                  } else {
                    // For new params, check if there's an edited value, otherwise empty
                    paramValue = editedParameters.get(paramKey)?.parameter_value || ''
                  }
                  
                  // Final fallback: if still empty and not new, try getParameterValue with all rule_key variations
                  if (!paramValue && !isNewParam) {
                    // Try with current rule_key first
                    paramValue = getParameterValue(currentRuleKey, param.parameter_key)
                    // If still empty, try with original rule_key
                    if (!paramValue && rule.rule_key !== currentRuleKey) {
                      paramValue = getParameterValue(rule.rule_key, param.parameter_key)
                    }
                    // If still empty and edited rule_key exists, try that
                    if (!paramValue && editedRule.rule_key && editedRule.rule_key !== currentRuleKey && editedRule.rule_key !== rule.rule_key) {
                      paramValue = getParameterValue(editedRule.rule_key, param.parameter_key)
                    }
                  }
                  
                  const editedParam = isNewParam 
                    ? param 
                    : (getParameter(param.rule_key, param.parameter_key) || param)
                  const options = PARAMETER_OPTIONS[param.rule_key]

                  return (
                    <div key={param.id || `${param.rule_key}-${param.parameter_key}`} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-gray-600">
                          {param.parameter_key}
                        </Label>
                        {isNewParam && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                            New
                          </Badge>
                        )}
                        {isParamEdited && (
                          <Badge variant="default" className="bg-amber-500 text-xs px-1.5 py-0.5">
                            Edited
                          </Badge>
                        )}
                      </div>
                      {options ? (
                        <Select
                          value={paramValue}
                          onValueChange={(value) => {
                            if (isNewParam) {
                              const newParam: AIRuleParameter = {
                                ...param,
                                parameter_value: value,
                              }
                              onParameterChange(newParam, value)
                            } else {
                              onParameterChange(editedParam, value)
                            }
                          }}
                        >
                          <SelectTrigger className={cn((isParamEdited || isNewParam) && "border-amber-300")}>
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
                          onChange={(e) => {
                            if (isNewParam) {
                              const newParam: AIRuleParameter = {
                                ...param,
                                parameter_value: e.target.value,
                              }
                              onParameterChange(newParam, e.target.value)
                            } else {
                              onParameterChange(editedParam, e.target.value)
                            }
                          }}
                          className={cn((isParamEdited || isNewParam) && "border-amber-300")}
                          placeholder="Enter value..."
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-sm font-medium text-gray-700">Advanced Settings</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Priority</Label>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={editedRule.priority}
                    onChange={(e) => onRuleChange(editedRule, 'priority', parseInt(e.target.value) || 100)}
                    className={cn(isEdited && "border-amber-300")}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Version</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editedRule.version}
                    onChange={(e) => onRuleChange(editedRule, 'version', parseInt(e.target.value) || 1)}
                    className={cn(isEdited && "border-amber-300")}
                  />
                </div>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <Label className="text-sm font-medium text-gray-700">Metadata (JSON)</Label>
                <Textarea
                  value={editedRule.metadata ? JSON.stringify(editedRule.metadata, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const value = e.target.value.trim()
                      if (value === '') {
                        onRuleChange(editedRule, 'metadata', null)
                      } else {
                        const parsed = JSON.parse(value)
                        onRuleChange(editedRule, 'metadata', parsed)
                      }
                    } catch (error) {
                      // Invalid JSON - don't update, but allow typing
                    }
                  }}
                  className={cn("min-h-[120px] text-sm font-mono resize-y", isEdited && "border-amber-300")}
                  placeholder='{"type":"restriction","category":"title"}'
                />
              </div>
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Sortable Rule Item Component
function SortableRuleItem({
  rule,
  parameters,
  editedRules,
  editedParameters,
  onRuleChange,
  onParameterChange,
  onDelete,
  onEdit,
  getRule,
  getParameter,
  getParameterValue,
  editingRuleId,
  setEditingRuleId,
}: {
  rule: AIRule
  parameters: AIRuleParameter[]
  editedRules: Map<string, AIRule>
  editedParameters: Map<string, AIRuleParameter>
  onRuleChange: (rule: AIRule, field: keyof AIRule, value: any) => void
  onParameterChange: (param: AIRuleParameter, value: string) => void
  onDelete: (ruleId: string, ruleKey: string) => void
  onEdit: (rule: AIRule) => void
  getRule: (ruleKey: string) => AIRule | undefined
  getParameter: (ruleKey: string, parameterKey: string) => AIRuleParameter | undefined
  getParameterValue: (ruleKey: string, parameterKey: string) => string
  editingRuleId: string | null
  setEditingRuleId: (id: string | null) => void
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
  // Use the edited rule_key (which might have been changed) to get parameters
  const currentRuleKey = editedRule.rule_key || rule.rule_key
  // Get all parameters for this rule from the database (ai_rule_parameters table)
  // Check both original and edited rule_key in case rule_key was changed
  const ruleParams = parameters.filter(p => 
    p.rule_key === currentRuleKey || p.rule_key === rule.rule_key
  )
  const ruleType = rule.metadata?.type || 'guideline'
  const ruleLanguage = editedRule.lang

  // Extract parameters from instruction dynamically
  const instructionParams = extractParametersFromInstruction(editedRule.instruction)
  
  // Filter parameters to only show those referenced in instruction
  // These come from ai_rule_parameters table via the parameters prop
  const activeParams = ruleParams.filter(param => 
    instructionParams.includes(param.parameter_key)
  )

  // Create parameter entries for any new parameters found in instruction
  // Check if parameter exists in database for the current rule_key
  const existingParamKeys = new Set(ruleParams.map(p => p.parameter_key))
  const newParams = instructionParams
    .filter(key => !existingParamKeys.has(key))
    .map(parameter_key => ({
      id: `new-${currentRuleKey}-${parameter_key}`,
      rule_key: currentRuleKey,
      parameter_key,
      parameter_value: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

  // Combine existing and new parameters
  const allActiveParams = [...activeParams, ...newParams]

  const getRuleLabel = (ruleKey: string): string => {
    const parts = ruleKey.split('.')
    const lastPart = parts[parts.length - 1]
    return lastPart.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div ref={setNodeRef} style={style} className={cn("relative", isDragging && "z-50")}>
      <Card className={cn("border transition-all", isEdited && "border-amber-300 shadow-md", isDragging && "shadow-lg")}>
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Drag Handle */}
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-sm font-semibold">
                    {getRuleLabel(rule.rule_key)}
                  </CardTitle>
                  {isEdited && (
                    <Badge variant="default" className="bg-amber-500 text-xs px-1.5 py-0.5">
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
                      {ruleLanguage.split(',').map(l => l.trim().toUpperCase()).join(',')}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs text-gray-500 mt-1 break-all">
                  {rule.rule_key} • Priority: {rule.priority} • Version: {rule.version}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(rule)}
                className="h-7 px-2 text-sm"
                title="Edit rule"
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Switch
                checked={editedRule.is_active}
                onCheckedChange={(checked) => onRuleChange(editedRule, 'is_active', checked)}
                className="scale-75"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(rule.id, rule.rule_key)}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Delete rule"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Compact Read-Only View */}
          <div className="space-y-3">
            {/* Instruction Preview */}
            <div>
              <Label className="text-xs font-medium text-gray-500 mb-1 block">Instruction</Label>
              <p className="text-sm text-gray-700 line-clamp-2">
                {editedRule.instruction || <span className="text-gray-400 italic">No instruction</span>}
              </p>
            </div>

            {/* Parameters Summary */}
            {allActiveParams.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-gray-500 mb-1 block">
                  Parameters ({allActiveParams.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {allActiveParams.map((param) => {
                    const paramKey = `${param.rule_key}.${param.parameter_key}`
                    const isParamEdited = editedParameters.has(paramKey)
                    let paramValue = ''
                    if (isParamEdited) {
                      paramValue = editedParameters.get(paramKey)?.parameter_value || ''
                    } else if (!param.id.startsWith('new-')) {
                      paramValue = param.parameter_value || ''
                    }
                    if (!paramValue && !param.id.startsWith('new-')) {
                      paramValue = getParameterValue(param.rule_key, param.parameter_key)
                    }
                    
                    return (
                      <div key={param.id || `${param.rule_key}-${param.parameter_key}`} className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {param.parameter_key}: {paramValue || <span className="text-gray-400">empty</span>}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quick Info */}
            <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
              <span>Scope: {editedRule.scope}</span>
              {editedRule.lang && <span>Lang: {editedRule.lang}</span>}
              <span>Priority: {editedRule.priority}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Rule Dialog */}
      <EditRuleDialog
        rule={rule}
        open={editingRuleId === rule.id}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRuleId(null)
          }
        }}
        parameters={parameters}
        editedRules={editedRules}
        editedParameters={editedParameters}
        onRuleChange={onRuleChange}
        onParameterChange={onParameterChange}
        getRule={getRule}
        getParameter={getParameter}
        getParameterValue={getParameterValue}
      />
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['title', 'description', 'content']))
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'category' | 'flat'>('category')
  
  // Edit rule dialog state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  
  // Create rule dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newRule, setNewRule] = useState({
    rule_key: '',
    instruction: '',
    scope: 'global',
    scope_reference: '',
    priority: 100,
    version: 1,
    is_active: true,
    category: 'title',
    type: 'guideline',
    lang: '',
    metadata: null as any,
  })

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
      // Parameters come from ai_rule_parameters table via the API
      const fetchedParameters = data.parameters || []
      
      setRules(fetchedRules)
      // Store parameters from ai_rule_parameters table
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
    // First check if there's an edited version
    const edited = editedParameters.get(key)
    if (edited) return edited
    // Otherwise, get from database (ai_rule_parameters table via parameters array)
    return parameters.find(p => p.rule_key === ruleKey && p.parameter_key === parameterKey)
  }

  const getParameterValue = (ruleKey: string, parameterKey: string): string => {
    // Get parameter from database (ai_rule_parameters table) or edited version
    const param = getParameter(ruleKey, parameterKey)
    // Return parameter_value from ai_rule_parameters table
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
      // Clear edited state before refresh to ensure fresh data is displayed
      setEditedRules(new Map())
      setEditedParameters(new Map())
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

  const handleCreateRule = async () => {
    if (!newRule.rule_key || !newRule.instruction) {
      toast.error('Error', { description: 'Rule key and instruction are required' })
      return
    }

    try {
      setCreating(true)

      // Build metadata: merge category/type with provided metadata
      const metadata: any = { ...(newRule.metadata || {}) }
      if (newRule.category) metadata.category = newRule.category
      if (newRule.type) metadata.type = newRule.type
      // Use merged metadata or null if empty
      const finalMetadata = Object.keys(metadata).length > 0 ? metadata : null

      const response = await fetch('/api/admin/settings/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rule_key: newRule.rule_key,
          instruction: newRule.instruction,
          scope: newRule.scope,
          scope_reference: newRule.scope_reference || null,
          priority: newRule.priority,
          version: newRule.version,
          is_active: newRule.is_active,
          lang: newRule.lang || null,
          metadata: finalMetadata,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create rule')
      }

      toast.success('Success', { description: 'Rule created successfully' })
      setShowCreateDialog(false)
      setNewRule({
        rule_key: '',
        instruction: '',
        scope: 'global',
        scope_reference: '',
        priority: 100,
        version: 1,
        is_active: true,
        category: 'title',
        type: 'guideline',
        lang: '',
        metadata: null,
      })
      await fetchSettings()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create rule'
      toast.error('Error', { description: errorMessage })
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteRule = async (ruleId: string, ruleKey: string) => {
    if (!confirm(`Are you sure you want to delete the rule "${ruleKey}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/settings/ai?id=${ruleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete rule')
      }

      toast.success('Success', { description: 'Rule deleted successfully' })
      await fetchSettings()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete rule'
      toast.error('Error', { description: errorMessage })
    }
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
      <div className="min-h-screen" style={{ background: `linear-gradient(to bottom right, #f9fafb, ${brandColors.meen[50]})` }}>
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

          {/* Unified View Controls Panel */}
          <Card className="mb-6 border-2 shadow-lg" style={{ borderColor: brandColors.meen[200], background: `linear-gradient(to bottom right, white, ${brandColors.meen[50]})` }}>
            <CardHeader className="border-b pb-3" style={{ background: `linear-gradient(to right, ${brandColors.meen[50]}, ${brandColors.meen[100]})`, borderColor: brandColors.meen[200] }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" style={{ color: brandColors.meen[600] }} />
                  <CardTitle className="text-lg font-bold text-gray-900">View Controls</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-8 text-xs text-gray-600 hover:text-gray-900"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-2 text-xs text-gray-600">
                  Showing <span className="font-semibold" style={{ color: brandColors.meen[600] }}>{stats.filteredCount}</span> of <span className="font-semibold">{stats.totalRules}</span> rules
                </div>
              )}
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search rules by key, instruction, category, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 text-sm border-gray-300"
                    style={{ '--ring-color': brandColors.meen[500] } as React.CSSProperties}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <Filter className="h-4 w-4" style={{ color: brandColors.meen[600] }} />
                      Category
                    </Label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="h-10 text-sm border-gray-300" style={{ '--ring-color': brandColors.meen[500] } as React.CSSProperties}>
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

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Type</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-10 text-sm border-gray-300" style={{ '--ring-color': brandColors.meen[500] } as React.CSSProperties}>
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

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Status</Label>
                    <Select value={filterActive} onValueChange={setFilterActive}>
                      <SelectTrigger className="h-10 text-sm border-gray-300" style={{ '--ring-color': brandColors.meen[500] } as React.CSSProperties}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">View Mode</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={viewMode === 'category' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('category')}
                        className={cn("flex-1 h-10 text-sm font-medium")}
                        style={viewMode === 'category' ? { background: theme.gradients.primary, color: 'white' } : undefined}
                      >
                        <Grid3x3 className="h-4 w-4 mr-1.5" />
                        Category
                      </Button>
                      <Button
                        variant={viewMode === 'flat' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('flat')}
                        className={cn("flex-1 h-10 text-sm font-medium")}
                        style={viewMode === 'flat' ? { background: theme.gradients.primary, color: 'white' } : undefined}
                      >
                        <List className="h-4 w-4 mr-1.5" />
                        Flat
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Banner */}
          <Card className="mb-6 border-indigo-200 bg-indigo-50/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
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
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  variant="outline"
                  className="border-gray-300 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rules Display */}
          {viewMode === 'category' ? (
            // Category View
            <div className="space-y-3">
              {Object.entries(CATEGORIES).map(([categoryKey, category]) => {
                const categoryData = categorizedRules[categoryKey]
                const isExpanded = expandedCategories.has(categoryKey)
                const hasRules = categoryData.rules.length > 0

                if (!hasRules) return null

                return (
                  <Card key={categoryKey} className="border border-gray-200 shadow-sm">
                    <CardHeader 
                      className="border-b cursor-pointer hover:bg-gray-50/50 transition-colors py-2 px-4"
                      style={{ background: `linear-gradient(to right, white, ${brandColors.meen[50]})`, borderColor: brandColors.meen[200] }}
                      onClick={() => toggleCategory(categoryKey)}
                    >
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <span className="text-lg">{category.icon}</span>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {category.label}
                            </div>
                            <CardDescription className="text-[10px] mt-0">
                              {category.description} • {categoryData.rules.length} rule{categoryData.rules.length !== 1 ? 's' : ''}
                            </CardDescription>
                          </div>
                        </CardTitle>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="p-3">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleDragEnd(e, categoryData.rules)}
                        >
                          <SortableContext
                            items={categoryData.rules.map(r => r.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {categoryData.rules.map(rule => (
                                <SortableRuleItem
                                  key={rule.id}
                                  rule={rule}
                                  parameters={parameters}
                                  editedRules={editedRules}
                                  editedParameters={editedParameters}
                                  onRuleChange={handleRuleChange}
                                  onParameterChange={handleParameterChange}
                                  onDelete={handleDeleteRule}
                                  onEdit={(rule) => setEditingRuleId(rule.id)}
        getRule={getRule}
        getParameter={getParameter}
        getParameterValue={getParameterValue}
        editingRuleId={editingRuleId}
        setEditingRuleId={setEditingRuleId}
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
                    className="border-b cursor-pointer hover:bg-gray-50/50 transition-colors py-2 px-4"
                    style={{ background: `linear-gradient(to right, white, ${brandColors.meen[50]})`, borderColor: brandColors.meen[200] }}
                    onClick={() => toggleCategory('other')}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-gray-600" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            Other Rules
                          </div>
                          <CardDescription className="text-[10px] mt-0">
                            Uncategorized rules • {categorizedRules.other.rules.length} rule{categorizedRules.other.rules.length !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                      </CardTitle>
                      {expandedCategories.has('other') ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </CardHeader>
                  {expandedCategories.has('other') && (
                    <CardContent className="p-3">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, categorizedRules.other.rules)}
                      >
                        <SortableContext
                          items={categorizedRules.other.rules.map(r => r.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {categorizedRules.other.rules.map(rule => (
                              <SortableRuleItem
                                key={rule.id}
                                rule={rule}
                                parameters={parameters}
                                editedRules={editedRules}
                                editedParameters={editedParameters}
                                onRuleChange={handleRuleChange}
                                onParameterChange={handleParameterChange}
                                onDelete={handleDeleteRule}
                                onEdit={(rule) => setEditingRuleId(rule.id)}
        getRule={getRule}
        getParameter={getParameter}
        getParameterValue={getParameterValue}
        editingRuleId={editingRuleId}
        setEditingRuleId={setEditingRuleId}
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
              <CardContent className="p-3">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, flatRules)}
                >
                  <SortableContext
                    items={flatRules.map(r => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {flatRules.map(rule => (
                        <SortableRuleItem
                          key={rule.id}
                          rule={rule}
                          parameters={parameters}
                          editedRules={editedRules}
                          editedParameters={editedParameters}
                          onRuleChange={handleRuleChange}
                          onParameterChange={handleParameterChange}
                          onDelete={handleDeleteRule}
                          onEdit={(rule) => setEditingRuleId(rule.id)}
        getRule={getRule}
        getParameter={getParameter}
        getParameterValue={getParameterValue}
        editingRuleId={editingRuleId}
        setEditingRuleId={setEditingRuleId}
      />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>
          )}


          {/* Spacer to prevent content from being hidden behind fixed footer */}
          <div className="h-24" />

          {/* Create Rule Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New AI Rule</DialogTitle>
                <DialogDescription>
                  Add a new rule to control AI behavior. Rules are combined at runtime into system prompts.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="rule_key">Rule Key *</Label>
                  <Input
                    id="rule_key"
                    value={newRule.rule_key}
                    onChange={(e) => setNewRule({ ...newRule, rule_key: e.target.value })}
                    placeholder="e.g., title.use_only_hint"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Unique identifier for this rule (e.g., title.use_only_hint, description.structure)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instruction">Instruction *</Label>
                  <Textarea
                    id="instruction"
                    value={newRule.instruction}
                    onChange={(e) => setNewRule({ ...newRule, instruction: e.target.value })}
                    placeholder="AI instruction text..."
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Use {'{{parameter_name}}'} for parameter substitution.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newRule.category}
                      onValueChange={(value) => setNewRule({ ...newRule, category: value })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="description">Description</SelectItem>
                        <SelectItem value="content">Content</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={newRule.type}
                      onValueChange={(value) => setNewRule({ ...newRule, type: value })}
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guideline">Guideline</SelectItem>
                        <SelectItem value="constraint">Constraint</SelectItem>
                        <SelectItem value="restriction">Restriction</SelectItem>
                        <SelectItem value="style">Style</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scope">Scope</Label>
                    <Select
                      value={newRule.scope}
                      onValueChange={(value) => setNewRule({ ...newRule, scope: value })}
                    >
                      <SelectTrigger id="scope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="module">Module</SelectItem>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="tenant">Tenant</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="role">Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lang">Language (optional)</Label>
                    <Input
                      id="lang"
                      value={newRule.lang}
                      onChange={(e) => setNewRule({ ...newRule, lang: e.target.value })}
                      placeholder="e.g., EN,AR (comma-separated)"
                      className="text-sm font-mono"
                    />
                    <p className="text-xs text-gray-500">
                      Comma-separated language codes (e.g., EN,AR). Leave empty for all languages.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="1000"
                      value={newRule.priority}
                      onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 100 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      type="number"
                      min="1"
                      value={newRule.version}
                      onChange={(e) => setNewRule({ ...newRule, version: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={newRule.is_active}
                    onCheckedChange={(checked) => setNewRule({ ...newRule, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                {/* Metadata Editor */}
                <div className="space-y-2 pt-3 border-t">
                  <Label htmlFor="metadata">Metadata (JSON - optional)</Label>
                  <Textarea
                    id="metadata"
                    value={newRule.metadata ? JSON.stringify(newRule.metadata, null, 2) : ''}
                    onChange={(e) => {
                      try {
                        const value = e.target.value.trim()
                        if (value === '') {
                          setNewRule({ ...newRule, metadata: null })
                        } else {
                          const parsed = JSON.parse(value)
                          setNewRule({ ...newRule, metadata: parsed })
                        }
                      } catch (error) {
                        // Invalid JSON - don't update, but allow typing
                      }
                    }}
                    className="min-h-[100px] text-xs font-mono"
                    placeholder='{"category": "title", "type": "guideline", ...}'
                  />
                  <p className="text-xs text-gray-500">
                    Enter valid JSON object. Category and type are automatically added if specified above.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRule}
                  disabled={creating || !newRule.rule_key || !newRule.instruction}
                  className="text-white"
                  style={{ background: theme.gradients.primary }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.meen[700]} 100%)`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = theme.gradients.primary
                  }}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Rule
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Container>

        {/* Fixed Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-lg" style={{ borderColor: brandColors.meen[200] }}>
          <Container variant={containerVariant} className="py-4">
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
                  className="flex-1 sm:flex-initial min-w-[140px] h-10 shadow-sm hover:shadow-md text-white"
                  style={{ background: theme.gradients.primary }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.meen[700]} 100%)`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = theme.gradients.primary
                  }}
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
          </Container>
        </div>
      </div>
    </PermissionGuard>
  )
}
