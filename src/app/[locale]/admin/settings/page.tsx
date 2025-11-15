'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  FileText,
  DollarSign,
  Clock,
  Type
} from 'lucide-react'

interface SystemConfig {
  config_key: string
  config_value: string
  description: string | null
  description_ar: string | null
}

interface ValidationSettings {
  caseTitleMinLength: string
  caseTitleMaxLength: string
  caseDescriptionMinLength: string
  caseDescriptionMaxLength: string
  caseTargetAmountMax: string
  caseDurationMax: string
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
  const [validationSettings, setValidationSettings] = useState<ValidationSettings>({
    caseTitleMinLength: '10',
    caseTitleMaxLength: '100',
    caseDescriptionMinLength: '50',
    caseDescriptionMaxLength: '2000',
    caseTargetAmountMax: '1000000',
    caseDurationMax: '365',
  })
  const [hasChanges, setHasChanges] = useState(false)

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

      // Map configs to validation settings
      const settingsMap = new Map<string, string>(
        configs.map((item: SystemConfig) => [item.config_key, item.config_value])
      )

      setValidationSettings({
        caseTitleMinLength: (settingsMap.get('validation.case.title.min_length') || '10') as string,
        caseTitleMaxLength: (settingsMap.get('validation.case.title.max_length') || '100') as string,
        caseDescriptionMinLength: (settingsMap.get('validation.case.description.min_length') || '50') as string,
        caseDescriptionMaxLength: (settingsMap.get('validation.case.description.max_length') || '2000') as string,
        caseTargetAmountMax: (settingsMap.get('validation.case.target_amount.max') || '1000000') as string,
        caseDurationMax: (settingsMap.get('validation.case.duration.max') || '365') as string,
      })

      setHasChanges(false)
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

  const handleSettingChange = (key: keyof ValidationSettings, value: string) => {
    setValidationSettings(prev => ({
      ...prev,
      [key]: value
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settings: {
            caseTitleMinLength: validationSettings.caseTitleMinLength,
            caseTitleMaxLength: validationSettings.caseTitleMaxLength,
            caseDescriptionMinLength: validationSettings.caseDescriptionMinLength,
            caseDescriptionMaxLength: validationSettings.caseDescriptionMaxLength,
            caseTargetAmountMax: validationSettings.caseTargetAmountMax,
            caseDurationMax: validationSettings.caseDurationMax
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast.error('Error', { description: errorData.error || 'Failed to save system settings' })
        return
      }

      toast.success('Success', { description: 'System settings updated successfully' })
      setHasChanges(false)
      await fetchSettings() // Refresh to get updated values
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Error', { description: 'Failed to save system settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    fetchSettings()
    setHasChanges(false)
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
            description="Manage system configuration and validation rules"
          />

          <div className="space-y-6">
            {/* Validation Settings Card */}
            <Card className="shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-white to-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Validation Settings</CardTitle>
                    <CardDescription>
                      Configure validation rules for case forms
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Case Title Validation */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Type className="h-4 w-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Case Title Validation</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title_min" className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-gray-400" />
                        Minimum Length
                      </Label>
                      <Input
                        id="title_min"
                        type="number"
                        min="1"
                        max="1000"
                        value={validationSettings.caseTitleMinLength}
                        onChange={(e) => handleSettingChange('caseTitleMinLength', e.target.value)}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500">Minimum characters required for case title</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="title_max" className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-gray-400" />
                        Maximum Length
                      </Label>
                      <Input
                        id="title_max"
                        type="number"
                        min="1"
                        max="1000"
                        value={validationSettings.caseTitleMaxLength}
                        onChange={(e) => handleSettingChange('caseTitleMaxLength', e.target.value)}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500">Maximum characters allowed for case title</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Case Description Validation */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Case Description Validation</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="desc_min" className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-gray-400" />
                        Minimum Length
                      </Label>
                      <Input
                        id="desc_min"
                        type="number"
                        min="1"
                        max="10000"
                        value={validationSettings.caseDescriptionMinLength}
                        onChange={(e) => handleSettingChange('caseDescriptionMinLength', e.target.value)}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500">Minimum characters required for case description</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="desc_max" className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-gray-400" />
                        Maximum Length
                      </Label>
                      <Input
                        id="desc_max"
                        type="number"
                        min="1"
                        max="10000"
                        value={validationSettings.caseDescriptionMaxLength}
                        onChange={(e) => handleSettingChange('caseDescriptionMaxLength', e.target.value)}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500">Maximum characters allowed for case description</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Financial & Duration Validation */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Financial & Duration Limits</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target_max" className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        Maximum Target Amount (EGP)
                      </Label>
                      <Input
                        id="target_max"
                        type="number"
                        min="1"
                        value={validationSettings.caseTargetAmountMax}
                        onChange={(e) => handleSettingChange('caseTargetAmountMax', e.target.value)}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500">Maximum target amount allowed for cases</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="duration_max" className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        Maximum Duration (Days)
                      </Label>
                      <Input
                        id="duration_max"
                        type="number"
                        min="1"
                        max="3650"
                        value={validationSettings.caseDurationMax}
                        onChange={(e) => handleSettingChange('caseDurationMax', e.target.value)}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500">Maximum duration for one-time cases</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
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

            {hasChanges && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm font-medium">You have unsaved changes</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </Container>
      </div>
    </PermissionGuard>
  )
}

