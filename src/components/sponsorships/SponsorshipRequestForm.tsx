'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, Building2, Calendar, DollarSign } from 'lucide-react'

interface Case {
  id: string
  title: string
  description: string
  target_amount: number
  current_amount: number
  status: string
  category: string
}

interface SponsorshipRequestFormProps {
  caseId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface FormData {
  caseId: string
  amount: string
  commitmentType: string
  duration: string
  startDate: string
  endDate: string
  terms: string
  contactPerson: string
  contactEmail: string
  contactPhone: string
  companyName: string
  companyDescription: string
  agreedToTerms: boolean
}

export default function SponsorshipRequestForm({ 
  caseId, 
  onSuccess, 
  onCancel 
}: SponsorshipRequestFormProps) {
  const t = useTranslations('sponsorships')
  const [user, setUser] = useState<User | null>(null)
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    caseId: caseId || '',
    amount: '',
    commitmentType: 'full',
    duration: '3',
    startDate: '',
    endDate: '',
    terms: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    companyName: '',
    companyDescription: '',
    agreedToTerms: false
  })

  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error getting user:', error)
        return
      }
      setUser(user)
    }

    getUser()
  }, [supabase.auth])

  useEffect(() => {
    fetchCases()
  }, [])

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('id, title, description, target_amount, current_amount, status, category_id')
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (error) throw error
      // Map the data to match the Case interface
      const mappedCases = (data || []).map((caseItem: any) => ({
        id: caseItem.id,
        title: caseItem.title,
        description: caseItem.description,
        target_amount: caseItem.target_amount,
        current_amount: caseItem.current_amount,
        status: caseItem.status,
        category: caseItem.category_id || '', // Map category_id to category
        category_id: caseItem.category_id
      }))
      setCases(mappedCases)
    } catch (err: any) {
      console.error('Error fetching cases:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError('Please log in to submit a sponsorship request')
      return
    }

    if (!formData.agreedToTerms) {
      setError('Please agree to the terms and conditions')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Calculate end date based on duration
      const startDate = new Date(formData.startDate)
      const endDate = new Date(startDate)
      endDate.setMonth(startDate.getMonth() + parseInt(formData.duration))

      const { error: insertError } = await supabase
        .from('sponsorships')
        .insert({
          sponsor_id: user.id,
          case_id: formData.caseId,
          amount: parseFloat(formData.amount),
          status: 'pending',
          terms: formData.terms,
          start_date: formData.startDate,
          end_date: endDate.toISOString(),
        })

      if (insertError) {
        throw insertError
      }

      // Create notification for admins
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          type: 'sponsorship_request',
          recipient_id: '00000000-0000-0000-0000-000000000000', // Admin user ID
          title: 'New Sponsorship Request',
          message: `A new sponsorship request has been submitted for case: ${cases.find(c => c.id === formData.caseId)?.title}`,
          data: {
            caseId: formData.caseId,
            sponsorId: user.id,
            amount: formData.amount,
            commitmentType: formData.commitmentType
          }
        })

      if (notificationError) {
        console.error('Error creating notification:', notificationError)
      }

      setSuccess(true)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit sponsorship request')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const selectedCase = cases.find(c => c.id === formData.caseId)

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <h3 className="text-lg font-semibold">{t('requestSubmitted')}</h3>
          </div>
          <p className="mt-2 text-gray-600">
            {t('requestSubmittedMessage')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>{t('sponsorshipRequest')}</span>
        </CardTitle>
        <CardDescription className="text-gray-700">
          {t('sponsorshipRequestDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="caseId">{t('selectCase')}</Label>
            <Select 
              value={formData.caseId} 
              onValueChange={(value) => handleInputChange('caseId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectCasePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {cases.map((caseItem) => (
                  <SelectItem key={caseItem.id} value={caseItem.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{caseItem.title}</span>
                      <span className="text-sm text-gray-500">
                        {caseItem.category} • ${caseItem.target_amount.toLocaleString()}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCase && (
            <Card className="bg-gray-50">
              <CardContent className="pt-4">
                <h4 className="font-semibold mb-2">{selectedCase.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{selectedCase.description}</p>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4" />
                    <span>${selectedCase.current_amount.toLocaleString()} / ${selectedCase.target_amount.toLocaleString()}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{selectedCase.category}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">{t('sponsorshipAmount')}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="commitmentType">{t('commitmentType')}</Label>
              <Select 
                value={formData.commitmentType} 
                onValueChange={(value) => handleInputChange('commitmentType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">{t('fullSponsorship')}</SelectItem>
                  <SelectItem value="partial">{t('partialSponsorship')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">{t('sponsorshipDuration')}</Label>
              <Select 
                value={formData.duration} 
                onValueChange={(value) => handleInputChange('duration', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('oneMonth')}</SelectItem>
                  <SelectItem value="3">{t('threeMonths')}</SelectItem>
                  <SelectItem value="6">{t('sixMonths')}</SelectItem>
                  <SelectItem value="12">{t('oneYear')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">{t('startDate')}</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contactPerson">{t('contactPerson')}</Label>
            <Input
              id="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => handleInputChange('contactPerson', e.target.value)}
              placeholder={t('contactPersonPlaceholder')}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactEmail">{t('contactEmail')}</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder={t('contactEmailPlaceholder')}
                required
              />
            </div>

            <div>
              <Label htmlFor="contactPhone">{t('contactPhone')}</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                placeholder={t('contactPhonePlaceholder')}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="companyName">{t('companyName')}</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              placeholder={t('companyNamePlaceholder')}
              required
            />
          </div>

          <div>
            <Label htmlFor="companyDescription">{t('companyDescription')}</Label>
            <Textarea
              id="companyDescription"
              value={formData.companyDescription}
              onChange={(e) => handleInputChange('companyDescription', e.target.value)}
              placeholder={t('companyDescriptionPlaceholder')}
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="terms">{t('sponsorshipTerms')}</Label>
            <Textarea
              id="terms"
              value={formData.terms}
              onChange={(e) => handleInputChange('terms', e.target.value)}
              placeholder={t('sponsorshipTermsPlaceholder')}
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="agreedToTerms"
              checked={formData.agreedToTerms}
              onCheckedChange={(checked) => handleInputChange('agreedToTerms', checked as boolean)}
            />
            <Label htmlFor="agreedToTerms">{t('agreeToTerms')}</Label>
          </div>

          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {t('cancel')}
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? t('submitting') : t('submitRequest')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 