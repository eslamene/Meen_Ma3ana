'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Repeat, AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface RecurringContributionFormProps {
  caseId?: string
  projectId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface FormData {
  amount: string
  frequency: string
  startDate: string
  endDate: string
  paymentMethod: string
  autoProcess: boolean
  notes: string
}

export default function RecurringContributionForm({ 
  caseId, 
  projectId, 
  onSuccess, 
  onCancel 
}: RecurringContributionFormProps) {
  const t = useTranslations('contributions')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    amount: '',
    frequency: 'monthly',
    startDate: '',
    endDate: '',
    paymentMethod: 'bank_transfer',
    autoProcess: true,
    notes: ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError('Please log in to set up recurring contributions')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/recurring-contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId: caseId || null,
          projectId: projectId || null,
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          paymentMethod: formData.paymentMethod,
          autoProcess: formData.autoProcess,
          notes: formData.notes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set up recurring contribution')
      }

      setSuccess(true)
      toast.success(t('recurringSetupSuccess') || 'Recurring contribution set up successfully')
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to set up recurring contribution'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <h3 className="text-lg font-semibold">{t('recurringSetupSuccess')}</h3>
          </div>
          <p className="mt-2 text-gray-600">
            {t('recurringSetupSuccessMessage')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Repeat className="h-5 w-5" />
          <span>{t('setupRecurringContribution')}</span>
        </CardTitle>
        <CardDescription>
          {t('recurringContributionDescription')}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">{t('amount')}</Label>
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
              <Label htmlFor="frequency">{t('frequency')}</Label>
              <Select 
                value={formData.frequency} 
                onValueChange={(value) => handleInputChange('frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t('weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('monthly')}</SelectItem>
                  <SelectItem value="quarterly">{t('quarterly')}</SelectItem>
                  <SelectItem value="yearly">{t('yearly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <Label htmlFor="endDate">{t('endDate')} ({t('optional')})</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="paymentMethod">{t('paymentMethod')}</Label>
            <Select 
              value={formData.paymentMethod} 
              onValueChange={(value) => handleInputChange('paymentMethod', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">{t('bankTransfer')}</SelectItem>
                <SelectItem value="credit_card">{t('creditCard')}</SelectItem>
                <SelectItem value="paypal">{t('paypal')}</SelectItem>
                <SelectItem value="other">{t('other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoProcess"
              checked={formData.autoProcess}
              onCheckedChange={(checked) => handleInputChange('autoProcess', checked as boolean)}
            />
            <Label htmlFor="autoProcess">{t('autoProcessContributions')}</Label>
          </div>

          <div>
            <Label htmlFor="notes">{t('notes')} ({t('optional')})</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder={t('notesPlaceholder')}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {t('cancel')}
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? t('settingUp') : t('setupRecurringContribution')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 