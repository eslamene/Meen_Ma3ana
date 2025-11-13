'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface ProjectFormData {
  name: string
  description: string
  category: string
  targetAmount: string
  cycleDuration: string
  cycleDurationDays: string
  totalCycles: string
  autoProgress: boolean
}

export default function CreateProjectPage() {
  const t = useTranslations('projects')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const { containerVariant } = useLayout()

  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    category: '',
    targetAmount: '',
    cycleDuration: '',
    cycleDurationDays: '',
    totalCycles: '',
    autoProgress: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: keyof ProjectFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    } else if (formData.name.length < 5) {
      newErrors.name = 'Project name must be at least 5 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required'
    } else if (formData.description.length < 20) {
      newErrors.description = 'Project description must be at least 20 characters'
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category'
    }

    if (!formData.targetAmount) {
      newErrors.targetAmount = 'Target amount is required'
    } else {
      const amount = parseFloat(formData.targetAmount)
      if (isNaN(amount) || amount <= 0) {
        newErrors.targetAmount = 'Target amount must be a positive number'
      }
    }

    if (!formData.cycleDuration) {
      newErrors.cycleDuration = 'Please select a cycle duration'
    }

    if (formData.cycleDuration === 'custom' && !formData.cycleDurationDays) {
      newErrors.cycleDurationDays = 'Please specify the number of days'
    }

    if (formData.totalCycles && parseInt(formData.totalCycles) <= 0) {
      newErrors.totalCycles = 'Total cycles must be a positive number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          targetAmount: parseFloat(formData.targetAmount),
          cycleDurationDays: formData.cycleDurationDays ? parseInt(formData.cycleDurationDays) : null,
          totalCycles: formData.totalCycles ? parseInt(formData.totalCycles) : null,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        router.push(`/${locale}/projects/${result.id}`)
      } else {
        const error = await response.json()
        setErrors({ submit: error.message || 'Failed to create project' })
      }
    } catch (error) {
      setErrors({ submit: 'An error occurred while creating the project' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const cycleDurationOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom (days)' },
  ]

  const categoryOptions = [
    { value: 'education', label: 'Education' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'housing', label: 'Housing' },
    { value: 'food', label: 'Food Security' },
    { value: 'emergency', label: 'Emergency Relief' },
    { value: 'community', label: 'Community Development' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Container variant={containerVariant} className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
        <p className="text-gray-600">
          Set up a recurring project with funding cycles to support ongoing charitable initiatives.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter project name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the project and its goals"
                  rows={4}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
              </div>

              <div>
                <Label htmlFor="targetAmount">Target Amount *</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => handleInputChange('targetAmount', e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className={errors.targetAmount ? 'border-red-500' : ''}
                />
                {errors.targetAmount && <p className="text-red-500 text-sm mt-1">{errors.targetAmount}</p>}
              </div>
            </div>

            {/* Cycle Configuration */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Cycle Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="cycleDuration">Cycle Duration *</Label>
                  <Select value={formData.cycleDuration} onValueChange={(value) => handleInputChange('cycleDuration', value)}>
                    <SelectTrigger className={errors.cycleDuration ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select cycle duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {cycleDurationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.cycleDuration && <p className="text-red-500 text-sm mt-1">{errors.cycleDuration}</p>}
                </div>

                {formData.cycleDuration === 'custom' && (
                  <div>
                    <Label htmlFor="cycleDurationDays">Duration (days) *</Label>
                    <Input
                      id="cycleDurationDays"
                      type="number"
                      value={formData.cycleDurationDays}
                      onChange={(e) => handleInputChange('cycleDurationDays', e.target.value)}
                      placeholder="30"
                      min="1"
                      className={errors.cycleDurationDays ? 'border-red-500' : ''}
                    />
                    {errors.cycleDurationDays && <p className="text-red-500 text-sm mt-1">{errors.cycleDurationDays}</p>}
                  </div>
                )}

                <div>
                  <Label htmlFor="totalCycles">Total Cycles (Optional)</Label>
                  <Input
                    id="totalCycles"
                    type="number"
                    value={formData.totalCycles}
                    onChange={(e) => handleInputChange('totalCycles', e.target.value)}
                    placeholder="Leave empty for indefinite"
                    min="1"
                    className={errors.totalCycles ? 'border-red-500' : ''}
                  />
                  <p className="text-sm text-gray-500 mt-1">Leave empty for indefinite cycles</p>
                  {errors.totalCycles && <p className="text-red-500 text-sm mt-1">{errors.totalCycles}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoProgress"
                    checked={formData.autoProgress}
                    onCheckedChange={(checked) => handleInputChange('autoProgress', checked as boolean)}
                  />
                  <Label htmlFor="autoProgress">Auto-progress cycles</Label>
                </div>
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/${locale}/projects`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Project...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </Container>
    </div>
  )
} 