'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, ArrowRight, Upload, Image as ImageIcon, X } from 'lucide-react'
import ImageUpload from '@/components/cases/ImageUpload'

type CaseType = 'one-time' | 'recurring'
type Priority = 'low' | 'medium' | 'high' | 'urgent'
type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

interface UploadedImage {
  id: string
  file: File
  preview: string
  isPrimary: boolean
  uploaded: boolean
  uploadProgress: number
  error?: string
}

interface CaseFormData {
  title: string
  description: string
  targetAmount: string
  category: string
  priority: Priority
  location: string
  beneficiaryName: string
  beneficiaryContact: string
  duration: string
  frequency?: Frequency
  startDate: string
  endDate: string
}

export default function CaseDetailsPage() {
  const t = useTranslations('cases')
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const locale = params.locale as string
  const caseType = searchParams.get('type') as CaseType

  const [formData, setFormData] = useState<CaseFormData>({
    title: '',
    description: '',
    targetAmount: '',
    category: '',
    priority: 'medium',
    location: '',
    beneficiaryName: '',
    beneficiaryContact: '',
    duration: '',
    frequency: undefined,
    startDate: '',
    endDate: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [images, setImages] = useState<UploadedImage[]>([])
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!caseType || !['one-time', 'recurring'].includes(caseType)) {
      router.push(`/${locale}/cases/create`)
    }
  }, [caseType, router, locale])

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error getting user:', error)
        router.push(`/${locale}/auth/login`)
        return
      }
      if (!user) {
        router.push(`/${locale}/auth/login`)
        return
      }
      setUser(user)
    }

    getUser()
  }, [supabase.auth, router, locale])

  const handleInputChange = (field: keyof CaseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Real-time validation
    const newErrors = { ...errors }
    
    // Clear existing error
    if (newErrors[field]) {
      delete newErrors[field]
    }
    
    // Validate the changed field
    if (field === 'title') {
      if (!value.trim()) {
        newErrors.title = t('validation.titleRequired')
      } else if (value.trim().length < 10) {
        newErrors.title = t('validation.titleTooShort')
      } else if (value.trim().length > 100) {
        newErrors.title = t('validation.titleTooLong')
      }
    } else if (field === 'description') {
      if (!value.trim()) {
        newErrors.description = t('validation.descriptionRequired')
      } else if (value.trim().length < 50) {
        newErrors.description = t('validation.descriptionTooShort')
      } else if (value.trim().length > 2000) {
        newErrors.description = t('validation.descriptionTooLong')
      }
    } else if (field === 'targetAmount') {
      if (!value) {
        newErrors.targetAmount = t('validation.targetAmountRequired')
      } else if (parseFloat(value) <= 0) {
        newErrors.targetAmount = t('validation.targetAmountInvalid')
      } else if (parseFloat(value) > 1000000) {
        newErrors.targetAmount = t('validation.targetAmountTooHigh')
      }
    } else if (field === 'location') {
      if (!value.trim()) {
        newErrors.location = t('validation.locationRequired')
      }
    } else if (field === 'beneficiaryName') {
      if (!value.trim()) {
        newErrors.beneficiaryName = t('validation.beneficiaryNameRequired')
      }
    } else if (field === 'beneficiaryContact') {
      if (!value.trim()) {
        newErrors.beneficiaryContact = t('validation.beneficiaryContactRequired')
      }
    } else if (field === 'duration' && caseType === 'one-time') {
      if (!value) {
        newErrors.duration = t('validation.durationRequired')
      } else if (parseInt(value) <= 0) {
        newErrors.duration = t('validation.durationInvalid')
      } else if (parseInt(value) > 365) {
        newErrors.duration = t('validation.durationTooLong')
      }
    }
    
    setErrors(newErrors)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = t('validation.titleRequired')
    } else if (formData.title.trim().length < 10) {
      newErrors.title = t('validation.titleTooShort')
    } else if (formData.title.trim().length > 100) {
      newErrors.title = t('validation.titleTooLong')
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = t('validation.descriptionRequired')
    } else if (formData.description.trim().length < 50) {
      newErrors.description = t('validation.descriptionTooShort')
    } else if (formData.description.trim().length > 2000) {
      newErrors.description = t('validation.descriptionTooLong')
    }

    // Target amount validation
    if (!formData.targetAmount) {
      newErrors.targetAmount = t('validation.targetAmountRequired')
    } else if (parseFloat(formData.targetAmount) <= 0) {
      newErrors.targetAmount = t('validation.targetAmountInvalid')
    } else if (parseFloat(formData.targetAmount) > 1000000) {
      newErrors.targetAmount = t('validation.targetAmountTooHigh')
    }

    // Category validation
    if (!formData.category) {
      newErrors.category = t('validation.categoryRequired')
    }

    // Priority validation
    if (!formData.priority) {
      newErrors.priority = t('validation.priorityRequired')
    }

    // Location validation
    if (!formData.location.trim()) {
      newErrors.location = t('validation.locationRequired')
    }

    // Beneficiary validation
    if (!formData.beneficiaryName.trim()) {
      newErrors.beneficiaryName = t('validation.beneficiaryNameRequired')
    }

    if (!formData.beneficiaryContact.trim()) {
      newErrors.beneficiaryContact = t('validation.beneficiaryContactRequired')
    }

    // One-time case specific validation
    if (caseType === 'one-time') {
      if (!formData.duration) {
        newErrors.duration = t('validation.durationRequired')
      } else if (parseInt(formData.duration) <= 0) {
        newErrors.duration = t('validation.durationInvalid')
      } else if (parseInt(formData.duration) > 365) {
        newErrors.duration = t('validation.durationTooLong')
      }
    }

    // Recurring case specific validation
    if (caseType === 'recurring') {
      if (!formData.frequency) {
        newErrors.frequency = t('validation.frequencyRequired')
      }
      if (!formData.startDate) {
        newErrors.startDate = t('validation.startDateRequired')
      }
      if (!formData.endDate) {
        newErrors.endDate = t('validation.endDateRequired')
      }
      if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
        newErrors.endDate = t('validation.endDateAfterStart')
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleBack = () => {
    router.push(`/${locale}/cases/create`)
  }

  const handleNext = () => {
    if (validateForm()) {
      // Store form data in session storage or state management
      sessionStorage.setItem('caseFormData', JSON.stringify(formData))
      router.push(`/${locale}/cases/create/images?type=${caseType}`)
    }
  }

  const handleSaveDraft = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Create draft case using API endpoint
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          targetAmount: formData.targetAmount,
          category: formData.category,
          priority: formData.priority,
          location: formData.location,
          beneficiaryName: formData.beneficiaryName,
          beneficiaryContact: formData.beneficiaryContact,
          type: caseType,
          status: 'draft',
          duration: formData.duration,
          frequency: formData.frequency,
          startDate: formData.startDate,
          endDate: formData.endDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save draft')
      }

      const result = await response.json()
      setLastSaved(new Date())
      console.log('Draft saved successfully:', result.case)
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!caseType) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('caseDetails')}
          </h1>
          <p className="text-gray-600">
            {t('caseDetailsDescription')}
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('caseDetails')}</CardTitle>
            <CardDescription className="text-gray-700">
              {caseType === 'one-time' ? t('oneTimeCase') : t('recurringCase')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('title')} *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder={t('titlePlaceholder')}
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('description')} *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={t('descriptionPlaceholder')}
                  rows={4}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('targetAmount')} *
                </label>
                <Input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => handleInputChange('targetAmount', e.target.value)}
                  placeholder={t('targetAmountPlaceholder')}
                  className={errors.targetAmount ? 'border-red-500' : ''}
                />
                {errors.targetAmount && (
                  <p className="text-red-500 text-sm mt-1">{errors.targetAmount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('category')} *
                </label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="housing">Housing</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('priority')} *
                </label>
                <Select
                  value={formData.priority || ''}
                  onValueChange={(value) => handleInputChange('priority', value as Priority)}
                >
                  <SelectTrigger className={errors.priority ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('selectPriority')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-red-500 text-sm mt-1">{errors.priority}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('location')}
                </label>
                <Input
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder={t('locationPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('beneficiaryName')}
                </label>
                <Input
                  value={formData.beneficiaryName}
                  onChange={(e) => handleInputChange('beneficiaryName', e.target.value)}
                  placeholder={t('beneficiaryNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('beneficiaryContact')}
                </label>
                <Input
                  value={formData.beneficiaryContact}
                  onChange={(e) => handleInputChange('beneficiaryContact', e.target.value)}
                  placeholder={t('beneficiaryContactPlaceholder')}
                />
              </div>

              {caseType === 'one-time' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('duration')} *
                  </label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    placeholder={t('durationPlaceholder')}
                    className={errors.duration ? 'border-red-500' : ''}
                  />
                  {errors.duration && (
                    <p className="text-red-500 text-sm mt-1">{errors.duration}</p>
                  )}
                </div>
              )}

              {caseType === 'recurring' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('frequency')} *
                    </label>
                    <Select
                      value={formData.frequency || ''}
                      onValueChange={(value) => handleInputChange('frequency', value as Frequency)}
                    >
                      <SelectTrigger className={errors.frequency ? 'border-red-500' : ''}>
                        <SelectValue placeholder={t('selectFrequency')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.frequency && (
                      <p className="text-red-500 text-sm mt-1">{errors.frequency}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('startDate')} *
                    </label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className={errors.startDate ? 'border-red-500' : ''}
                    />
                    {errors.startDate && (
                      <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('endDate')} *
                    </label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className={errors.endDate ? 'border-red-500' : ''}
                    />
                    {errors.endDate && (
                      <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Image Upload Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('images')}</CardTitle>
            <CardDescription>
              {t('uploadImagesDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUpload
              onImagesChange={setImages}
              maxImages={5}
              maxFileSize={5}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handleSaveDraft}>
            {t('saveDraft')}
          </Button>
          <Button onClick={handleNext}>
            {t('continue')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
} 