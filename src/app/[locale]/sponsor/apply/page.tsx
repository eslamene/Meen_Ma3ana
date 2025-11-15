'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Building2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SponsorFormData {
  companyName: string
  contactPerson: string
  email: string
  phone: string
  website: string
  companyDescription: string
  sponsorshipTier: string
  termsAccepted: boolean
}

export default function SponsorApplicationPage() {
  const t = useTranslations('sponsor')
  const router = useRouter()
  const [loading, _setLoading] = useState(false) // eslint-disable-line @typescript-eslint/no-unused-vars
  const [submitting, setSubmitting] = useState(false)
  const [error, _setError] = useState<string | null>(null) // eslint-disable-line @typescript-eslint/no-unused-vars
  const [success, _setSuccess] = useState<string | null>(null) // eslint-disable-line @typescript-eslint/no-unused-vars
  const [formData, setFormData] = useState<SponsorFormData>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    companyDescription: '',
    sponsorshipTier: '',
    termsAccepted: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const supabase = createClient()

  const checkAuthentication = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/auth/login')
        return
      }

      // Check if user is already a sponsor via API
      const response = await fetch('/api/sponsor/role-check')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        // For other errors, allow the user to proceed (they may not be a sponsor yet)
        return
      }

      const data = await response.json()
      
      if (data.isSponsor) {
        router.push('/sponsor/dashboard')
        return
      }
    } catch (err) {
      console.error('Error checking authentication:', err)
      router.push('/auth/login')
    }
  }, [supabase, router])

  useEffect(() => {
    checkAuthentication()
  }, [checkAuthentication])

  const handleInputChange = (field: keyof SponsorFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.companyName.trim()) {
      newErrors.companyName = t('validation.companyNameRequired')
    }

    if (!formData.contactPerson.trim()) {
      newErrors.contactPerson = t('validation.contactPersonRequired')
    }

    if (!formData.email.trim()) {
      newErrors.email = t('validation.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('validation.emailInvalid')
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('validation.phoneRequired')
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone)) {
      newErrors.phone = t('validation.phoneInvalid')
    }

    if (!formData.website.trim()) {
      newErrors.website = t('validation.websiteRequired')
    } else if (!/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = t('validation.websiteInvalid')
    }

    if (!formData.companyDescription.trim()) {
      newErrors.companyDescription = t('validation.companyDescriptionRequired')
    }

    if (!formData.sponsorshipTier) {
      newErrors.sponsorshipTier = t('validation.sponsorshipTierRequired')
    }

    if (!formData.termsAccepted) {
      newErrors.termsAccepted = t('validation.termsRequired') || 'You must accept the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setSubmitting(true)
      _setError(null) // eslint-disable-line @typescript-eslint/no-unused-vars
      _setSuccess(null) // eslint-disable-line @typescript-eslint/no-unused-vars

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('User not authenticated')
      }

      // Submit application via API
      const response = await fetch('/api/sponsor/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyName: formData.companyName.trim(),
          contactPerson: formData.contactPerson.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          website: formData.website.trim(),
          companyDescription: formData.companyDescription.trim(),
          sponsorshipTier: formData.sponsorshipTier
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit application')
      }

      _setSuccess(t('applicationSubmittedSuccessfully')) // eslint-disable-line @typescript-eslint/no-unused-vars
      
      // Redirect to sponsor dashboard after a short delay
      setTimeout(() => {
        router.push('/sponsor/dashboard')
      }, 2000)
    } catch (err) {
      console.error('Error submitting application:', err)
      _setError(t('applicationSubmissionError')) // eslint-disable-line @typescript-eslint/no-unused-vars
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    router.back()
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
            {t('sponsorApplication')}
          </h1>
          <p className="text-gray-600">
            {t('sponsorApplicationDescription')}
          </p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              {t('companyInformation')}
            </CardTitle>
            <CardDescription className="text-gray-700">
              {t('companyInformationDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('companyName')} *
                </label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder={t('companyNamePlaceholder')}
                  className={errors.companyName ? 'border-red-500' : ''}
                />
                {errors.companyName && (
                  <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('contactPerson')} *
                </label>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  placeholder={t('contactPersonPlaceholder')}
                  className={errors.contactPerson ? 'border-red-500' : ''}
                />
                {errors.contactPerson && (
                  <p className="text-red-500 text-sm mt-1">{errors.contactPerson}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('email')} *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('phone')} *
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder={t('phonePlaceholder')}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('website')} *
                </label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder={t('websitePlaceholder')}
                  className={errors.website ? 'border-red-500' : ''}
                />
                {errors.website && (
                  <p className="text-red-500 text-sm mt-1">{errors.website}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('sponsorshipTier')} *
                </label>
                <Select
                  value={formData.sponsorshipTier}
                  onValueChange={(value) => handleInputChange('sponsorshipTier', value)}
                >
                  <SelectTrigger className={errors.sponsorshipTier ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('selectSponsorshipTier')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">{t('bronzeTier')}</SelectItem>
                    <SelectItem value="silver">{t('silverTier')}</SelectItem>
                    <SelectItem value="gold">{t('goldTier')}</SelectItem>
                    <SelectItem value="platinum">{t('platinumTier')}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.sponsorshipTier && (
                  <p className="text-red-500 text-sm mt-1">{errors.sponsorshipTier}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('companyDescription')} *
              </label>
              <Textarea
                value={formData.companyDescription}
                onChange={(e) => handleInputChange('companyDescription', e.target.value)}
                placeholder={t('companyDescriptionPlaceholder')}
                rows={4}
                className={errors.companyDescription ? 'border-red-500' : ''}
              />
              {errors.companyDescription && (
                <p className="text-red-500 text-sm mt-1">{errors.companyDescription}</p>
              )}
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => handleInputChange('termsAccepted', checked as boolean)}
                className={errors.termsAccepted ? 'border-red-500' : ''}
              />
              <div className="space-y-1">
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('termsAndConditions')} *
                </label>
                <p className="text-sm text-gray-500">
                  {t('termsDescription')}
                </p>
                {errors.termsAccepted && (
                  <p className="text-red-500 text-sm">{errors.termsAccepted}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mt-8">
          <Button variant="outline" onClick={handleBack}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('submitting') : t('submitApplication')}
          </Button>
        </div>
      </div>
    </div>
  )
} 