'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Save, RefreshCw, Loader2, Bell, Settings, Plus, Trash2, Edit, X, type LucideIcon } from 'lucide-react'
import { defaultLogger as logger } from '@/lib/logger'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import StandardModal, { StandardFormField, StandardStatusToggle } from '@/components/ui/standard-modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NotificationRule, FieldCondition } from '@/lib/notifications/notification-rules'

interface RuleOptions {
  statuses: string[]
  priorities: string[]
  types: string[]
  categories: Array<{ id: string; name: string }>
  roles: string[]
  fieldTypes: Array<{ value: string; label: string }>
  operators: Array<{ value: string; label: string }>
  events: Array<{ value: string; label: string }>
}

export default function NotificationRulesPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin')
  const { containerVariant } = useLayout()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [options, setOptions] = useState<RuleOptions | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true)
      const [rulesResponse, optionsResponse] = await Promise.all([
        fetch('/api/admin/notification-rules'),
        fetch('/api/admin/notification-rules/options'),
      ])

      if (!rulesResponse.ok) {
        const errorText = await rulesResponse.text()
        throw new Error(`Failed to fetch notification rules: ${rulesResponse.status} ${errorText}`)
      }

      if (!optionsResponse.ok) {
        const errorText = await optionsResponse.text()
        throw new Error(`Failed to fetch notification rule options: ${optionsResponse.status} ${errorText}`)
      }

      const rulesData = await rulesResponse.json()
      const optionsData = await optionsResponse.json()

      // Convert old format to new format if needed
      const rulesArray = Array.isArray(rulesData.rules)
        ? rulesData.rules
        : Object.values(rulesData.rules || {}).map((rule: any) => ({
            id: rule.id || rule.action || `rule_${Date.now()}`,
            name: rule.name || rule.action || 'Untitled Rule',
            description: rule.description,
            enabled: rule.enabled !== false,
            trigger: {
              event: rule.trigger?.event || (rule.action === 'case_created' ? 'case_created' : 'field_changed'),
              field: rule.trigger?.field || (rule.action === 'case_status_changed' ? 'status' : undefined),
              conditions: rule.trigger?.conditions || rule.conditions || [],
            },
            targets: {
              notifyAllUsers: rule.targets?.notifyAllUsers || rule.notifyAllUsers || false,
              notifyCreator: rule.targets?.notifyCreator || rule.notifyCreator || false,
              notifyContributors: rule.targets?.notifyContributors || rule.notifyContributors || false,
              notifyChangeInitiator: rule.targets?.notifyChangeInitiator || rule.notifyChangeInitiator || false,
            },
          }))

      setRules(rulesArray)
      setOptions(optionsData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error('Error fetching notification rules', error instanceof Error ? error : new Error(errorMessage), {
        message: errorMessage,
        stack: errorStack,
      })
      toast.error('Error', { description: `Failed to load notification rules: ${errorMessage}` })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleCreateRule = () => {
    setEditingRule({
      id: `rule_${Date.now()}`,
      name: '',
      description: '',
      enabled: true,
      trigger: {
        event: 'field_changed',
        field: 'status',
        conditions: [],
      },
      targets: {
        notifyAllUsers: false,
        notifyCreator: false,
        notifyContributors: false,
        notifyChangeInitiator: false,
      },
    })
    setIsCreateModalOpen(true)
  }

  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule({ ...rule })
    setIsEditModalOpen(true)
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this notification rule?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/notification-rules/${ruleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete rule')
      }

      toast.success('Success', { description: 'Notification rule deleted' })
      await fetchRules()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Error deleting notification rule', error instanceof Error ? error : new Error(errorMessage), {
        ruleId,
        message: errorMessage,
      })
      toast.error('Error', { description: `Failed to delete notification rule: ${errorMessage}` })
    }
  }

  const handleSaveRule = async () => {
    if (!editingRule) return

    if (!editingRule.name.trim()) {
      toast.error('Error', { description: 'Rule name is required' })
      return
    }

    try {
      setSaving(true)
      const currentRules = [...rules]
      const existingIndex = currentRules.findIndex(r => r.id === editingRule.id)

      if (existingIndex >= 0) {
        currentRules[existingIndex] = editingRule
      } else {
        currentRules.push(editingRule)
      }

      const response = await fetch('/api/admin/notification-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: currentRules }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save notification rule')
      }

      toast.success('Success', { description: 'Notification rule saved successfully' })
      setIsEditModalOpen(false)
      setIsCreateModalOpen(false)
      setEditingRule(null)
      await fetchRules()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Error saving notification rule', error instanceof Error ? error : new Error(errorMessage), {
        ruleId: editingRule?.id,
        message: errorMessage,
      })
      toast.error('Error', { description: `Failed to save notification rule: ${errorMessage}` })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleRule = async (rule: NotificationRule) => {
    const updatedRule = { ...rule, enabled: !rule.enabled }
    const currentRules = rules.map(r => (r.id === rule.id ? updatedRule : r))

    try {
      const response = await fetch('/api/admin/notification-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: currentRules }),
      })

      if (!response.ok) {
        throw new Error('Failed to update rule')
      }

      setRules(currentRules)
      toast.success('Success', { description: `Rule ${updatedRule.enabled ? 'enabled' : 'disabled'}` })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Error toggling rule', error instanceof Error ? error : new Error(errorMessage), {
        ruleId: rule.id,
        message: errorMessage,
      })
      toast.error('Error', { description: `Failed to update rule: ${errorMessage}` })
    }
  }

  if (loading || !options) {
    return (
      <Container variant={containerVariant} className="py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </Container>
    )
  }

  return (
    <PermissionGuard permission="admin:settings">
      <Container variant={containerVariant} className="py-8">
        <DetailPageHeader
          backUrl={`/${locale}/admin/settings`}
          icon={Bell || Settings}
          title="Notification Rules"
          description="Create and manage custom push notification rules based on case field changes"
        />

        <div className="space-y-6 mt-6">
          {/* Create Rule Button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Notification Rules</h2>
              <p className="text-sm text-gray-500">
                Create rules to trigger push notifications when specific case fields change
              </p>
            </div>
            <Button onClick={handleCreateRule}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>

          {/* Rules List */}
          {rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notification rules</h3>
                <p className="text-gray-500 mb-4">Create your first notification rule to get started</p>
                <Button onClick={handleCreateRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <Card key={rule.id} className="border-l-4 border-l-indigo-500">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{rule.name}</CardTitle>
                          <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        {rule.description && (
                          <CardDescription>{rule.description}</CardDescription>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
                          <span>
                            <strong>Event:</strong> {options.events.find(e => e.value === rule.trigger.event)?.label || rule.trigger.event}
                          </span>
                          {rule.trigger.field && (
                            <span>
                              <strong>Field:</strong> {options.fieldTypes.find(f => f.value === rule.trigger.field)?.label || rule.trigger.field}
                            </span>
                          )}
                          {rule.trigger.conditions && rule.trigger.conditions.length > 0 && (
                            <span>
                              <strong>Conditions:</strong> {rule.trigger.conditions.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => handleToggleRule(rule)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRule(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Rule Modal */}
        {(isCreateModalOpen || isEditModalOpen) && editingRule && (
          <RuleEditModal
            rule={editingRule}
            options={options}
            onRuleChange={setEditingRule}
            onSave={handleSaveRule}
            onCancel={() => {
              setIsCreateModalOpen(false)
              setIsEditModalOpen(false)
              setEditingRule(null)
            }}
            saving={saving}
          />
        )}
      </Container>
    </PermissionGuard>
  )
}

// Rule Edit Modal Component
function RuleEditModal({
  rule,
  options,
  onRuleChange,
  onSave,
  onCancel,
  saving,
}: {
  rule: NotificationRule
  options: RuleOptions
  onRuleChange: (rule: NotificationRule) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const addCondition = () => {
    const newCondition: FieldCondition = {
      field: 'status',
      operator: 'equals',
      value: '',
    }
    onRuleChange({
      ...rule,
      trigger: {
        ...rule.trigger,
        conditions: [...(rule.trigger.conditions || []), newCondition],
      },
    })
  }

  const removeCondition = (index: number) => {
    onRuleChange({
      ...rule,
      trigger: {
        ...rule.trigger,
        conditions: rule.trigger.conditions?.filter((_, i) => i !== index) || [],
      },
    })
  }

  const updateCondition = (index: number, updates: Partial<FieldCondition>) => {
    const conditions = [...(rule.trigger.conditions || [])]
    conditions[index] = { ...conditions[index], ...updates }
    onRuleChange({
      ...rule,
      trigger: {
        ...rule.trigger,
        conditions,
      },
    })
  }

  const getFieldOptions = (fieldType: string) => {
    switch (fieldType) {
      case 'status':
        return options.statuses
      case 'priority':
        return options.priorities
      case 'type':
        return options.types
      case 'category':
        return options.categories.map(c => c.id)
      default:
        return []
    }
  }

  return (
    <StandardModal
      open={true}
      onOpenChange={(open) => !open && onCancel()}
      title={rule.id.startsWith('rule_') ? 'Create Notification Rule' : 'Edit Notification Rule'}
      description="Configure when and who should receive push notifications"
      sections={[
        {
          title: 'Basic Information',
          children: (
            <div className="space-y-4">
              <StandardFormField label="Rule Name" required>
                <Input
                  value={rule.name}
                  onChange={(e) => onRuleChange({ ...rule, name: e.target.value })}
                  placeholder="e.g., Notify on High Priority Status Change"
                />
              </StandardFormField>
              <StandardFormField label="Description">
                <Textarea
                  value={rule.description || ''}
                  onChange={(e) => onRuleChange({ ...rule, description: e.target.value })}
                  placeholder="Describe when this rule triggers..."
                  rows={3}
                />
              </StandardFormField>
              <StandardStatusToggle
                label="Enable Rule"
                description="Enable or disable this notification rule"
                checked={rule.enabled}
                onCheckedChange={(checked) => onRuleChange({ ...rule, enabled: checked })}
                id="enabled"
              />
            </div>
          ),
        },
        {
          title: 'Trigger Configuration',
          children: (
            <div className="space-y-4">
              <StandardFormField label="Event Type">
                <Select
                  value={rule.trigger.event}
                  onValueChange={(value: any) =>
                    onRuleChange({
                      ...rule,
                      trigger: { ...rule.trigger, event: value, field: value === 'field_changed' ? 'status' : undefined },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.events.map((event) => (
                      <SelectItem key={event.value} value={event.value}>
                        {event.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </StandardFormField>

              {rule.trigger.event === 'field_changed' && (
                <StandardFormField label="Field to Monitor">
                  <Select
                    value={rule.trigger.field || 'status'}
                    onValueChange={(value: any) =>
                      onRuleChange({
                        ...rule,
                        trigger: { ...rule.trigger, field: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.fieldTypes.map((field) => (
                        <SelectItem key={field.value} value={field.value}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </StandardFormField>
              )}

              {/* Conditions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Conditions</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Condition
                  </Button>
                </div>

                {rule.trigger.conditions?.map((condition, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <StandardFormField label="Field">
                            <Select
                              value={condition.field}
                              onValueChange={(value: any) =>
                                updateCondition(index, { field: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {options.fieldTypes.map((field) => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </StandardFormField>
                          <StandardFormField label="Operator">
                            <Select
                              value={condition.operator}
                              onValueChange={(value: any) =>
                                updateCondition(index, { operator: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {options.operators.map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </StandardFormField>
                        </div>

                        {/* Value inputs based on operator */}
                        {['equals', 'not_equals'].includes(condition.operator) && (
                          <StandardFormField label="Value">
                            <Select
                              value={condition.value as string || ''}
                              onValueChange={(value) =>
                                updateCondition(index, { value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select value" />
                              </SelectTrigger>
                              <SelectContent>
                                {getFieldOptions(condition.field).map((val) => (
                                  <SelectItem key={val} value={val}>
                                    {val}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </StandardFormField>
                        )}

                        {['in', 'not_in'].includes(condition.operator) && (
                          <StandardFormField label="Values (comma-separated)">
                            <Input
                              value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value || ''}
                              onChange={(e) => {
                                const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                                updateCondition(index, { value: values })
                              }}
                              placeholder="value1, value2, value3"
                            />
                          </StandardFormField>
                        )}

                        {condition.operator === 'changed_from' && (
                          <StandardFormField label="Changed From">
                            <Select
                              value={Array.isArray(condition.fromValue) ? condition.fromValue[0] : condition.fromValue || ''}
                              onValueChange={(value) =>
                                updateCondition(index, { fromValue: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select value" />
                              </SelectTrigger>
                              <SelectContent>
                                {getFieldOptions(condition.field).map((val) => (
                                  <SelectItem key={val} value={val}>
                                    {val}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </StandardFormField>
                        )}

                        {condition.operator === 'changed_to' && (
                          <StandardFormField label="Changed To">
                            <Select
                              value={Array.isArray(condition.toValue) ? condition.toValue[0] : condition.toValue || ''}
                              onValueChange={(value) =>
                                updateCondition(index, { toValue: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select value" />
                              </SelectTrigger>
                              <SelectContent>
                                {getFieldOptions(condition.field).map((val) => (
                                  <SelectItem key={val} value={val}>
                                    {val}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </StandardFormField>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ),
        },
        {
          title: 'Notification Targets',
          children: (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notify All Users</Label>
                  <p className="text-sm text-gray-500">Send notification to all subscribed users</p>
                </div>
                <Switch
                  checked={rule.targets.notifyAllUsers || false}
                  onCheckedChange={(checked) =>
                    onRuleChange({
                      ...rule,
                      targets: { ...rule.targets, notifyAllUsers: checked },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notify Creator</Label>
                  <p className="text-sm text-gray-500">Notify the case creator</p>
                </div>
                <Switch
                  checked={rule.targets.notifyCreator || false}
                  onCheckedChange={(checked) =>
                    onRuleChange({
                      ...rule,
                      targets: { ...rule.targets, notifyCreator: checked },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notify Contributors</Label>
                  <p className="text-sm text-gray-500">Notify users who contributed to the case</p>
                </div>
                <Switch
                  checked={rule.targets.notifyContributors || false}
                  onCheckedChange={(checked) =>
                    onRuleChange({
                      ...rule,
                      targets: { ...rule.targets, notifyContributors: checked },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notify Change Initiator</Label>
                  <p className="text-sm text-gray-500">Notify the user who initiated the change</p>
                </div>
                <Switch
                  checked={rule.targets.notifyChangeInitiator || false}
                  onCheckedChange={(checked) =>
                    onRuleChange({
                      ...rule,
                      targets: { ...rule.targets, notifyChangeInitiator: checked },
                    })
                  }
                />
              </div>
            </div>
          ),
        },
      ]}
      primaryAction={{
        label: 'Save Rule',
        onClick: onSave,
        loading: saving,
      }}
      secondaryAction={{
        label: 'Cancel',
        onClick: onCancel,
      }}
    />
  )
}
