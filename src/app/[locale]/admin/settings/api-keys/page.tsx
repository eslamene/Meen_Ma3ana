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
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import { Key, Loader2, Eye, EyeOff, AlertCircle, Save, Info, Settings, Sparkles, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_KEY_FIELDS = [
  {
    key: 'google.gemini.api_key',
    groupType: 'google',
    id: 'gemini' as const,
  },
  {
    key: 'anthropic.api_key',
    groupType: 'anthropic',
    id: 'anthropic' as const,
  },
  {
    key: 'google.translate.api_key',
    groupType: 'google',
    id: 'translate' as const,
  },
] as const

export default function ApiKeysSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin.apiKeys')
  const { containerVariant } = useLayout()

  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasStored, setHasStored] = useState<Record<string, boolean>>({})
  /** Last 4 chars of stored key (admin-only) so users can confirm save without showing the full secret */
  const [storedSuffix, setStoredSuffix] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [testingKey, setTestingKey] = useState<string | null>(null)

  const loadConfigs = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true
      try {
        if (silent) {
          setIsRefreshing(true)
        } else {
          setIsBootstrapping(true)
        }
        const response = await fetch('/api/admin/settings', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error('Failed to load settings')
        }
        const data = await response.json()
        const configs = data.configs as { config_key: string; config_value: string }[]
        const nextStored: Record<string, boolean> = {}
        const nextSuffix: Record<string, string> = {}
        const nextDrafts: Record<string, string> = {}
        for (const def of API_KEY_FIELDS) {
          const row = configs.find((c) => c.config_key === def.key)
          const raw = row?.config_value?.trim() ?? ''
          nextStored[def.key] = raw.length > 0
          if (raw.length >= 4) {
            nextSuffix[def.key] = raw.slice(-4)
          } else if (raw.length > 0) {
            nextSuffix[def.key] = '****'
          }
          nextDrafts[def.key] = ''
        }
        setHasStored(nextStored)
        setStoredSuffix(nextSuffix)
        setDrafts(nextDrafts)
      } catch {
        toast.error(t('loadError'))
      } finally {
        if (silent) {
          setIsRefreshing(false)
        } else {
          setIsBootstrapping(false)
        }
      }
    },
    [t]
  )

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const hasPendingSave = useMemo(
    () => API_KEY_FIELDS.some((def) => (drafts[def.key]?.trim() ?? '').length > 0),
    [drafts]
  )

  const handleSave = async () => {
    const configs: Array<{
      config_key: string
      config_value: string
      description: string | null
      group_type: string
    }> = []

    for (const def of API_KEY_FIELDS) {
      const v = drafts[def.key]?.trim() ?? ''
      if (v) {
        configs.push({
          config_key: def.key,
          config_value: v,
          description: t(`${def.id}Description`),
          group_type: def.groupType,
        })
      }
    }

    if (configs.length === 0) {
      toast.message(t('nothingToSave'))
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      })
      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        toast.error(t('saveError'), { description: result.error ?? undefined })
        return
      }
      toast.success(t('saved'), {
        description: t('savedDescription'),
      })
      await loadConfigs({ silent: true })
    } catch {
      toast.error(t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const toggleVisible = (key: string) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleTestConnection = async (def: (typeof API_KEY_FIELDS)[number]) => {
    const draft = drafts[def.key]?.trim() ?? ''
    if (!draft && !hasStored[def.key]) {
      toast.message(t('testNoKey'))
      return
    }
    try {
      setTestingKey(def.key)
      const response = await fetch('/api/admin/settings/test-api-key', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: def.id,
          ...(draft ? { apiKey: draft } : {}),
        }),
      })
      const data = (await response.json()) as {
        ok?: boolean
        error?: string
      }
      if (!response.ok) {
        toast.error(t('testFailed'), { description: data.error || t('testFailedGeneric') })
        return
      }
      if (data.ok === false && data.error) {
        toast.error(t('testFailed'), { description: data.error })
        return
      }
      toast.success(t('testSuccess'))
    } catch {
      toast.error(t('testFailedGeneric'))
    } finally {
      setTestingKey(null)
    }
  }

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard
      permissions={['admin:dashboard']}
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('accessDenied')}</h2>
              <p className="text-gray-600 mb-4">{t('accessDeniedDescription')}</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-gray-50">
        <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
          <DetailPageHeader
            backUrl={`/${locale}/admin/settings`}
            icon={Key}
            title={t('title')}
            description={t('pageDescription')}
            badge={
              isRefreshing
                ? { label: t('syncing'), variant: 'secondary' as const }
                : undefined
            }
            menuActions={[
              {
                label: t('systemSettings'),
                onClick: () => router.push(`/${locale}/admin/settings`),
                icon: Settings,
              },
              {
                label: t('aiSettings'),
                onClick: () => router.push(`/${locale}/admin/settings/ai`),
                icon: Sparkles,
              },
            ]}
          />

          <Card className="border border-gray-200 shadow-sm mb-6">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-indigo-50/40">
              <CardTitle className="text-lg">{t('howItWorks')}</CardTitle>
              <CardDescription className="flex gap-2 items-start">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600" />
                <span>{t('envFallback')}</span>
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {API_KEY_FIELDS.map((def) => {
              const stored = hasStored[def.key]
              const suffix = storedSuffix[def.key]
              const show = visible[def.key]
              return (
                <Card key={def.key} className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <CardTitle className="text-base font-semibold">{t(`${def.id}Label`)}</CardTitle>
                      {stored ? (
                        <Badge variant="secondary" className="font-normal">
                          {t('configured')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal text-amber-700 border-amber-200 bg-amber-50">
                          {t('notInDatabase')}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm">{t(`${def.id}Description`)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor={def.key} className="text-sm text-gray-700">
                        {t('secretInputLabel')}
                      </Label>
                      <div className="relative flex gap-2">
                        <Input
                          id={def.key}
                          type={show ? 'text' : 'password'}
                          autoComplete="off"
                          value={drafts[def.key] ?? ''}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [def.key]: e.target.value,
                            }))
                          }
                          placeholder={stored ? t('placeholderReplace') : t('placeholderNew')}
                          className={cn('pr-10 font-mono text-sm')}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={() => toggleVisible(def.key)}
                          aria-label={show ? t('hideSecret') : t('showSecret')}
                        >
                          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">{t('leaveBlankHint')}</p>
                      {stored && suffix && !(drafts[def.key]?.trim()) && (
                        <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1.5">
                          {suffix === '****'
                            ? t('savedKeyShort')
                            : t('savedKeySuffix', { suffix })}
                        </p>
                      )}
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="gap-2"
                          disabled={saving || testingKey === def.key}
                          onClick={() => handleTestConnection(def)}
                        >
                          {testingKey === def.key ? (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                          ) : (
                            <FlaskConical className="h-4 w-4 shrink-0" />
                          )}
                          {t('testConnection')}
                        </Button>
                        <p className="text-xs text-gray-500 mt-1.5">{t('testConnectionHint')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => loadConfigs({ silent: true })}
              disabled={saving || isRefreshing}
            >
              {t('discardDrafts')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasPendingSave}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('save')}
                </>
              )}
            </Button>
          </div>
        </Container>
      </div>
    </PermissionGuard>
  )
}
