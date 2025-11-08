'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useEnhancedToast } from '@/hooks/use-enhanced-toast'
import CaseFileManager, { CaseFile, FileCategory } from '@/components/cases/CaseFileManager'
import { ArrowLeft, Save, AlertCircle, CheckCircle, FileText, Trash2, AlertTriangle } from 'lucide-react'

interface Case {
  id: string
  title: string | null
  title_en: string | null
  title_ar: string | null
  description: string | null
  description_en: string | null
  description_ar: string | null
  target_amount: number | null
  current_amount: number | null
  status: string | null
  priority: string | null
  category: string | null // Category name for UI
  category_id: string | null // Category ID for database
  location: string | null
  beneficiary_name: string | null
  beneficiary_age?: number | null
  beneficiary_condition?: string | null
  created_at: string
  updated_at: string
  created_by: string
  supporting_documents?: string // JSON string of CaseFile[]
  // Add computed fields for UI
  goal_amount?: number | null
  urgency_level?: string | null
}

export default function CaseEditPage() {
  const t = useTranslations('cases')
  const tProfile = useTranslations('profile')
  const router = useRouter()
  const params = useParams()
  const [case_, setCase] = useState<Case | null>(null)
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([])
  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [approvedContributionsTotal, setApprovedContributionsTotal] = useState(0)
  const [totalContributions, setTotalContributions] = useState(0)
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])
  
  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    step: 'confirm' | 'final'
  }>({
    isOpen: false,
    step: 'confirm'
  })
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const { toast } = useEnhancedToast()

  const supabase = createClient()
  const caseId = params.id as string

  const fetchApprovedContributionsTotal = useCallback(async () => {
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
  }, [caseId, supabase])

  const fetchTotalContributions = useCallback(async () => {
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
  }, [caseId, supabase])

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('case_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching categories:', error)
        return
      }

      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [supabase])


  const fetchCase = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('cases')
        .select(`
          id,
          title_en,
          title_ar,
          description_en,
          description_ar,
          target_amount,
          current_amount,
          status,
          priority,
          category_id,
          location,
          beneficiary_name,
          beneficiary_contact,
          created_at,
          updated_at,
          created_by,
          supporting_documents,
          case_categories(name)
        `)
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

      // Map database fields to UI fields
      const mappedCase = {
        ...data,
        title: data.title_en || data.title_ar || '', // Fallback for compatibility
        description: data.description_en || data.description_ar || '', // Fallback for compatibility
        goal_amount: data.target_amount,
        urgency_level: data.priority,
        category: (data.case_categories as { name: string } | null)?.name || null
      }
      
      setCase(mappedCase)
      
      // Fetch all files from unified case_files table
      const { data: filesData, error: filesError } = await supabase
        .from('case_files')
        .select('*')
        .eq('case_id', caseId)
        .order('display_order', { ascending: true })

      if (filesError) {
        console.error('Error fetching case files:', filesError)
        setCaseFiles([])
      } else {
        const files: CaseFile[] = (filesData || []).map((file) => ({
          id: file.id,
          name: file.filename || file.original_filename || 'unnamed',
          originalName: file.filename || file.original_filename || 'unnamed',
          url: file.file_url,
          path: file.file_path,
          size: file.file_size || 0,
          type: file.file_type || 'application/octet-stream',
          category: file.category as FileCategory || 'other',
          description: file.description || '',
          isPublic: file.is_public || false,
          uploadedAt: file.created_at,
          uploadedBy: file.uploaded_by || '',
          metadata: {
            isPrimary: file.is_primary || false,
            displayOrder: file.display_order || 0
          }
        }))
        setCaseFiles(files)
      }
    } catch (error) {
      console.error('Error fetching case:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [caseId, supabase])

  useEffect(() => {
    fetchCase()
    fetchApprovedContributionsTotal()
    fetchTotalContributions()
    fetchCategories()
  }, [fetchCase, fetchApprovedContributionsTotal, fetchTotalContributions, fetchCategories])



  const handleInputChange = (field: keyof Case | string, value: string | number) => {
    if (!case_) return
    
    setCase(prev => {
      if (!prev) return null
      
      // Handle field mapping for UI compatibility
      let updateObject: Record<string, string | number> = { [field]: value }
      
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

      // Get category ID from category name if category is provided
      let categoryId = case_.category_id
      console.log('🔍 Category Debug:', {
        currentCategory: case_.category,
        currentCategoryId: case_.category_id,
        willLookup: case_.category && !categoryId
      })
      
      if (case_.category && !categoryId) {
        console.log('🔍 Looking up category ID for:', case_.category)
        const { data: categoryData, error: categoryError } = await supabase
          .from('case_categories')
          .select('id')
          .eq('name', case_.category)
          .single()
        
        console.log('🔍 Category lookup result:', { categoryData, categoryError })
        
        if (categoryData) {
          categoryId = categoryData.id
          console.log('✅ Found category ID:', categoryId)
        } else {
          console.log('❌ No category found for name:', case_.category)
        }
      }

      const updateData: Record<string, string | number | null> = {
        title_en: case_.title_en || '',
        title_ar: case_.title_ar || '',
        description_en: case_.description_en || '',
        description_ar: case_.description_ar || '',
        target_amount: case_.target_amount || case_.goal_amount || 0,
        status: case_.status || 'draft',
        priority: case_.priority || case_.urgency_level || 'medium',
        location: case_.location || '',
        beneficiary_name: case_.beneficiary_name || '',
        supporting_documents: case_.supporting_documents || null,
        updated_at: new Date().toISOString()
      }

      // Add category_id if we have one
      if (categoryId) {
        updateData.category_id = categoryId
        console.log('✅ Adding category_id to update:', categoryId)
      } else {
        console.log('❌ No category_id to add to update')
      }

      console.log('📝 Updating case with data:', updateData)

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

  // Delete handlers
  const handleDeleteClick = () => {
    setDeleteDialog({
      isOpen: true,
      step: 'confirm'
    })
  }

  const handleDeleteConfirm = () => {
    if (deleteDialog.step === 'confirm') {
      setDeleteDialog(prev => ({ ...prev, step: 'final' }))
      setDeleteConfirmationText('') // Reset confirmation text
    } else {
      // Check if user typed exactly "DELETE"
      if (deleteConfirmationText !== 'DELETE') {
        toast.error(
          "Invalid Confirmation",
          "You must type exactly 'DELETE' to confirm deletion."
        )
        return
      }
      performDelete()
    }
  }

  const performDelete = async () => {
    try {
      setDeleting(true)
      
      const response = await fetch(`/api/cases/${caseId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      // Check if deletion was blocked by business logic (contribution protection)
      if (result.success === false && result.blocked === true && result.reason === 'contribution_protection') {
        // This is expected business logic, not an error
        toast.error(
          "Cannot Delete Case with Contributions",
          result.message || "This case has received contributions and cannot be deleted for data integrity. Please contact an administrator if you need to remove this case."
        )
        
        // Close dialog without treating as error
        setDeleteDialog({
          isOpen: false,
          step: 'confirm'
        })
        return
      }

      // Check for actual errors
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete case')
      }

      // Close dialog
      setDeleteDialog({
        isOpen: false,
        step: 'confirm'
      })

      // Show success message
      toast.success(
        "Case Deleted Successfully",
        `Case "${case_?.title_en || case_?.title_ar || case_?.title || 'Untitled'}" and all related data have been permanently deleted.`
      )

      // Redirect to cases list after successful deletion
      setTimeout(() => {
        router.push(`/${params.locale}/cases`)
      }, 2000)

    } catch (error) {
      // Only log actual errors, not business logic responses
      console.error('Unexpected error deleting case:', error)
      
      // Show error message for unexpected errors only
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete case'
      
      toast.error(
        "Delete Failed",
        errorMessage
      )
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      step: 'confirm'
    })
    setDeleteConfirmationText('') // Reset confirmation text
  }

  // Memoized callback to prevent infinite loops
  const handleFilesChange = useCallback((updatedFiles: CaseFile[]) => {
    setCaseFiles(updatedFiles)
    // Update the case supporting_documents field when files change
    if (case_) {
      setCase(prev => prev ? {
        ...prev,
        supporting_documents: JSON.stringify(updatedFiles)
      } : null)
    }
  }, [case_])

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
    <PermissionGuard permissions={["update:cases"]} fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to edit cases.</p>
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
                  {t('backToCase')}
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">{t('editCase')}</h1>
                <p className="text-gray-600 mt-2">{t('updateCaseInformation')}</p>
              </div>
              <div className="flex items-center gap-3">
                {success && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">{t('savedSuccessfully')}</span>
                  </div>
                )}
                <Button 
                  onClick={handleDeleteClick}
                  variant="outline"
                  className="border-2 border-red-200 hover:border-red-500 hover:bg-red-50 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Case
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? t('saving') : tProfile('saveChanges')}
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

          {/* Edit Form with Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>{t('editCase')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'details' | 'files')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {t('caseDetails')}
                  </TabsTrigger>
                  <TabsTrigger value="files" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('files.files')} ({caseFiles.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-6">
                  <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t('basicInformation')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bilingual Title Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('caseTitle')} (English)
                    </label>
                    <Input
                      value={case_.title_en || ''}
                      onChange={(e) => handleInputChange('title_en', e.target.value)}
                      placeholder="Enter case title in English"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('caseTitle')} (Arabic)
                    </label>
                    <Input
                      value={case_.title_ar || ''}
                      onChange={(e) => handleInputChange('title_ar', e.target.value)}
                      placeholder="أدخل عنوان الحالة بالعربية"
                      dir="rtl"
                    />
                  </div>
                </div>

                {/* Bilingual Description Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('description')} (English)
                    </label>
                    <Textarea
                      value={case_.description_en || ''}
                      onChange={(e) => handleInputChange('description_en', e.target.value)}
                      placeholder="Enter case description in English"
                      rows={4}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('description')} (Arabic)
                    </label>
                    <Textarea
                      value={case_.description_ar || ''}
                      onChange={(e) => handleInputChange('description_ar', e.target.value)}
                      placeholder="أدخل وصف الحالة بالعربية"
                      rows={4}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('goalAmountEGP')}
                    </label>
                    <Input
                      type="number"
                      value={case_.goal_amount ? case_.goal_amount.toString() : ''}
                      onChange={(e) => handleInputChange('goal_amount', parseFloat(e.target.value) || 0)}
                      placeholder={t('goalAmountPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('currentAmountEGP')}
                    </label>
                    <Input
                      type="number"
                      value={approvedContributionsTotal.toString()}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('automaticallyCalculated')}</p>
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
                <CardTitle>{t('caseDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('status')}
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
                      {t('category')}
                    </label>
                    <select
                      value={case_.category || ''}
                      onChange={(e) => handleInputChange('category', e.target.value as string)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('notSpecified')}</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('priorityLevel')}
                    </label>
                    <select
                      value={case_.priority || ''}
                      onChange={(e) => handleInputChange('priority', e.target.value as string)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Not specified</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('location')}
                  </label>
                  <Input
                    value={case_.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder={t('locationPlaceholder')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Beneficiary Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t('beneficiaryInformation')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('beneficiaryName')}
                    </label>
                    <Input
                      value={case_.beneficiary_name || ''}
                      onChange={(e) => handleInputChange('beneficiary_name', e.target.value)}
                      placeholder={t('enterBeneficiaryName')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('ageOptional')}
                    </label>
                    <Input
                      type="number"
                      value={case_.beneficiary_age?.toString() || ''}
                      onChange={(e) => handleInputChange('beneficiary_age', parseInt(e.target.value) || 0)}
                      placeholder={t('enterAge')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('medicalConditionOptional')}
                  </label>
                  <Textarea
                    value={case_.beneficiary_condition || ''}
                    onChange={(e) => handleInputChange('beneficiary_condition', e.target.value || '')}
                    placeholder={t('beneficiaryConditionPlaceholder')}
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
                </TabsContent>

                <TabsContent value="files" className="mt-6">
                  <CaseFileManager
                    caseId={caseId}
                    files={caseFiles}
                    canEdit={true}
                    onFilesChange={handleFilesChange}
                    viewMode="grid"
                    showUpload={true}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={handleDeleteCancel}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {deleteDialog.step === 'confirm' ? 'Confirm Case Deletion' : 'Final Confirmation'}
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                {deleteDialog.step === 'confirm' ? (
                  <>
                    <p>Are you sure you want to delete the case <strong>&quot;{case_?.title_en || case_?.title_ar || case_?.title || 'Untitled'}&quot;</strong>?</p>
                    <p className="mt-2">This action will permanently delete:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                      <li>The case and all its data</li>
                      <li>All uploaded files and images</li>
                      <li>All case updates and comments</li>
                      <li>All related records</li>
                    </ul>
                    <p className="mt-4">
                      <strong className="text-red-600">This action cannot be undone!</strong>
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <strong className="text-red-600">FINAL WARNING!</strong>
                    </p>
                    <p className="mt-2">
                      You are about to permanently delete case <strong>&quot;{case_?.title_en || case_?.title_ar || case_?.title || 'Untitled'}&quot;</strong> and ALL its related data.
                    </p>
                    <p className="mt-2">
                      <strong className="text-red-600">This action cannot be undone!</strong>
                    </p>
                    <p className="mt-2">
                      Type <strong>DELETE</strong> in the box below to confirm:
                    </p>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          
          {deleteDialog.step === 'final' && (
            <div className="py-4">
              <Input
                placeholder="Type DELETE to confirm"
                className="w-full"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
              />
              {deleteConfirmationText && deleteConfirmationText !== 'DELETE' && (
                <p className="text-sm text-red-600 mt-2">
                  You must type exactly &quot;DELETE&quot; to confirm
                </p>
              )}
              {deleteConfirmationText === 'DELETE' && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Confirmation text is correct
                </p>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting || (deleteDialog.step === 'final' && deleteConfirmationText !== 'DELETE')}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : deleteDialog.step === 'confirm' ? 'Continue' : 'Delete Forever'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGuard>
  )
}
