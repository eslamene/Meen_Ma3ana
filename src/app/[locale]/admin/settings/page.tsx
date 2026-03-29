'use client'

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react'
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
  Settings,
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  X,
  Search,
  Filter,
  ChevronDown,
  Database,
  FolderTree,
  Edit,
  FileText,
  Sparkles,
  Bell,
  Key,
  FilterX,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import StandardModal, { StandardFormField } from '@/components/ui/standard-modal'
import TranslationButton from '@/components/translation/TranslationButton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Article,
  Bell as PhosphorBell,
  CheckCircle as PhosphorCheckCircle,
  Database as PhosphorDatabase,
  EnvelopeSimple,
  GearSix,
  Key as KeyIcon,
  Phone,
  Robot,
  ShieldCheck,
  Sparkle,
} from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'
import { defaultLogger as logger } from '@/lib/logger'

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
  google: 'Google API Keys',
  anthropic: 'Anthropic API Keys',
  ai: 'AI Content Generation',
  general: 'General Settings',
  notification_rules: 'Notification rules',
  notification: 'Notifications',
  email: 'Email',
  storage: 'Storage',
}

/** Preferred order for groups in the sidebar and collapsible list */
const GROUP_SORT_ORDER: string[] = [
  'contact',
  'auth',
  'google',
  'anthropic',
  'validation',
  'pagination',
  'notification',
  'notification_rules',
  'email',
  'storage',
  'general',
]

