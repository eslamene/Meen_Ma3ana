'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/lib/hooks/usePermissions'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react'

interface Case {
  id: string
  title: string | null
  description: string | null
  target_amount: number | null
  current_amount: number | null
  status: string | null
  priority: string | null
  location: string | null
  beneficiary_name: string | null
  created_at: string
  updated_at: string
  created_by: string
  // Add computed fields for UI
  goal_amount?: number | null
  urgency_level?: string | null
}

export default function CaseEditPage() {
  const t = useTranslations('cases')
  const router = useRouter()
  const params = useParams()
  const { canEditCase } = usePermissions()
  const [case_, setCase] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [approvedContributionsTotal, setApprovedContributionsTotal] = useState(0)
  const [totalContributions, setTotalContributions] = useState(0)

  const supabase = createClient()
  const caseId = params.id as string

  useEffect(() => {
    fetchCase()
    fetchApprovedContributionsTotal()
    fetchTotalContributions()
  }, [caseId])

  const fetchApprovedContributionsTotal = async () => {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          amount,
          contribution_approval_status!contribution_id(status)
        `)
        .eq('case_id', caseId)

      if (error) {
        console.error('Error fetching contributions:', error)
        return
      }

      // Filter to only include approved contributions and sum them
      const approvedTotal = (data || []).reduce((sum, contribution) => {
        const approvalStatuses = contribution.contribution_approval_status || []
        const latestStatus = approvalStatuses.length > 0 ? approvalStatuses[0].status : 'none'
        
        if (latestStatus === 'approved') {
          return sum + parseFloat(contribution.amount || 0)
        }
        return sum
      }, 0)

      setApprovedContributionsTotal(approvedTotal)
    } catch (error) {
      console.error('Error calculating approved contributions:', error)
    }
  }

  const fetchTotalContributions = async () => {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select('amount')
        .eq('case_id', caseId)

      if (error) {
        console.error('Error fetching total contributions:', error)
        return
      }

      // Calculate total of ALL contributions (including pending/rejected)
      const total = (data || []).reduce((sum, contribution) => {
        return sum + parseFloat(contribution.amount || 0)
      }, 0)

      setTotalContributions(total)
    } catch (error) {
      console.error('Error calculating total contributions:', error)
    }
  }

  const fetchCase = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single()

      if (error) {
        console.error('Error fetching case:', error)
        setError('Failed to load case details')
        return
      }

      if (!data) {
        setError('Case not found')
        return
      }

      console.log('Fetched case data:', data)
      
      // Map database fields to UI fields
      const mappedCase = {
        ...data,
        goal_amount: data.target_amount,
        urgency_level: data.priority
      }
      
      console.log('Mapped case data:', mappedCase)
      setCase(mappedCase)
    } catch (error) {
      console.error('Error fetching case:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof Case | string, value: string | number) => {
    if (!case_) return
    
    setCase(prev => {
      if (!prev) return null
      
      // Handle field mapping for UI compatibility
      let updateObject: any = { [field]: value }
      
      // Map UI fields to database fields
      if (field === 'goal_amount') {
        updateObject = { 
          goal_amount: value, 
          target_amount: value 
        }
      } else if (field === 'urgency_level') {
        updateObject = { 
          urgency_level: value, 
          priority: value 
        }
      }
      
      return {
        ...prev,
        ...updateObject
      }
    })
  }

  const handleSave = async () => {
    if (!case_) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const updateData = {
        title: case_.title || '',
        description: case_.description || '',
        target_amount: case_.target_amount || case_.goal_amount || 0,
        status: case_.status || 'draft',
        priority: case_.priority || case_.urgency_level || 'medium',
        location: case_.location || '',
        beneficiary_name: case_.beneficiary_name || '',
        updated_at: new Date().toISOString()
      }

      console.log('Updating case with data:', updateData)

      const { error } = await supabase
        .from('cases')
        .update(updateData)
        .eq('id', caseId)

      if (error) {
        console.error('Error updating case:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        setError(`Failed to update case: ${error.message || 'Unknown error'}`)
        return
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error updating case:', error)
      console.error('Catch block error details:', JSON.stringify(error, null, 2))
      setError(`An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    router.push(`/${params.locale}/cases/${caseId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading case details...</p>
        </div>
      </div>
    )
  }

  if (error && !case_) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Case</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!case_) {
    return null
  }

  return (
    <PermissionGuard permission="cases:update" fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don't have permission to edit cases.</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <Button onClick={handleBack} variant="ghost" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Case
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">Edit Case</h1>
                <p className="text-gray-600 mt-2">Update case information and details</p>
              </div>
              <div className="flex items-center gap-3">
                {success && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Saved successfully!</span>
                  </div>
                )}
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Form */}
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Case Title
                  </label>
                  <Input
                    value={case_.title || ''}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter case title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Textarea
                    value={case_.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe the case details"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Goal Amount (EGP)
                    </label>
                    <Input
                      type="number"
                      value={case_.goal_amount ? case_.goal_amount.toString() : ''}
                      onChange={(e) => handleInputChange('goal_amount', parseFloat(e.target.value) || 0)}
                      placeholder="Enter goal amount"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Amount (EGP)
                    </label>
                    <Input
                      type="number"
                      value={approvedContributionsTotal.toString()}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">This is automatically calculated from approved contributions only</p>
                    {totalContributions !== approvedContributionsTotal && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Total contributions: {totalContributions} EGP (includes pending/rejected)
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Case Details */}
            <Card>
              <CardHeader>
                <CardTitle>Case Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={case_.status || ''}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={case_.category || ''}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="medical">Medical</option>
                      <option value="education">Education</option>
                      <option value="emergency">Emergency</option>
                      <option value="housing">Housing</option>
                      <option value="food">Food</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority Level
                    </label>
                    <select
                      value={case_.priority || ''}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <Input
                    value={case_.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Enter location"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Beneficiary Information */}
            <Card>
              <CardHeader>
                <CardTitle>Beneficiary Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beneficiary Name
                    </label>
                    <Input
                      value={case_.beneficiary_name || ''}
                      onChange={(e) => handleInputChange('beneficiary_name', e.target.value)}
                      placeholder="Enter beneficiary name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age (Optional)
                    </label>
                    <Input
                      type="number"
                      value={case_.beneficiary_age?.toString() || ''}
                      onChange={(e) => handleInputChange('beneficiary_age', parseInt(e.target.value) || undefined)}
                      placeholder="Enter age"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Condition / Situation (Optional)
                  </label>
                  <Textarea
                    value={case_.beneficiary_condition || ''}
                    onChange={(e) => handleInputChange('beneficiary_condition', e.target.value || undefined)}
                    placeholder="Describe the beneficiary's condition or situation"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Case Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Case Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Case ID:</span> {case_.id}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {new Date(case_.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span> {new Date(case_.updated_at).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Progress:</span> {
                      (case_.target_amount && case_.target_amount > 0)
                        ? `${Math.round((approvedContributionsTotal / case_.target_amount) * 100)}%`
                        : '0%'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
