'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TabsContent } from '@/components/ui/tabs'
import { BrandedTabs } from '@/components/ui/branded-tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import CaseFileManager, { CaseFile, FileCategory } from '@/components/cases/CaseFileManager'
import BeneficiarySelector from '@/components/beneficiaries/BeneficiarySelector'
import { EditPageHeader, EditPageFooter } from '@/components/crud'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import DynamicIcon from '@/components/ui/dynamic-icon'
import type { Beneficiary } from '@/types/beneficiary'
import { getValidationSettings, type ValidationSettings } from '@/lib/utils/validationSettings'
import { 
  ArrowLeft, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  FileText, 
  Trash2, 
  AlertTriangle,
  Type,
  FileEdit,
  DollarSign,
  Target,
  TrendingUp,
  MapPin,
  User,
  Calendar,
  Tag,
  Flag,
  Info,
  Globe,
  Building2,
  Percent,
  Copy,
  Check,
  Clock
} from 'lucide-react'

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
  category_icon?: string | null // Category icon from database
  category_color?: string | null // Category color from database
  location: string | null
  beneficiary_name: string | null
  beneficiary_contact?: string | null
  beneficiary_age?: number | null
  beneficiary_condition?: string | null
  created_at: string
  updated_at: string
  created_by: string
  creator_name?: string | null
  creator_email?: string | null
  supporting_documents?: string // JSON string of CaseFile[]
  duration?: number | null // Duration in days for one-time cases
  type?: string | null // Case type: one-time or recurring
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [validationSettings, setValidationSettings] = useState<ValidationSettings | null>(null)
  const [success, setSuccess] = useState(false)
  const [approvedContributionsTotal, setApprovedContributionsTotal] = useState(0)
  const [totalContributions, setTotalContributions] = useState(0)
  const [categories, setCategories] = useState<Array<{id: string, name: string, name_en?: string, name_ar?: string, icon: string | null, color: string | null}>>([])
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null)
  
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
  const [copiedId, setCopiedId] = useState(false)
  const { containerVariant } = useLayout()

  const supabase = createClient()
  const caseId = params.id as string
  const locale = params.locale as string

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
      const response = await fetch('/api/categories')
      
      if (!response.ok) {
        console.error('Error fetching categories:', response.statusText)
        return
      }

      const result = await response.json()
      setCategories(result.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [])

  // Load validation settings
  useEffect(() => {
    const loadValidationSettings = async () => {
      try {
        const settings = await getValidationSettings()
        console.log('Validation settings loaded in edit form:', settings)
        setValidationSettings(settings)
      } catch (error) {
        console.error('Failed to load validation settings:', error)
      }
    }
    loadValidationSettings()
  }, [])

  // Re-validate when validation settings are loaded
  useEffect(() => {
    if (!validationSettings || !case_) return
    
    // Re-validate all fields when settings load to update error messages
    if (case_.title_en) {
      handleInputChange('title_en', case_.title_en)
    }
    if (case_.title_ar) {
      handleInputChange('title_ar', case_.title_ar)
    }
    if (case_.description_en) {
      handleInputChange('description_en', case_.description_en)
    }
    if (case_.description_ar) {
      handleInputChange('description_ar', case_.description_ar)
    }
    if (case_.target_amount) {
      handleInputChange('target_amount', case_.target_amount)
    }
    if (case_.duration) {
      handleInputChange('duration', case_.duration)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationSettings])

  const fetchCase = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/cases/${caseId}`)
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to load case details')
        return
      }

      const data = result.case

      if (!data) {
        setError('Case not found')
        return
      }

      // Fetch creator information separately (still using direct query for now as it's not critical)
      let creatorName: string | null = null
      let creatorEmail: string | null = null
      
      if (data.created_by) {
        try {
          const { data: creatorData, error: creatorError } = await supabase
            .from('users')
            .select('first_name, last_name, email')
            .eq('id', data.created_by)
            .single()
          
          if (!creatorError && creatorData) {
            // Combine first_name and last_name into full name
            const firstName = creatorData.first_name || ''
            const lastName = creatorData.last_name || ''
            const fullName = `${firstName} ${lastName}`.trim()
            creatorName = fullName || null
            creatorEmail = creatorData.email || null
          } else if (creatorError) {
            console.error('Error fetching creator info:', creatorError)
          }
        } catch (creatorErr) {
          console.error('Error fetching creator info:', creatorErr)
          // Don't fail the whole request if creator fetch fails
        }
      }

      // Map database fields to UI fields
      const categoryData = Array.isArray(data.case_categories) 
        ? data.case_categories[0] 
        : data.case_categories
      
      const mappedCase = {
        ...data,
        title: data.title_en || data.title_ar || '', // Fallback for compatibility
        description: data.description_en || data.description_ar || '', // Fallback for compatibility
        goal_amount: data.target_amount,
        urgency_level: data.priority,
        category: (() => {
          const cat = categoryData as { name: string; name_en?: string; name_ar?: string; icon: string | null; color: string | null } | null
          return cat?.name_en || cat?.name || null
        })(),
        category_icon: (categoryData as { name: string; name_en?: string; name_ar?: string; icon: string | null; color: string | null } | null)?.icon || null,
        category_color: (categoryData as { name: string; name_en?: string; name_ar?: string; icon: string | null; color: string | null } | null)?.color || null,
        creator_name: creatorName,
        creator_email: creatorEmail,
        beneficiary_contact: data.beneficiary_contact || null,
        duration: data.duration || null,
        type: data.type || 'one-time'
      }
      
      setCase(mappedCase)
      
      // Try to find beneficiary from database if beneficiary_name or beneficiary_contact exists
      if (data.beneficiary_name || data.beneficiary_contact) {
        try {
          let beneficiaryQuery = supabase
            .from('beneficiaries')
            .select('*')
            .limit(1)
          
          if (data.beneficiary_contact) {
            beneficiaryQuery = beneficiaryQuery.or(`mobile_number.eq.${data.beneficiary_contact},additional_mobile_number.eq.${data.beneficiary_contact}`)
          } else if (data.beneficiary_name) {
            beneficiaryQuery = beneficiaryQuery.ilike('name', `%${data.beneficiary_name}%`)
          }
          
          const { data: beneficiaryData, error: beneficiaryError } = await beneficiaryQuery.single()
          
          if (!beneficiaryError && beneficiaryData) {
            setSelectedBeneficiary(beneficiaryData as Beneficiary)
          }
        } catch (beneficiaryErr) {
          console.error('Error fetching beneficiary:', beneficiaryErr)
          // Don't fail the whole request if beneficiary fetch fails
        }
      }
      
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



  const handleInputChange = (field: keyof Case | string, value: string | number | null) => {
    if (!case_) return
    
    setCase(prev => {
      if (!prev) return null
      
      // Handle field mapping for UI compatibility
      let updateObject: Record<string, string | number | null> = { [field]: value }
      
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

    // Validation settings must be loaded before validation
    if (!validationSettings) {
      // Settings not loaded yet, skip validation for now
      // It will be validated when settings load via the useEffect
      return
    }

    const settings = validationSettings

    // Real-time validation
    const newErrors = { ...errors }
    
    // Clear existing error for this field
    if (newErrors[field]) {
      delete newErrors[field]
    }

    // Validate title fields
    if (field === 'title_en' || field === 'title_ar') {
      const titleEn = field === 'title_en' ? (value as string) : (case_?.title_en || '')
      const titleAr = field === 'title_ar' ? (value as string) : (case_?.title_ar || '')
      const finalTitle = titleEn || titleAr
      
      if (!finalTitle || !finalTitle.trim()) {
        newErrors.title = t('validation.titleRequired') || 'At least one language (English or Arabic) is required'
      } else if (finalTitle.trim().length < settings.caseTitleMinLength) {
        newErrors.title = t('validation.titleTooShort', { min: settings.caseTitleMinLength }) || `Title must be at least ${settings.caseTitleMinLength} characters`
      } else if (finalTitle.trim().length > settings.caseTitleMaxLength) {
        newErrors.title = t('validation.titleTooLong', { max: settings.caseTitleMaxLength }) || `Title must not exceed ${settings.caseTitleMaxLength} characters`
      }
      
      // Individual field errors
      if (field === 'title_en' && titleEn && titleEn.trim().length > 0 && titleEn.trim().length < settings.caseTitleMinLength) {
        newErrors.title_en = t('validation.titleTooShort', { min: settings.caseTitleMinLength }) || `Title must be at least ${settings.caseTitleMinLength} characters`
      }
      if (field === 'title_ar' && titleAr && titleAr.trim().length > 0 && titleAr.trim().length < settings.caseTitleMinLength) {
        newErrors.title_ar = t('validation.titleTooShort', { min: settings.caseTitleMinLength }) || `Title must be at least ${settings.caseTitleMinLength} characters`
      }
    }

    // Validate description fields
    if (field === 'description_en' || field === 'description_ar') {
      const descEn = field === 'description_en' ? (value as string) : (case_?.description_en || '')
      const descAr = field === 'description_ar' ? (value as string) : (case_?.description_ar || '')
      const finalDesc = descEn || descAr
      
      if (!finalDesc || !finalDesc.trim()) {
        newErrors.description = t('validation.descriptionRequired') || 'At least one language (English or Arabic) is required'
      } else if (finalDesc.trim().length < settings.caseDescriptionMinLength) {
        newErrors.description = t('validation.descriptionTooShort', { min: settings.caseDescriptionMinLength }) || `Description must be at least ${settings.caseDescriptionMinLength} characters`
      } else if (finalDesc.trim().length > settings.caseDescriptionMaxLength) {
        newErrors.description = t('validation.descriptionTooLong', { max: settings.caseDescriptionMaxLength }) || `Description must not exceed ${settings.caseDescriptionMaxLength} characters`
      }
      
      // Individual field errors
      if (field === 'description_en' && descEn && descEn.trim().length > 0 && descEn.trim().length < settings.caseDescriptionMinLength) {
        newErrors.description_en = t('validation.descriptionTooShort', { min: settings.caseDescriptionMinLength }) || `Description must be at least ${settings.caseDescriptionMinLength} characters`
      }
      if (field === 'description_ar' && descAr && descAr.trim().length > 0 && descAr.trim().length < settings.caseDescriptionMinLength) {
        newErrors.description_ar = t('validation.descriptionTooShort', { min: settings.caseDescriptionMinLength }) || `Description must be at least ${settings.caseDescriptionMinLength} characters`
      }
    }

    // Validate target amount
    if (field === 'target_amount' || field === 'goal_amount') {
      const amount = value as number
      if (!amount || amount <= 0) {
        newErrors.target_amount = t('validation.targetAmountInvalid') || 'Target amount must be greater than 0'
      } else if (amount > settings.caseTargetAmountMax) {
        newErrors.target_amount = t('validation.targetAmountTooHigh', { max: settings.caseTargetAmountMax.toLocaleString() }) || `Target amount must not exceed ${settings.caseTargetAmountMax.toLocaleString()} EGP`
      }
    }

    // Validate duration
    if (field === 'duration' && case_?.type === 'one-time') {
      const duration = value as number
      if (duration !== null && duration !== undefined) {
        if (duration <= 0) {
          newErrors.duration = t('validation.durationInvalid') || 'Duration must be greater than 0'
        } else if (duration > settings.caseDurationMax) {
          newErrors.duration = t('validation.durationTooLong', { max: settings.caseDurationMax }) || `Duration must not exceed ${settings.caseDurationMax} days`
        }
      }
    }

    setErrors(newErrors)
  }

  const validateForm = (): boolean => {
    if (!case_) return false
    
    // Validation settings must be loaded before validation
    if (!validationSettings) {
      console.warn('Validation settings not loaded yet, cannot validate form')
      toast.error('Error', { description: 'Validation settings are loading. Please wait a moment and try again.' })
      return false
    }

    const settings = validationSettings
    
    const newErrors: Record<string, string> = {}

    // Title validation - at least one language required
    const finalTitle = case_.title_en || case_.title_ar
    if (!finalTitle || !finalTitle.trim()) {
      newErrors.title = t('validation.titleRequired') || 'At least one language (English or Arabic) is required'
    } else if (finalTitle.trim().length < settings.caseTitleMinLength) {
      newErrors.title = t('validation.titleTooShort', { min: settings.caseTitleMinLength }) || `Title must be at least ${settings.caseTitleMinLength} characters`
    } else if (finalTitle.trim().length > settings.caseTitleMaxLength) {
      newErrors.title = t('validation.titleTooLong', { max: settings.caseTitleMaxLength }) || `Title must not exceed ${settings.caseTitleMaxLength} characters`
    }

    // Individual title field validation
    if (case_.title_en && case_.title_en.trim().length > 0 && case_.title_en.trim().length < settings.caseTitleMinLength) {
      newErrors.title_en = t('validation.titleTooShort', { min: settings.caseTitleMinLength }) || `Title must be at least ${settings.caseTitleMinLength} characters`
    }
    if (case_.title_ar && case_.title_ar.trim().length > 0 && case_.title_ar.trim().length < settings.caseTitleMinLength) {
      newErrors.title_ar = t('validation.titleTooShort', { min: settings.caseTitleMinLength }) || `Title must be at least ${settings.caseTitleMinLength} characters`
    }

    // Description validation - at least one language required
    const finalDesc = case_.description_en || case_.description_ar
    if (!finalDesc || !finalDesc.trim()) {
      newErrors.description = t('validation.descriptionRequired') || 'At least one language (English or Arabic) is required'
    } else if (finalDesc.trim().length < settings.caseDescriptionMinLength) {
      newErrors.description = t('validation.descriptionTooShort', { min: settings.caseDescriptionMinLength }) || `Description must be at least ${settings.caseDescriptionMinLength} characters`
    } else if (finalDesc.trim().length > settings.caseDescriptionMaxLength) {
      newErrors.description = t('validation.descriptionTooLong', { max: settings.caseDescriptionMaxLength }) || `Description must not exceed ${settings.caseDescriptionMaxLength} characters`
    }

    // Individual description field validation
    if (case_.description_en && case_.description_en.trim().length > 0 && case_.description_en.trim().length < settings.caseDescriptionMinLength) {
      newErrors.description_en = t('validation.descriptionTooShort', { min: settings.caseDescriptionMinLength }) || `Description must be at least ${settings.caseDescriptionMinLength} characters`
    }
    if (case_.description_ar && case_.description_ar.trim().length > 0 && case_.description_ar.trim().length < settings.caseDescriptionMinLength) {
      newErrors.description_ar = t('validation.descriptionTooShort', { min: settings.caseDescriptionMinLength }) || `Description must be at least ${settings.caseDescriptionMinLength} characters`
    }

    // Target amount validation
    const targetAmount = case_.target_amount || case_.goal_amount
    if (!targetAmount || targetAmount <= 0) {
      newErrors.target_amount = t('validation.targetAmountRequired') || 'Target amount is required'
    } else if (targetAmount > settings.caseTargetAmountMax) {
      newErrors.target_amount = t('validation.targetAmountTooHigh', { max: settings.caseTargetAmountMax.toLocaleString() }) || `Target amount must not exceed ${settings.caseTargetAmountMax.toLocaleString()} EGP`
    }

    // Duration validation (for one-time cases)
    if (case_.type === 'one-time' && case_.duration !== null && case_.duration !== undefined) {
      if (case_.duration <= 0) {
        newErrors.duration = t('validation.durationInvalid') || 'Duration must be greater than 0'
      } else if (case_.duration > settings.caseDurationMax) {
        newErrors.duration = t('validation.durationTooLong', { max: settings.caseDurationMax }) || `Duration must not exceed ${settings.caseDurationMax} days`
      }
    }

    // Category validation - required
    if (!case_.category || !case_.category.trim() || case_.category === '__none__') {
      newErrors.category = t('validation.categoryRequired') || 'Category is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!case_) {
      toast.error('Error', { description: 'Case data not loaded. Please refresh the page.' })
      return
    }

    // Validate form
    if (!validateForm()) {
      const errorMsg = 'Please fix the validation errors before saving'
      setError(errorMsg)
      console.log('Showing validation error toast')
      toast.error('Validation Failed', { description: errorMsg })
      setSaving(false)
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Get category ID - prefer category_id from state, otherwise look up by name
      let categoryId = case_.category_id
      
      // If we have a category name but no category_id, look it up
      if (case_.category && !categoryId) {
        // Try to find category by name, name_en, or name_ar
        const selectedCategory = categories.find(cat => 
          cat.name === case_.category || 
          cat.name_en === case_.category ||
          cat.name_ar === case_.category
        )
        if (selectedCategory) {
          categoryId = selectedCategory.id
        } else {
          // Fallback: query database if not in local categories list
          const { data: categoryData, error: categoryError } = await supabase
            .from('case_categories')
            .select('id')
            .or(`name.eq.${case_.category},name_en.eq.${case_.category},name_ar.eq.${case_.category}`)
            .single()
          
          if (categoryData && !categoryError) {
            categoryId = categoryData.id
          }
        }
      }

      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title_en: case_.title_en || '',
          title_ar: case_.title_ar || '',
          description_en: case_.description_en || '',
          description_ar: case_.description_ar || '',
          targetAmount: case_.target_amount || case_.goal_amount || 0,
          status: case_.status || 'draft',
          priority: case_.priority || case_.urgency_level || 'medium',
          location: case_.location || '',
          beneficiaryName: selectedBeneficiary?.name || case_.beneficiary_name || '',
          beneficiaryContact: selectedBeneficiary?.mobile_number || case_.beneficiary_contact || null,
          category_id: categoryId || null,
          duration: case_.duration || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMsg = result.error || 'Failed to update case'
        toast.error('Update Failed', { description: errorMsg })
        setError(errorMsg)
        setSaving(false)
        return
      }

      // Show success toast
      const caseTitle = case_.title_en || case_.title_ar || case_.title || 'Untitled'
      console.log('Showing success toast for case update')
      toast.success('Case Updated Successfully', {
        description: `Case "${caseTitle}" has been successfully updated.`
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      
      // Ensure toast is visible by using a small delay
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error('Error updating case:', error)
      console.error('Catch block error details:', JSON.stringify(error, null, 2))
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Update Failed', {
        description: `An unexpected error occurred: ${errorMessage}`
      })
      setError(`An unexpected error occurred: ${errorMessage}`)
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
        toast.error("Invalid Confirmation", {
          description: "You must type exactly 'DELETE' to confirm deletion."
        })
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
        toast.error("Cannot Delete Case with Contributions", {
          description: result.message || "This case has received contributions and cannot be deleted for data integrity. Please contact an administrator if you need to remove this case."
        })
        
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

      // Show destructive action confirmation (different from regular success)
      toast.error("Case Deleted", {
        description: `Case "${case_?.title_en || case_?.title_ar || case_?.title || 'Untitled'}" and all related data have been permanently deleted.`
      })

      // Redirect to cases list after successful deletion
      setTimeout(() => {
        router.push(`/${params.locale}/cases`)
      }, 2000)

    } catch (error) {
      // Only log actual errors, not business logic responses
      console.error('Unexpected error deleting case:', error)
      
      // Show error message for unexpected errors only
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete case'
      
      toast.error("Delete Failed", {
        description: errorMessage
      })
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

  const getCategoryBadgeClass = (category: string | null, categoryColor: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-700 border-gray-300'
    
    // Use color from database if available
    if (categoryColor) {
      // If it's already a Tailwind class (starts with 'bg-'), use it directly
      if (categoryColor.startsWith('bg-')) {
        return categoryColor
      }
      
      // Map color names to Tailwind classes
      const colorMap: Record<string, string> = {
        'purple': 'bg-purple-100 text-purple-700 border-purple-300',
        'blue': 'bg-blue-100 text-blue-700 border-blue-300',
        'green': 'bg-green-100 text-green-700 border-green-300',
        'red': 'bg-red-100 text-red-700 border-red-300',
        'orange': 'bg-orange-100 text-orange-700 border-orange-300',
        'yellow': 'bg-yellow-100 text-yellow-700 border-yellow-300',
        'pink': 'bg-pink-100 text-pink-700 border-pink-300',
        'indigo': 'bg-indigo-100 text-indigo-700 border-indigo-300',
        'teal': 'bg-teal-100 text-teal-700 border-teal-300',
        'cyan': 'bg-cyan-100 text-cyan-700 border-cyan-300',
        'amber': 'bg-amber-100 text-amber-700 border-amber-300',
        'violet': 'bg-violet-100 text-violet-700 border-violet-300',
        'fuchsia': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300',
        'rose': 'bg-rose-100 text-rose-700 border-rose-300',
        'slate': 'bg-slate-100 text-slate-700 border-slate-300',
        'gray': 'bg-gray-100 text-gray-700 border-gray-300',
        'zinc': 'bg-zinc-100 text-zinc-700 border-zinc-300',
        'neutral': 'bg-neutral-100 text-neutral-700 border-neutral-300',
        'stone': 'bg-stone-100 text-stone-700 border-stone-300',
      }
      
      const lowerColor = categoryColor.toLowerCase().trim()
      if (colorMap[lowerColor]) {
        return colorMap[lowerColor]
      }
      
      // If it's a hex color, we could convert it, but for now use default
      // In the future, we could add hex color to Tailwind class conversion
      if (categoryColor.startsWith('#')) {
        // For hex colors, default to purple theme
        return 'bg-purple-100 text-purple-700 border-purple-300'
      }
    }
    
    // Default purple theme if no color specified
    return 'bg-purple-100 text-purple-700 border-purple-300'
  }

  const getPriorityBadgeClass = (priority: string | null) => {
    if (!priority) return 'bg-gray-100 text-gray-700 border-gray-300'
    if (priority === 'critical') return 'bg-red-100 text-red-700 border-red-300'
    if (priority === 'high') return 'bg-orange-100 text-orange-700 border-orange-300'
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    return 'bg-gray-100 text-gray-700 border-gray-300'
  }

  const copyCaseIdToClipboard = async () => {
    if (!case_) return
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(case_.id)
        setCopiedId(true)
        toast.success(
          'Copied!',
          { description: 'Case ID copied to clipboard' }
        )
        setTimeout(() => setCopiedId(false), 2000)
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement('textarea')
        textArea.value = case_.id
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
          setCopiedId(true)
          toast.success(
            'Copied!',
            { description: 'Case ID copied to clipboard' }
          )
          setTimeout(() => setCopiedId(false), 2000)
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError)
          toast.error(
            'Copy Failed',
            { description: 'Unable to copy to clipboard. Please copy manually.' }
          )
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error(
        'Copy Failed',
        { description: 'Unable to copy to clipboard. Please copy manually.' }
      )
    }
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
    <PermissionGuard permissions={["cases:update"]} fallback={
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
        <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <EditPageHeader
            backUrl={`/${locale}/cases/${caseId}`}
            icon={FileEdit}
            title={t('editCase') || 'Edit Case'}
            description={t('updateCaseInformation') || 'Update case information and details'}
            itemName={
              (case_?.title_en?.trim() || case_?.title_ar?.trim() || case_?.title?.trim()) || undefined
            }
            backLabel={t('backToCase') || 'Back to Case'}
            badge={success ? {
              label: t('savedSuccessfully') || 'Saved successfully',
              variant: 'default',
            } : undefined}
            menuActions={[
              {
                label: t('delete') || 'Delete',
                icon: Trash2,
                onClick: handleDeleteClick,
                variant: 'destructive',
              },
            ]}
          />

          {/* Error Message */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Card - Quick Overview */}
          {(case_.target_amount && case_.target_amount > 0) ? (
            <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Funding Progress</span>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {Math.round((approvedContributionsTotal / case_.target_amount) * 100)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((approvedContributionsTotal / case_.target_amount) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{approvedContributionsTotal.toLocaleString()} EGP raised</span>
                  <span>{case_.target_amount.toLocaleString()} EGP goal</span>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Edit Form with Tabs */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <BrandedTabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as 'details' | 'files')}
                items={[
                  {
                    value: 'details',
                    label: t('caseDetails'),
                    icon: FileEdit,
                  },
                  {
                    value: 'files',
                    label: t('files.files'),
                    icon: FileText,
                    badge: caseFiles.length > 0 ? caseFiles.length : undefined,
                  },
                ]}
              >
                <TabsContent value="details" className="mt-0">
                  <div className="space-y-6">
            {/* Basic Information */}
            <Card className="border-2 border-blue-100 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Type className="h-5 w-5 text-blue-600" />
                  {t('basicInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                {/* Bilingual Title Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="title_en" className="flex items-center gap-2 text-sm font-semibold">
                      <Globe className="h-4 w-4 text-gray-500" />
                      {t('caseTitle')} (English) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                    <Input
                      id="title_en"
                      value={case_.title_en || ''}
                      onChange={(e) => handleInputChange('title_en', e.target.value)}
                      placeholder="Enter case title in English"
                      dir="ltr"
                        className={`h-11 ${errors.title_en ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        maxLength={validationSettings?.caseTitleMaxLength || 100}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {(case_.title_en || '').length}/{validationSettings?.caseTitleMaxLength || 100}
                      </div>
                    </div>
                    {errors.title_en && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.title_en}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title_ar" className="flex items-center gap-2 text-sm font-semibold">
                      <Globe className="h-4 w-4 text-gray-500" />
                      {t('caseTitle')} (Arabic) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                    <Input
                      id="title_ar"
                      value={case_.title_ar || ''}
                      onChange={(e) => handleInputChange('title_ar', e.target.value)}
                      placeholder="أدخل عنوان الحالة بالعربية"
                      dir="rtl"
                        className={`h-11 ${errors.title_ar ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        maxLength={validationSettings?.caseTitleMaxLength || 100}
                    />
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {(case_.title_ar || '').length}/{validationSettings?.caseTitleMaxLength || 100}
                  </div>
                </div>
                    {errors.title_ar && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.title_ar}
                      </p>
                    )}
                  </div>
                </div>
                {errors.title && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-700 text-sm">{errors.title}</p>
                  </div>
                )}

                {/* Bilingual Description Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="description_en" className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4 text-gray-500" />
                      {t('description')} (English) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                    <Textarea
                      id="description_en"
                      value={case_.description_en || ''}
                      onChange={(e) => handleInputChange('description_en', e.target.value)}
                      placeholder="Enter case description in English"
                      rows={5}
                      dir="ltr"
                        className={`resize-none ${errors.description_en ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        maxLength={validationSettings?.caseDescriptionMaxLength || 2000}
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-1 rounded">
                        {(case_.description_en || '').length}/{validationSettings?.caseDescriptionMaxLength || 2000}
                      </div>
                    </div>
                    {errors.description_en && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.description_en}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description_ar" className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4 text-gray-500" />
                      {t('description')} (Arabic) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                    <Textarea
                      id="description_ar"
                      value={case_.description_ar || ''}
                      onChange={(e) => handleInputChange('description_ar', e.target.value)}
                      placeholder="أدخل وصف الحالة بالعربية"
                      rows={5}
                      dir="rtl"
                        className={`resize-none ${errors.description_ar ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        maxLength={validationSettings?.caseDescriptionMaxLength || 2000}
                    />
                      <div className="absolute bottom-2 left-2 text-xs text-gray-400 bg-white px-1 rounded">
                        {(case_.description_ar || '').length}/{validationSettings?.caseDescriptionMaxLength || 2000}
                  </div>
                </div>
                    {errors.description_ar && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.description_ar}
                      </p>
                    )}
                  </div>
                </div>
                {errors.description && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-700 text-sm">{errors.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="goal_amount" className="flex items-center gap-2 text-sm font-semibold">
                      <Target className="h-4 w-4 text-gray-500" />
                      {t('goalAmountEGP')} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="goal_amount"
                        type="number"
                        value={case_.goal_amount ? case_.goal_amount.toString() : ''}
                        onChange={(e) => handleInputChange('goal_amount', parseFloat(e.target.value) || 0)}
                        placeholder={t('goalAmountPlaceholder')}
                        className={`h-11 pl-10 ${errors.target_amount ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        min="1"
                        max={validationSettings?.caseTargetAmountMax || 1000000}
                      />
                    </div>
                    {errors.target_amount && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.target_amount}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_amount" className="flex items-center gap-2 text-sm font-semibold">
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                      {t('currentAmountEGP')}
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="current_amount"
                        type="number"
                        value={approvedContributionsTotal.toString()}
                        disabled
                        className="h-11 pl-10 bg-gray-50 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {t('automaticallyCalculated')}
                    </p>
                    {totalContributions !== approvedContributionsTotal && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Total contributions: {totalContributions} EGP (includes pending/rejected)
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Case Details and Beneficiary Information - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Case Details */}
              <Card className="shadow-lg border border-purple-100 hover:shadow-xl transition-shadow duration-200">
                <CardHeader className="bg-gradient-to-r from-purple-50 via-purple-50/80 to-pink-50 border-b border-purple-200/50 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2.5 text-xl font-semibold text-gray-900 mb-1.5">
                        <div className="p-1.5 rounded-lg bg-purple-100">
                          <Tag className="h-5 w-5 text-purple-600" />
                        </div>
                        {t('caseDetails')}
                      </CardTitle>
                      <CardDescription className="text-gray-600 text-sm ml-9">
                        Specify the financial and categorical information
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 pb-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="status" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <div className="p-1 rounded bg-blue-50">
                            <Info className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          {t('status')}
                          {case_.status && (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                          )}
                        </Label>
                        <Select
                          value={case_.status || 'draft'}
                          onValueChange={(value) => handleInputChange('status', value)}
                        >
                          <SelectTrigger id="status" className="h-10 bg-white hover:bg-gray-50 transition-colors">
                            <SelectValue>
                              {case_.status && (
                                <Badge 
                                  variant="outline" 
                                  className={
                                    case_.status === 'published' ? 'bg-green-100 text-green-700 border-green-300' :
                                    case_.status === 'active' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                    case_.status === 'completed' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                                    case_.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-300' :
                                    'bg-gray-100 text-gray-700 border-gray-300'
                                  }
                                >
                                  {case_.status.charAt(0).toUpperCase() + case_.status.slice(1)}
                                </Badge>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                              Draft
                            </div>
                          </SelectItem>
                          <SelectItem value="published">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              Published
                            </div>
                          </SelectItem>
                          <SelectItem value="active">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              Active
                            </div>
                          </SelectItem>
                          <SelectItem value="completed">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                              Completed
                            </div>
                          </SelectItem>
                          <SelectItem value="cancelled">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              Cancelled
                            </div>
                          </SelectItem>
                        </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <div className="p-1 rounded bg-purple-50">
                            <Tag className="h-3.5 w-3.5 text-purple-600" />
                          </div>
                          {t('category')}
                          <span className="text-red-500">*</span>
                          {case_.category && case_.category !== '__none__' && (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                          )}
                        </Label>
                        <Select
                        value={case_.category || '__none__'}
                        onValueChange={(value) => {
                          if (value === '__none__') {
                            handleInputChange('category', '')
                            handleInputChange('category_id', null)
                            handleInputChange('category_icon', null)
                            handleInputChange('category_color', null)
                            // Clear category error when user interacts
                            if (errors.category) {
                              const newErrors = { ...errors }
                              delete newErrors.category
                              setErrors(newErrors)
                            }
                          } else {
                            // Find category by name, name_en, or name_ar
                            const selectedCategory = categories.find(cat => 
                              cat.name === value || 
                              (cat as any).name_en === value ||
                              (cat as any).name_ar === value
                            )
                            // Use name_en if available, otherwise use name
                            const categoryName = selectedCategory ? ((selectedCategory as any).name_en || selectedCategory.name) : value
                            handleInputChange('category', categoryName)
                            handleInputChange('category_id', selectedCategory?.id || null)
                            handleInputChange('category_icon', selectedCategory?.icon || null)
                            handleInputChange('category_color', selectedCategory?.color || null)
                            // Clear category error when user selects a category
                            if (errors.category) {
                              const newErrors = { ...errors }
                              delete newErrors.category
                              setErrors(newErrors)
                            }
                          }
                        }}
                      >
                        <SelectTrigger id="category" className="h-10 bg-white hover:bg-gray-50 transition-colors">
                          <SelectValue placeholder={t('notSpecified')}>
                            {case_.category ? (() => {
                              // Try to find category by name, name_en, or name_ar
                              const selectedCategory = categories.find(cat => 
                                cat.name === case_.category || 
                                (cat as any).name_en === case_.category ||
                                (cat as any).name_ar === case_.category
                              )
                              // Always prefer the matched category's icon and color from the API
                              const iconValue = selectedCategory?.icon || case_.category_icon || null
                              const categoryColor = selectedCategory?.color || case_.category_color || null
                              return (
                                <Badge variant="outline" className={getCategoryBadgeClass(case_.category, categoryColor)}>
                                  <div className="flex items-center gap-1.5">
                                    {iconValue ? (
                                      <DynamicIcon name={iconValue} className="h-3 w-3" fallback="tag" />
                                    ) : (
                                      <Tag className="h-3 w-3" />
                                    )}
                                    {case_.category}
                                  </div>
                                </Badge>
                              )
                            })() : (
                              <span className="text-gray-500">{t('notSpecified')}</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-gray-500">{t('notSpecified')}</span>
                          </SelectItem>
                          {categories.map((category) => {
                            const iconValue = category.icon
                            // Use name_en if available, otherwise use name
                            const displayName = (category as any).name_en || category.name
                            const categoryValue = (category as any).name_en || category.name
                            return (
                              <SelectItem key={category.id} value={categoryValue}>
                                <div className="flex items-center gap-2">
                                  {iconValue ? (
                                    <DynamicIcon name={iconValue} className="h-4 w-4" />
                                  ) : null}
                                  <span>{displayName}</span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                        </Select>
                        {errors.category && (
                          <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.category}
                          </p>
                        )}
                        {case_.category && case_.category !== '__none__' && (() => {
                          // Try to find category by name, name_en, or name_ar
                          const selectedCategory = categories.find(cat => 
                            cat.name === case_.category || 
                            (cat as any).name_en === case_.category ||
                            (cat as any).name_ar === case_.category
                          )
                          // Always prefer the matched category's icon and color from the API
                          const iconValue = selectedCategory?.icon || case_.category_icon || null
                          const categoryColor = selectedCategory?.color || case_.category_color || null
                          return (
                            <div className="mt-2">
                              <Badge variant="outline" className={getCategoryBadgeClass(case_.category, categoryColor)}>
                                <div className="flex items-center gap-1.5">
                                  {iconValue ? (
                                    <DynamicIcon name={iconValue} className="h-3 w-3" fallback="tag" />
                                  ) : (
                                    <Tag className="h-3 w-3" />
                                  )}
                                  {case_.category}
                                </div>
                              </Badge>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <div className="p-1 rounded bg-orange-50">
                          <Flag className="h-3.5 w-3.5 text-orange-600" />
                        </div>
                        {t('priorityLevel')}
                        {case_.priority && (
                          <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                        )}
                      </Label>
                      <Select
                        value={case_.priority || 'medium'}
                        onValueChange={(value) => handleInputChange('priority', value)}
                      >
                        <SelectTrigger id="priority" className="h-10 bg-white hover:bg-gray-50 transition-colors">
                          <SelectValue>
                            {case_.priority && (
                              <Badge variant="outline" className={getPriorityBadgeClass(case_.priority)}>
                                {case_.priority.charAt(0).toUpperCase() + case_.priority.slice(1)}
                              </Badge>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              Low
                            </div>
                          </SelectItem>
                          <SelectItem value="medium">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                              Medium
                            </div>
                          </SelectItem>
                          <SelectItem value="high">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                              High
                            </div>
                          </SelectItem>
                          <SelectItem value="critical">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              Critical
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {case_.priority && (
                        <div className="mt-2">
                          <Badge 
                            variant="outline" 
                            className={getPriorityBadgeClass(case_.priority)}
                          >
                            {case_.priority.charAt(0).toUpperCase() + case_.priority.slice(1)}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <div className="space-y-2">
                        <Label htmlFor="location" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          <div className="p-1 rounded bg-indigo-50">
                            <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                          </div>
                          {t('location')}
                          <span className="text-xs font-normal text-gray-400 ml-1">(Optional)</span>
                          {case_.location && (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                          )}
                        </Label>
                        <Input
                          id="location"
                          value={case_.location || ''}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          placeholder={t('locationPlaceholder') || 'Enter location'}
                          className="h-10 bg-white"
                        />
                      </div>
                    </div>

                    {/* Duration field for one-time cases */}
                    {case_.type === 'one-time' && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="space-y-2">
                          <Label htmlFor="duration" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <div className="p-1 rounded bg-cyan-50">
                              <Clock className="h-3.5 w-3.5 text-cyan-600" />
                            </div>
                            {t('duration')}
                            <span className="text-xs font-normal text-gray-400 ml-1">(Optional)</span>
                            {case_.duration && !errors.duration && (
                              <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                            )}
                          </Label>
                          <div className="relative max-w-md">
                            <Input
                              id="duration"
                              type="number"
                              value={case_.duration || ''}
                              onChange={(e) => handleInputChange('duration', e.target.value ? parseInt(e.target.value) : null)}
                              placeholder={t('durationPlaceholder') || 'Enter duration in days'}
                              min="1"
                              max={validationSettings?.caseDurationMax || 365}
                              className={`h-10 pr-16 bg-white ${errors.duration ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                              days
                            </span>
                          </div>
                          {errors.duration && (
                            <p className="text-red-500 text-xs flex items-center gap-1 mt-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.duration}
                            </p>
                          )}
                          {!errors.duration && (
                            <p className="text-xs text-gray-500 mt-1">
                              Maximum: {validationSettings?.caseDurationMax || 365} days
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Beneficiary Information */}
              <Card className="shadow-lg border border-green-100 hover:shadow-xl transition-shadow duration-200">
                <CardHeader className="bg-gradient-to-r from-green-50 via-emerald-50/80 to-green-50 border-b border-green-200/50 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2.5 text-xl font-semibold text-gray-900 mb-1.5">
                        <div className="p-1.5 rounded-lg bg-green-100">
                          <User className="h-5 w-5 text-green-600" />
                        </div>
                        {t('beneficiaryInformation')}
                      </CardTitle>
                      <CardDescription className="text-gray-600 text-sm ml-9">
                        Select or create the beneficiary for this case
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 pb-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <span>{t('beneficiary')}</span>
                        {selectedBeneficiary && (
                          <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                        )}
                      </Label>
                      <div className="bg-gray-50 rounded-lg p-1 border border-gray-200">
                        <BeneficiarySelector
                          selectedBeneficiary={selectedBeneficiary}
                          onSelect={setSelectedBeneficiary}
                          showOpenButton={true}
                          defaultName={case_.beneficiary_name || undefined}
                          defaultMobileNumber={case_.beneficiary_contact || undefined}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Case Metadata */}
            <Card className="border-2 border-yellow-200 shadow-sm bg-yellow-50/80">
              <CardHeader className="border-b border-yellow-200 bg-yellow-100/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5 text-yellow-700" />
                  Case Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-yellow-200 hover:border-yellow-300 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Building2 className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-500 block mb-1">Case ID</span>
                        <span className="text-sm font-mono font-medium text-gray-900 truncate block">
                          {case_.id}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyCaseIdToClipboard}
                      className="h-8 w-8 p-0 flex-shrink-0 hover:bg-yellow-100"
                      title="Copy Case ID"
                    >
                      {copiedId ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-yellow-600" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-yellow-200">
                    <User className="h-5 w-5 text-yellow-600" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-500 block mb-1">Created By</span>
                      <div className="flex flex-col">
                        {case_.creator_name ? (
                          <>
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {case_.creator_name}
                            </span>
                            {case_.creator_email && (
                              <span className="text-xs text-gray-500 truncate mt-0.5">
                                {case_.creator_email}
                              </span>
                            )}
                          </>
                        ) : case_.creator_email ? (
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {case_.creator_email}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 italic">
                            Unknown User
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-yellow-200">
                    <Calendar className="h-5 w-5 text-yellow-600" />
                    <div>
                      <span className="text-xs text-gray-500 block">Created</span>
                      <span className="text-sm font-medium text-gray-900">{new Date(case_.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-yellow-200">
                    <Calendar className="h-5 w-5 text-yellow-600" />
                    <div>
                      <span className="text-xs text-gray-500 block">Last Updated</span>
                      <span className="text-sm font-medium text-gray-900">{new Date(case_.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-yellow-200">
                    <Percent className="h-5 w-5 text-yellow-600" />
                    <div>
                      <span className="text-xs text-gray-500 block">Progress</span>
                      <span className="text-sm font-medium text-gray-900">
                        {(case_.target_amount && case_.target_amount > 0)
                          ? `${Math.round((approvedContributionsTotal / case_.target_amount) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
                  </div>
                </TabsContent>

                <TabsContent value="files" className="mt-0">
                  <CaseFileManager
                    caseId={caseId}
                    files={caseFiles}
                    canEdit={true}
                    onFilesChange={handleFilesChange}
                    viewMode="grid"
                    showUpload={true}
                  />
                </TabsContent>
              </BrandedTabs>
            </CardContent>
          </Card>

          {/* Footer */}
          <EditPageFooter
            primaryAction={{
              label: saving ? (t('saving') || 'Saving...') : (tProfile('saveChanges') || 'Save Changes'),
              onClick: handleSave,
              disabled: saving,
              loading: saving,
              icon: <Save className="h-4 w-4 mr-2" />
            }}
            secondaryActions={[
              {
                label: t('cancel') || 'Cancel',
                onClick: handleBack,
                variant: 'outline'
              },
              {
                label: t('delete') || 'Delete',
                onClick: handleDeleteClick,
                variant: 'destructive',
                icon: <Trash2 className="h-4 w-4 mr-2" />
              }
            ]}
          />
        </Container>
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
