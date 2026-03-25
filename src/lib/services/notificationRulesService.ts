/**
 * Notification rules stored as `system_config` rows (`group_type = notification_rules`).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

const GROUP = 'notification_rules'

export class NotificationRulesService {
  static async listParsedRules(supabase: SupabaseClient): Promise<unknown[]> {
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .eq('group_type', GROUP)
      .order('config_key')

    if (error) {
      defaultLogger.error('Error fetching notification rules:', error)
      throw new Error(`Failed to load notification rules: ${error.message}`)
    }

    const rules: unknown[] = []
    for (const config of data || []) {
      try {
        const rule = JSON.parse(config.config_value as string) as { id?: string; action?: string }
        if (rule.id || rule.action) {
          rules.push(rule)
        }
      } catch (parseError) {
        defaultLogger.warn('Failed to parse notification rule', {
          configKey: config.config_key,
          error: parseError,
        })
      }
    }
    return rules
  }

  static async upsertRulesFromArray(
    supabase: SupabaseClient,
    rulesArray: unknown[],
    userId: string | undefined
  ): Promise<void> {
    for (const ruleData of rulesArray) {
      const rd = ruleData as { id?: string; action?: string; name?: string; description?: string }
      if (!rd.id && !rd.action) {
        continue
      }

      const ruleId = rd.id || rd.action
      const configKey = `notification_rule_${ruleId}`
      const configValue = JSON.stringify(ruleData)

      const { data: existing, error: checkError } = await supabase
        .from('system_config')
        .select('id')
        .eq('config_key', configKey)
        .eq('group_type', GROUP)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from('system_config')
          .update({
            config_value: configValue,
            updated_at: new Date().toISOString(),
            updated_by: userId,
          })
          .eq('config_key', configKey)
          .eq('group_type', GROUP)

        if (updateError) {
          throw updateError
        }
      } else {
        const { error: insertError } = await supabase.from('system_config').insert({
          config_key: configKey,
          config_value: configValue,
          group_type: GROUP,
          description: rd.description || `Notification rule: ${rd.name || ruleId}`,
          updated_by: userId,
        })

        if (insertError) {
          throw insertError
        }
      }
    }
  }

  static async deleteByRuleId(supabase: SupabaseClient, ruleId: string): Promise<void> {
    const configKey = `notification_rule_${ruleId}`
    const { error: deleteError } = await supabase
      .from('system_config')
      .delete()
      .eq('config_key', configKey)
      .eq('group_type', GROUP)

    if (deleteError) {
      throw deleteError
    }
  }

  static async getConditionOptions(supabase: SupabaseClient): Promise<{
    statuses: string[]
    priorities: string[]
    types: string[]
    categories: Array<{ id: string; name: string }>
    roles: string[]
    fieldTypes: Array<{ value: string; label: string }>
    operators: Array<{ value: string; label: string }>
    events: Array<{ value: string; label: string }>
  }> {
    const [
      { data: statusesData, error: statusesError },
      { data: prioritiesData, error: prioritiesError },
      { data: typesData, error: typesError },
      { data: categoriesData, error: categoriesError },
      { data: rolesData, error: rolesError },
    ] = await Promise.all([
      supabase.from('cases').select('status').not('status', 'is', null),
      supabase.from('cases').select('priority').not('priority', 'is', null),
      supabase.from('cases').select('type').not('type', 'is', null),
      supabase.from('case_categories').select('id, name').eq('is_active', true),
      supabase.from('users').select('role').not('role', 'is', null),
    ])

    const statuses = statusesError
      ? []
      : [...new Set((statusesData || []).map((c: { status: string }) => c.status).filter(Boolean))].sort()

    const priorities = prioritiesError
      ? []
      : [...new Set((prioritiesData || []).map((c: { priority: string }) => c.priority).filter(Boolean))].sort()

    const types = typesError
      ? []
      : [...new Set((typesData || []).map((c: { type: string }) => c.type).filter(Boolean))].sort()

    const categories = categoriesError
      ? []
      : (categoriesData || []).map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name,
        }))

    const roles = rolesError
      ? []
      : [...new Set((rolesData || []).map((u: { role: string }) => u.role).filter(Boolean))].sort()

    return {
      statuses,
      priorities,
      types,
      categories,
      roles,
      fieldTypes: [
        { value: 'status', label: 'Status' },
        { value: 'priority', label: 'Priority' },
        { value: 'type', label: 'Type' },
        { value: 'category', label: 'Category' },
        { value: 'activity', label: 'Activity' },
        { value: 'custom', label: 'Custom Field' },
      ],
      operators: [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
        { value: 'in', label: 'Is One Of' },
        { value: 'not_in', label: 'Is Not One Of' },
        { value: 'changed', label: 'Changed (Any)' },
        { value: 'changed_from', label: 'Changed From' },
        { value: 'changed_to', label: 'Changed To' },
      ],
      events: [
        { value: 'field_changed', label: 'Field Changed' },
        { value: 'case_created', label: 'Case Created' },
        { value: 'case_updated', label: 'Case Updated' },
        { value: 'activity_created', label: 'Activity Created' },
        { value: 'custom', label: 'Custom Event' },
      ],
    }
  }
}