function sortGroupEntries<T>(entries: [string, T][]): [string, T][] {
  return [...entries].sort(([a], [b]) => {
    const ia = GROUP_SORT_ORDER.indexOf(a)
    const ib = GROUP_SORT_ORDER.indexOf(b)
    const ra = ia === -1 ? 500 : ia
    const rb = ib === -1 ? 500 : ib
    if (ra !== rb) return ra - rb
    return a.localeCompare(b)
  })
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

type ConfigValueFormat = 'json' | 'markdown' | 'regex' | 'email' | 'phone' | 'url' | 'text'

/** Heuristic: long patterns with groups, char classes, alternation — typical stored validation regexes. */
function detectRegexLikeContent(raw: string): boolean {
  const t = raw.trim()
  if (t.length < 24) return false
  if (t.startsWith('{') || t.startsWith('[')) return false
  // Clear markdown prose — don’t treat as regex
  if (/^#{1,6}\s+\S/m.test(t) || /^>\s/m.test(t) || /```[\s\S]*?```/.test(t)) return false

  let score = 0
  if (/\(\?[:=!]/.test(t)) score += 3
  if (/\(\?:/.test(t)) score += 2
  if (/\[[^\]]{4,}\]/.test(t)) score += 2
  if (/\\[dDsSwWbB]/.test(t)) score += 2
  if (/\\[tnrfv]/.test(t)) score += 1
  if (/\^\(|\\A|\$\)|\\z|\(\?:\^/.test(t)) score += 1
  if (/\{[0-9,]+\}/.test(t)) score += 2
  const pipeAlts = (t.match(/\|/g) || []).length
  if (pipeAlts >= 4 && !/(^|\n)\s*\|[^|]+\|\s*-{2,}\s*\|/m.test(t)) score += 2
  const specials = (t.match(/[()[\]{}|*+?^$\\]/g) || []).length
  const ratio = specials / Math.max(t.length, 1)
  if (specials >= 12 && ratio >= 0.06) score += 3
  if (specials >= 22 && ratio >= 0.045) score += 2

  const lines = t.split(/\r?\n/)
  if (lines.length > 8 && lines.filter((l) => l.trim().length > 0).length > 6) {
    const prosey = lines.filter((l) => /\s{2,}/.test(l) || /^[A-Za-z][^.]{20,}$/.test(l.trim()))
    if (prosey.length >= 4) return false
  }

  return score >= 5 || (score >= 4 && t.length >= 48)
}

function detectMarkdownLikeContent(raw: string): boolean {
  return (
    /(^|\n)#{1,6}\s+\S/m.test(raw) ||
    /(^|\n)\s*[-*+]\s+\S/m.test(raw) ||
    /```[\s\S]*?```/.test(raw) ||
    /(^|\n)>\s/.test(raw) ||
    /\[[^\]\n]+\]\([^)\n]+\)/.test(raw) ||
    // Table: header row + separator row (avoids classifying pipe-heavy regex as Markdown)
    /(^|\n)\|[^|\n]+\|[^|\n]+\|\s*\r?\n\s*\|(?:\s*:?-{2,}:?\s*\|)+/m.test(raw) ||
    // Ordered list: number, dot, space, then a letter (avoids `{3}.` quantifiers in regex)
    /(^|\n)\d{1,3}\.\s+[A-Za-z]/m.test(raw)
  )
}

/** Single-line email (not mailto: — that’s classified as URL). */
function detectEmailLikeContent(raw: string): boolean {
  const t = raw.trim()
  if (!t || /[\r\n]/.test(t)) return false
  if (t.startsWith('{') || t.startsWith('[')) return false
  if (t.length > 254) return false
  if ((t.match(/@/g) || []).length !== 1) return false
  const [local, domain] = t.split('@')
  if (!local || !domain) return false
  if (local.length > 64 || domain.length > 253) return false
  if (!domain.includes('.')) return false
  if (/^https?:\/\//i.test(t)) return false
  return (
    /^[a-z0-9._%+-]+$/i.test(local) &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(domain)
  )
}

/** http(s)://, mailto:, tel:, www., other schemes, or bare domain/path. */
function detectUrlLikeContent(raw: string): boolean {
  const t = raw.trim()
  if (!t || /[\r\n]/.test(t)) return false
  if (t.startsWith('{') || t.startsWith('[')) return false
  try {
    if (/^(?:https?:|mailto:|tel:)/i.test(t)) {
      new URL(t)
      return true
    }
    if (/^www\./i.test(t)) {
      new URL(`https://${t}`)
      return true
    }
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) {
      new URL(t)
      return true
    }
  } catch {
    return false
  }
  if (t.includes(' ')) return false
  // Bare host.tld[/path][:port] — exclude emails
  if (t.includes('@')) return false
  return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d{1,5})?(?:\/[^\s]*)?$/i.test(t)
}

/** International-style numbers: E.164-friendly length, with visual hints to avoid small integers. */
function detectPhoneLikeContent(raw: string): boolean {
  const t = raw.trim()
  if (!t || /[\r\n]/.test(t)) return false
  if (t.startsWith('{') || t.startsWith('[')) return false
  if (/^https?:\/\//i.test(t) || /^www\./i.test(t)) return false
  if (detectEmailLikeContent(t)) return false
  const digits = t.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return false
  // Pure short numeric config
  if (/^\d{1,8}$/.test(t)) return false
  if (t.includes('@')) return false
  if (/[a-z][a-z0-9+.-]*:\/\//i.test(t)) return false
  const hasHints = /^\+/.test(t) || /[()\s.-]/.test(t)
  const longDigitOnly = /^\+?\d{11,15}$/.test(t.replace(/\s/g, ''))
  return hasHints || longDigitOnly
}

/** Pretty-print when the string is valid JSON (object or array); otherwise return unchanged. */
function tryPrettyPrintConfigJson(raw: string): string {
  const t = raw.trim()
  if (!t || !(t.startsWith('{') || t.startsWith('['))) return raw
  try {
    return JSON.stringify(JSON.parse(t), null, 2)
  } catch {
    return raw
  }
}

function prettifyConfigJsonOrNull(raw: string): string | null {
  try {
    return JSON.stringify(JSON.parse(raw.trim()), null, 2)
  } catch {
    return null
  }
}

function detectConfigValueFormat(raw: string): ConfigValueFormat {
  const t = raw.trim()
  if (!t) return 'text'
  if (t.startsWith('{') || t.startsWith('[')) return 'json'
  if (detectUrlLikeContent(raw)) return 'url'
  if (detectEmailLikeContent(raw)) return 'email'
  if (detectPhoneLikeContent(raw)) return 'phone'
  if (detectRegexLikeContent(raw)) return 'regex'
  if (detectMarkdownLikeContent(raw)) return 'markdown'
  return 'text'
}

function getJsonSyntaxErrorMessage(raw: string): string | null {
  const t = raw.trim()
  if (!t || !(t.startsWith('{') || t.startsWith('['))) return null
  try {
    JSON.parse(t)
    return null
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid JSON'
  }
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(escapeRegExp)
    .filter(Boolean)
  if (terms.length === 0 || !text) return <>{text}</>
  let parts: string[]
  try {
    const re = new RegExp(`(${terms.join('|')})`, 'gi')
    parts = text.split(re)
  } catch {
    return <>{text}</>
  }
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded bg-amber-200/90 px-0.5 text-gray-900 dark:bg-amber-900/50 dark:text-amber-50"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

type PhosphorIcon = React.ComponentType<IconProps>

const GROUP_PHOSPHOR_ICONS: Record<string, PhosphorIcon> = {
  auth: ShieldCheck,
  validation: PhosphorCheckCircle,
  pagination: Article,
  contact: Phone,
  google: KeyIcon,
  anthropic: Robot,
  ai: Sparkle,
  general: GearSix,
  notification_rules: PhosphorBell,
  notification: PhosphorBell,
  email: EnvelopeSimple,
  storage: PhosphorDatabase,
}

function SettingsGroupIcon({ group, className }: { group: string; className?: string }) {
  const Cmp = GROUP_PHOSPHOR_ICONS[group] ?? GROUP_PHOSPHOR_ICONS.general
  return (
    <Cmp
      className={cn('shrink-0 text-indigo-600', className)}
      size={22}
      weight="duotone"
      aria-hidden
    />
  )
}

function truncatePreview(value: string, max = 96): string {
  const t = value.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

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
  const [showEditedOnly, setShowEditedOnly] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const configValueTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [newConfig, setNewConfig] = useState<Partial<SystemConfig>>({
    config_key: '',
    config_value: '',
    description: '',
    description_ar: '',
    group_type: null,
  })
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/settings', {
        credentials: 'include',
        cache: 'no-store',
      })
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast.error('Error', { description: 'Unauthorized access to system settings' })
          return
        }
        throw new Error(`Failed to load system settings: ${response.statusText}`)
      }

      const data = await response.json()
      // Exclude AI settings - they have their own dedicated page
      const configs = (data.configs || []).filter(
        (c: SystemConfig) => c.group_type !== 'ai' && !c.config_key.startsWith('ai.')
      )
      setConfigs(configs)
      setEditedConfigs(new Map())
      setHasChanges(false)
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

  // Filter configs: multi-word search (all terms must match), group label, edited-only
  const filteredConfigs = useMemo(() => {
    let filtered = configs

    const terms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (terms.length > 0) {
      filtered = filtered.filter((config) => {
        const g = config.group_type || 'general'
        const groupLabel = (GROUP_DISPLAY_NAMES[g] || g).toLowerCase()
        const haystack = [
          config.config_key,
          config.config_value,
          config.description ?? '',
          config.description_ar ?? '',
          g,
          groupLabel,
        ]
          .join('\n')
          .toLowerCase()
        return terms.every((term) => haystack.includes(term))
      })
    }

    if (selectedGroup !== 'all') {
      filtered = filtered.filter((config) => (config.group_type || 'general') === selectedGroup)
    }

    if (showEditedOnly) {
      filtered = filtered.filter((config) => editedConfigs.has(config.config_key))
    }

    return filtered
  }, [configs, searchQuery, selectedGroup, showEditedOnly, editedConfigs])

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

  // Get all group types (sorted for navigation)
  const groupTypes = useMemo(() => {
    const groups = Array.from(new Set(configs.map((c) => c.group_type || 'general')))
    return sortGroupEntries(groups.map((g) => [g, null] as [string, null])).map(([g]) => g)
  }, [configs])

  const filterActive =
    searchQuery.trim().length > 0 || selectedGroup !== 'all' || showEditedOnly

  const editValueFormat = useMemo(
    () => detectConfigValueFormat(editingConfig?.config_value ?? ''),
    [editingConfig?.config_value]
  )
  const editValueJsonError = useMemo(
    () => getJsonSyntaxErrorMessage(editingConfig?.config_value ?? ''),
    [editingConfig?.config_value]
  )

  const resizeConfigValueTextarea = useCallback(() => {
    const el = configValueTextareaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = 'auto'
    const minPx = 96
    const maxPx =
      typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.58, 720) : 600
    const contentH = el.scrollHeight
    const next = Math.min(Math.max(contentH, minPx), maxPx)
    el.style.height = `${next}px`
    el.style.overflowY = contentH > maxPx ? 'auto' : 'hidden'
  }, [])

  useLayoutEffect(() => {
    if (!isEditDialogOpen) return
    resizeConfigValueTextarea()
    const id = requestAnimationFrame(() => resizeConfigValueTextarea())
    return () => cancelAnimationFrame(id)
  }, [isEditDialogOpen, editingConfig?.config_value, editValueFormat, resizeConfigValueTextarea])

  useEffect(() => {
    if (!isEditDialogOpen || typeof window === 'undefined') return
    const onResize = () => resizeConfigValueTextarea()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isEditDialogOpen, resizeConfigValueTextarea])

  const sortedTableRows = useMemo(() => {
    const rows: SystemConfig[] = []
    for (const [, groupConfigs] of sortGroupEntries(Object.entries(filteredGroupedConfigs))) {
      const sorted = [...groupConfigs].sort((a, b) => a.config_key.localeCompare(b.config_key))
      rows.push(...sorted)
    }
    return rows
  }, [filteredGroupedConfigs])

  // Stats
  const stats = useMemo(() => {
    const total = configs.length
    const edited = editedConfigs.size
    const groups = Object.keys(groupedConfigs).length
    const filtered = filteredConfigs.length
    return { total, edited, groups, filtered }
  }, [configs.length, editedConfigs.size, groupedConfigs, filteredConfigs.length])

  const handleOpenEditDialog = (config: SystemConfig) => {
    const edited = editedConfigs.get(config.config_key) || config
    setEditingConfig({
      ...edited,
      config_value: tryPrettyPrintConfigJson(edited.config_value),
    })
    setIsEditDialogOpen(true)
  }

  const handlePrettifyConfigValue = useCallback(() => {
    setEditingConfig((prev) => {
      if (!prev) return prev
      const next = prettifyConfigJsonOrNull(prev.config_value)
      if (next) return { ...prev, config_value: next }
      toast.error('Invalid JSON', { description: 'Fix syntax errors, then try again.' })
      return prev
    })
  }, [])

  const handleSaveEditDialog = () => {
    if (!editingConfig) return

    const edited = { ...editingConfig }
    editedConfigs.set(editingConfig.config_key, edited)
    setEditedConfigs(new Map(editedConfigs))
    setHasChanges(true)
    setIsEditDialogOpen(false)
    setEditingConfig(null)
  }

  const closeEditSheet = () => {
    setIsEditDialogOpen(false)
    setEditingConfig(null)
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
        credentials: 'include',
        cache: 'no-store',
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
        credentials: 'include',
        cache: 'no-store',
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

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedGroup('all')
    setShowEditedOnly(false)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (
        el &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      searchInputRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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
      if (['auth', 'validation', 'pagination', 'contact', 'notification', 'email', 'storage', 'google', 'anthropic', 'ai'].includes(firstSegment)) {
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
            description="Browse settings in the table; click a row or Edit to open the side panel. Save when ready."
            menuActions={[
              {
                label: 'Reload',
                onClick: () => fetchSettings(),
                icon: RefreshCw,
              },
              {
                label: 'API Keys',
                onClick: () => router.push(`/${locale}/admin/settings/api-keys`),
                icon: Key,
              },
              {
                label: 'AI Settings',
                onClick: () => router.push(`/${locale}/admin/settings/ai`),
                icon: Sparkles,
              },
              {
                label: 'Notification Rules',
                onClick: () => router.push(`/${locale}/admin/notifications`),
                icon: Bell,
              },
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

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5">
            <Card className="rounded-xl border border-slate-200/80 bg-white/80 shadow-sm ring-1 ring-slate-100">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 p-2.5">
                    <Database className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums text-slate-900">{stats.total}</div>
                    <div className="text-xs font-medium text-slate-500">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-slate-200/80 bg-white/80 shadow-sm ring-1 ring-slate-100">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 p-2.5">
                    <FolderTree className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums text-slate-900">{stats.groups}</div>
                    <div className="text-xs font-medium text-slate-500">Groups</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border border-slate-200/80 bg-white/80 shadow-sm ring-1 ring-slate-100">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 p-2.5">
                    <Edit className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums text-slate-900">{stats.edited}</div>
                    <div className="text-xs font-medium text-slate-500">Unsaved edits</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className={cn(
                'rounded-xl border shadow-sm ring-1 transition-colors',
                stats.filtered < stats.total
                  ? 'border-indigo-200/80 bg-indigo-50/50 ring-indigo-100'
                  : 'border-slate-200/80 bg-white/80 ring-slate-100'
              )}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-violet-500/15 to-violet-600/5 p-2.5">
                    <FileText className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums text-slate-900">{stats.filtered}</div>
                    <div className="text-xs font-medium text-slate-500">Matching filter</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & filters — sticky */}
          <Card className="sticky top-0 z-30 mb-6 rounded-xl border border-slate-200/90 bg-white/90 shadow-md shadow-slate-200/50 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
            <CardContent className="space-y-2.5 p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 w-full shrink-0 justify-between gap-2 border-slate-200 bg-white px-3 font-normal shadow-sm sm:w-[min(100%,220px)]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Filter className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="truncate text-left text-sm">
                          {selectedGroup === 'all'
                            ? 'All groups'
                            : GROUP_DISPLAY_NAMES[selectedGroup] || selectedGroup}
                        </span>
                        <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] font-normal tabular-nums">
                          {selectedGroup === 'all'
                            ? stats.total
                            : groupedConfigs[selectedGroup]?.length ?? 0}
                        </Badge>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[min(60vh,320px)] w-[min(calc(100vw-2rem),280px)] overflow-y-auto">
                    <DropdownMenuLabel className="text-xs font-medium text-slate-500">
                      Filter by group
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={selectedGroup} onValueChange={setSelectedGroup}>
                      <DropdownMenuRadioItem value="all" className="cursor-pointer">
                        <span className="flex w-full items-center justify-between gap-3">
                          <span>All groups</span>
                          <span className="text-xs tabular-nums text-slate-500">{stats.total}</span>
                        </span>
                      </DropdownMenuRadioItem>
                      {groupTypes.map((group) => (
                        <DropdownMenuRadioItem key={group} value={group} className="cursor-pointer">
                          <span className="flex w-full items-center justify-between gap-3">
                            <span className="min-w-0 truncate">{GROUP_DISPLAY_NAMES[group] || group}</span>
                            <span className="shrink-0 text-xs tabular-nums text-slate-500">
                              {groupedConfigs[group]?.length ?? 0}
                            </span>
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <label htmlFor="settings-search" className="sr-only">
                  Search configuration keys and values
                </label>
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="settings-search"
                    ref={searchInputRef}
                    placeholder="Search key, value, description, group…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 border-slate-200 bg-white pl-10 pr-3 text-sm shadow-sm focus-visible:ring-indigo-500/30"
                  />
                </div>

                <div className="flex items-center gap-2 sm:shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant={showEditedOnly ? 'default' : 'outline'}
                    className={cn(
                      'h-10 shrink-0',
                      showEditedOnly && 'bg-amber-600 hover:bg-amber-700'
                    )}
                    onClick={() => setShowEditedOnly((v) => !v)}
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5" />
                    Edited only
                    {editedConfigs.size > 0 && (
                      <Badge variant="secondary" className="ml-1.5 bg-white/20 px-1.5 text-[10px]">
                        {editedConfigs.size}
                      </Badge>
                    )}
                  </Button>
                  {(searchQuery.trim() || selectedGroup !== 'all' || showEditedOnly) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-10 shrink-0 text-slate-600"
                      onClick={clearFilters}
                    >
                      <FilterX className="mr-1.5 h-3.5 w-3.5" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] leading-snug text-slate-500">
                <span>
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px] text-slate-600">
                    /
                  </kbd>{' '}
                  focus search
                </span>
                <span>Multiple words: each must appear somewhere in the row.</span>
              </p>

              {filterActive && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-600">
                  <span>
                    Showing <strong className="font-semibold text-indigo-700">{stats.filtered}</strong> of{' '}
                    {stats.total} configs
                    {searchQuery.trim() ? (
                      <>
                        {' '}
                        for <q className="text-slate-800">{searchQuery.trim()}</q>
                      </>
                    ) : null}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Content */}
          {sortedTableRows.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No configurations found</p>
                <p className="text-gray-400 text-sm mb-4">
                  {filterActive
                    ? 'No configs match your search or filters. Try clearing filters or different words.'
                    : 'Get started by creating your first configuration.'}
                </p>
                <Button
                  onClick={() => {
                    if (filterActive) clearFilters()
                    else setIsCreateDialogOpen(true)
                  }}
                  variant="outline"
                >
                  {filterActive ? (
                    <>
                      <FilterX className="h-4 w-4 mr-2" />
                      Clear filters
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Config
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-indigo-700">{stats.filtered}</span> of{' '}
                  <span className="text-slate-900">{stats.total}</span> rows
                  {filterActive ? <span className="text-slate-500"> (filtered)</span> : null}
                </p>
                <p className="text-xs text-slate-500">Click a row to edit in the side panel.</p>
              </div>

              <Card className="overflow-hidden rounded-xl border border-slate-200/90 shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 bg-slate-50/90 hover:bg-slate-50/90">
                      <TableHead className="w-[140px] font-semibold text-slate-700">Group</TableHead>
                      <TableHead className="min-w-[200px] font-semibold text-slate-700">Key</TableHead>
                      <TableHead className="hidden font-semibold text-slate-700 md:table-cell">Value</TableHead>
                      <TableHead className="hidden font-semibold text-slate-700 lg:table-cell">Description</TableHead>
                      <TableHead className="w-[100px] text-right font-semibold text-slate-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTableRows.map((config) => {
                      const isEdited = editedConfigs.has(config.config_key)
                      const g = config.group_type || 'general'
                      const displayName = GROUP_DISPLAY_NAMES[g] || g
                      const valuePreview = getConfigValue(config.config_key)
                      const desc =
                        getConfigDescription(config.config_key, 'en') ||
                        getConfigDescription(config.config_key, 'ar')

                      return (
                        <TableRow
                          key={config.config_key}
                          role="button"
                          tabIndex={0}
                          className={cn(
                            'cursor-pointer border-slate-100 transition-colors',
                            isEdited ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-indigo-50/40'
                          )}
                          onClick={() => handleOpenEditDialog(config)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleOpenEditDialog(config)
                            }
                          }}
                        >
                          <TableCell className="align-top">
                            <div className="flex items-center gap-2">
                              <SettingsGroupIcon group={g} />
                              <div className="min-w-0">
                                <div className="truncate text-xs font-medium text-slate-900">{displayName}</div>
                                <Badge variant="outline" className="mt-1 font-mono text-[10px] font-normal">
                                  {g}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="align-top font-mono text-xs text-slate-900 sm:text-sm">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <HighlightMatch text={config.config_key} query={searchQuery} />
                              {isEdited && (
                                <Badge className="shrink-0 bg-amber-500 text-[10px]">Edited</Badge>
                              )}
                            </div>
                            <p className="mt-2 line-clamp-2 font-sans text-[11px] text-slate-500 md:hidden">
                              {truncatePreview(valuePreview)}
                            </p>
                          </TableCell>
                          <TableCell className="hidden max-w-md align-top md:table-cell">
                            <span className="line-clamp-2 font-mono text-xs text-slate-700" title={valuePreview}>
                              <HighlightMatch text={truncatePreview(valuePreview, 200)} query={searchQuery} />
                            </span>
                          </TableCell>
                          <TableCell className="hidden max-w-xs align-top lg:table-cell">
                            {desc ? (
                              <span className="line-clamp-2 text-xs text-slate-600">
                                <HighlightMatch text={desc} query={searchQuery} />
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="align-top text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenEditDialog(config)
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Card>

              <Card className="border border-slate-200 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      {hasChanges ? (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                          <span className="text-sm font-medium text-amber-800">
                            {stats.edited} unsaved change{stats.edited !== 1 ? 's' : ''} — use{' '}
                            <strong>Apply</strong> in the panel, then <strong>Save changes</strong> below.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-800">All changes saved</span>
                        </div>
                      )}
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        disabled={saving || !hasChanges}
                        className="h-10 flex-1 sm:min-w-[100px] sm:flex-initial"
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="h-10 flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 sm:min-w-[140px] sm:flex-initial"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
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

      {/* Edit — side sheet */}
      <Sheet
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setEditingConfig(null)
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl"
        >
          <SheetHeader className="space-y-1 border-b border-border px-6 py-4 text-left">
            <SheetTitle>Edit configuration</SheetTitle>
            <SheetDescription asChild>
              <code className="block break-all text-xs text-muted-foreground">
                {editingConfig?.config_key}
              </code>
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm font-medium">Value</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-normal capitalize">
                    {editValueFormat === 'json' && 'JSON'}
                    {editValueFormat === 'markdown' && 'Markdown'}
                    {editValueFormat === 'regex' && 'Regex'}
                    {editValueFormat === 'email' && 'Email'}
                    {editValueFormat === 'phone' && 'Phone'}
                    {editValueFormat === 'url' && 'URL'}
                    {editValueFormat === 'text' && 'Plain text'}
                  </Badge>
                  {editValueFormat === 'json' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handlePrettifyConfigValue}
                    >
                      Format JSON
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                ref={configValueTextareaRef}
                value={editingConfig?.config_value || ''}
                onChange={(e) => {
                  if (editingConfig) {
                    setEditingConfig({ ...editingConfig, config_value: e.target.value })
                  }
                }}
                placeholder="Configuration value…"
                spellCheck={
                  editValueFormat !== 'json' &&
                  editValueFormat !== 'regex' &&
                  editValueFormat !== 'url' &&
                  editValueFormat !== 'email'
                }
                className={cn(
                  'min-h-24 resize-none text-sm leading-relaxed transition-[height]',
                  editValueFormat === 'json' &&
                    'border-violet-200/80 bg-violet-50/40 font-mono [tab-size:2] dark:border-violet-900/60 dark:bg-violet-950/25',
                  editValueFormat === 'markdown' &&
                    'border-emerald-200/80 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/20',
                  editValueFormat === 'regex' &&
                    'border-amber-200/80 bg-amber-50/35 font-mono [tab-size:2] dark:border-amber-900/55 dark:bg-amber-950/25',
                  editValueFormat === 'email' &&
                    'border-sky-200/80 bg-sky-50/40 font-mono text-sm dark:border-sky-900/55 dark:bg-sky-950/25',
                  editValueFormat === 'phone' &&
                    'border-cyan-200/80 bg-cyan-50/35 font-mono tracking-wide dark:border-cyan-900/55 dark:bg-cyan-950/25',
                  editValueFormat === 'url' &&
                    'border-indigo-200/80 bg-indigo-50/35 font-mono break-all dark:border-indigo-900/55 dark:bg-indigo-950/25',
                  editValueFormat === 'text' && 'font-sans'
                )}
              />
              {editValueJsonError ? (
                <p className="flex items-start gap-1.5 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{editValueJsonError}</span>
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Staged locally until you click Apply, then Save changes on the page.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Descriptions</p>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">English</Label>
                  <div className="relative">
                    <Textarea
                      value={editingConfig?.description || ''}
                      onChange={(e) => {
                        if (editingConfig) {
                          setEditingConfig({ ...editingConfig, description: e.target.value || null })
                        }
                      }}
                      placeholder="English description…"
                      className="min-h-[100px] resize-none pr-10 text-sm"
                    />
                    <div className="absolute bottom-2 right-2">
                      <TranslationButton
                        sourceText={editingConfig?.description_ar || ''}
                        direction="ar-to-en"
                        onTranslate={(translated) => {
                          if (editingConfig) {
                            setEditingConfig({ ...editingConfig, description: translated })
                          }
                        }}
                        size="sm"
                        variant="ghost"
                        iconOnly
                        disabled={!editingConfig?.description_ar}
                        className="h-7 w-7 bg-background p-0 shadow-sm hover:bg-muted"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Arabic</Label>
                  <div className="relative">
                    <Textarea
                      value={editingConfig?.description_ar || ''}
                      onChange={(e) => {
                        if (editingConfig) {
                          setEditingConfig({ ...editingConfig, description_ar: e.target.value || null })
                        }
                      }}
                      placeholder="Arabic description…"
                      className="min-h-[100px] resize-none pl-10 text-sm"
                      dir="rtl"
                    />
                    <div className="absolute bottom-2 left-2">
                      <TranslationButton
                        sourceText={editingConfig?.description || ''}
                        direction="en-to-ar"
                        onTranslate={(translated) => {
                          if (editingConfig) {
                            setEditingConfig({ ...editingConfig, description_ar: translated })
                          }
                        }}
                        size="sm"
                        variant="ghost"
                        iconOnly
                        disabled={!editingConfig?.description}
                        className="h-7 w-7 bg-background p-0 shadow-sm hover:bg-muted"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Read-only
              </p>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Group</Label>
                  <Input
                    value={editingConfig?.group_type || 'general'}
                    disabled
                    className="mt-0.5 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="mt-auto flex-row gap-2 border-t border-border bg-muted px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={closeEditSheet}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={
                !editingConfig?.config_value?.trim() ||
                (editValueFormat === 'json' && Boolean(editValueJsonError))
              }
              onClick={handleSaveEditDialog}
            >
              Apply
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PermissionGuard>
  )
}
