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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useEnhancedToast } from '@/hooks/use-enhanced-toast'
import CaseFileManager, { CaseFile, FileCategory } from '@/components/cases/CaseFileManager'
import BeneficiarySelector from '@/components/beneficiaries/BeneficiarySelector'
import type { Beneficiary } from '@/types/beneficiary'
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
  type LucideIcon,
  Heart,
  GraduationCap,
  Home,
  Briefcase,
  ShoppingBag,
  Users,
  Stethoscope,
  HandHeart,
  Wrench,
  BookOpen,
  Shield,
  Zap,
  Gift
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
  const [categories, setCategories] = useState<Array<{id: string, name: string, icon: string | null, color: string | null}>>([])
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
        .select('id, name, icon, color')
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
          case_categories(name, icon, color)
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

      // Fetch creator information separately
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
            
            // Log for debugging
            console.log('Creator data:', { creatorData, fullName, email: creatorEmail })
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
        category: (categoryData as { name: string; icon: string | null; color: string | null } | null)?.name || null,
        category_icon: (categoryData as { name: string; icon: string | null; color: string | null } | null)?.icon || null,
        category_color: (categoryData as { name: string; icon: string | null; color: string | null } | null)?.color || null,
        creator_name: creatorName,
        creator_email: creatorEmail,
        beneficiary_contact: data.beneficiary_contact || null
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
        beneficiary_name: selectedBeneficiary?.name || case_.beneficiary_name || '',
        beneficiary_contact: selectedBeneficiary?.mobile_number || case_.beneficiary_contact || null,
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

  const getCategoryBadgeClass = (category: string | null, categoryColor: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-700 border-gray-300'
    
    // Use color from database if available
    if (categoryColor) {
      // Parse color - could be a CSS class name or hex color
      // If it's a CSS class, use it directly
      if (categoryColor.startsWith('bg-')) {
        return categoryColor
      }
      // If it's a hex color or color name, convert to Tailwind classes
      // For now, we'll use a mapping approach
      const colorMap: Record<string, string> = {
        'purple': 'bg-purple-100 text-purple-700 border-purple-300',
        'blue': 'bg-blue-100 text-blue-700 border-blue-300',
        'green': 'bg-green-100 text-green-700 border-green-300',
        'red': 'bg-red-100 text-red-700 border-red-300',
        'orange': 'bg-orange-100 text-orange-700 border-orange-300',
        'yellow': 'bg-yellow-100 text-yellow-700 border-yellow-300',
        'pink': 'bg-pink-100 text-pink-700 border-pink-300',
        'indigo': 'bg-indigo-100 text-indigo-700 border-indigo-300',
      }
      
      const lowerColor = categoryColor.toLowerCase()
      if (colorMap[lowerColor]) {
        return colorMap[lowerColor]
      }
    }
    
    // Default purple theme if no color specified
    return 'bg-purple-100 text-purple-700 border-purple-300'
  }

  const getCategoryIcon = (iconName: string | null | undefined): LucideIcon | null => {
    if (!iconName) return Tag
    
    // Check if it's an emoji
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u
    if (emojiRegex.test(iconName) || iconName.length <= 2) {
      return null // Return null for emojis, we'll render them directly
    }
    
    const iconMap: Record<string, LucideIcon> = {
      'Tag': Tag,
      'Heart': Heart,
      'GraduationCap': GraduationCap,
      'Home': Home,
      'Briefcase': Briefcase,
      'ShoppingBag': ShoppingBag,
      'Users': Users,
      'Stethoscope': Stethoscope,
      'HandHeart': HandHeart,
      'Wrench': Wrench,
      'BookOpen': BookOpen,
      'Shield': Shield,
      'Zap': Zap,
      'Gift': Gift,
      'Building2': Building2,
      'FileText': FileText,
      'Info': Info,
      // Handle lowercase variations
      'tag': Tag,
      'heart': Heart,
      'graduationcap': GraduationCap,
      'home': Home,
      'briefcase': Briefcase,
      'shoppingbag': ShoppingBag,
      'users': Users,
      'stethoscope': Stethoscope,
      'handheart': HandHeart,
      'wrench': Wrench,
      'bookopen': BookOpen,
      'shield': Shield,
      'zap': Zap,
      'gift': Gift,
      'building2': Building2,
      'filetext': FileText,
      'info': Info,
    }
    
    return iconMap[iconName] || Tag
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
          'Case ID copied to clipboard'
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
            'Case ID copied to clipboard'
          )
          setTimeout(() => setCopiedId(false), 2000)
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError)
          toast.error(
            'Copy Failed',
            'Unable to copy to clipboard. Please copy manually.'
          )
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error(
        'Copy Failed',
        'Unable to copy to clipboard. Please copy manually.'
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
        <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <Button onClick={handleBack} variant="ghost" className="mb-3 -ml-2">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('backToCase')}
                </Button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileEdit className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('editCase')}</h1>
                    <p className="text-gray-600 mt-1 text-sm">{t('updateCaseInformation')}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {success && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('savedSuccessfully')}</span>
                  </div>
                )}
                <Button 
                  onClick={handleDeleteClick}
                  variant="outline"
                  size="sm"
                  className="border-red-200 hover:border-red-500 hover:bg-red-50 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving} 
                  className="bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-shadow"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? t('saving') : tProfile('saveChanges')}
                </Button>
              </div>
            </div>
          </div>

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
          {case_.target_amount && case_.target_amount > 0 && (
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
          )}

          {/* Edit Form with Tabs */}
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-white to-gray-50">
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-blue-600" />
                {t('editCase')}
              </CardTitle>
              <CardDescription className="mt-1">
                {t('updateCaseInformation')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'details' | 'files')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="details" className="flex items-center gap-2">
                    <FileEdit className="h-4 w-4" />
                    {t('caseDetails')}
                  </TabsTrigger>
                  <TabsTrigger value="files" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('files.files')} ({caseFiles.length})
                  </TabsTrigger>
                </TabsList>

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
                      {t('caseTitle')} (English)
                    </Label>
                    <Input
                      id="title_en"
                      value={case_.title_en || ''}
                      onChange={(e) => handleInputChange('title_en', e.target.value)}
                      placeholder="Enter case title in English"
                      dir="ltr"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title_ar" className="flex items-center gap-2 text-sm font-semibold">
                      <Globe className="h-4 w-4 text-gray-500" />
                      {t('caseTitle')} (Arabic)
                    </Label>
                    <Input
                      id="title_ar"
                      value={case_.title_ar || ''}
                      onChange={(e) => handleInputChange('title_ar', e.target.value)}
                      placeholder="أدخل عنوان الحالة بالعربية"
                      dir="rtl"
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Bilingual Description Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="description_en" className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4 text-gray-500" />
                      {t('description')} (English)
                    </Label>
                    <Textarea
                      id="description_en"
                      value={case_.description_en || ''}
                      onChange={(e) => handleInputChange('description_en', e.target.value)}
                      placeholder="Enter case description in English"
                      rows={5}
                      dir="ltr"
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description_ar" className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4 text-gray-500" />
                      {t('description')} (Arabic)
                    </Label>
                    <Textarea
                      id="description_ar"
                      value={case_.description_ar || ''}
                      onChange={(e) => handleInputChange('description_ar', e.target.value)}
                      placeholder="أدخل وصف الحالة بالعربية"
                      rows={5}
                      dir="rtl"
                      className="resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="goal_amount" className="flex items-center gap-2 text-sm font-semibold">
                      <Target className="h-4 w-4 text-gray-500" />
                      {t('goalAmountEGP')}
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="goal_amount"
                        type="number"
                        value={case_.goal_amount ? case_.goal_amount.toString() : ''}
                        onChange={(e) => handleInputChange('goal_amount', parseFloat(e.target.value) || 0)}
                        placeholder={t('goalAmountPlaceholder')}
                        className="h-11 pl-10"
                      />
                    </div>
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

            {/* Case Details */}
            <Card className="shadow-md border-0">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="h-5 w-5 text-purple-600" />
                  {t('caseDetails')}
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Specify the financial and categorical information
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="status" className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{t('status')}</span>
                      {case_.status && (
                        <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                      )}
                    </Label>
                    <Select
                      value={case_.status || 'draft'}
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger id="status">
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
                    {case_.status && (
                      <div className="mt-1.5">
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
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="category" className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{t('category')}</span>
                      {case_.category && (
                        <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                      )}
                    </Label>
                    <Select
                      value={case_.category || '__none__'}
                      onValueChange={(value) => {
                        if (value === '__none__') {
                          handleInputChange('category', '')
                          handleInputChange('category_icon', null)
                          handleInputChange('category_color', null)
                        } else {
                          const selectedCategory = categories.find(cat => cat.name === value)
                          handleInputChange('category', value)
                          handleInputChange('category_icon', selectedCategory?.icon || null)
                          handleInputChange('category_color', selectedCategory?.color || null)
                        }
                      }}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder={t('notSpecified')}>
                          {case_.category ? (() => {
                            const selectedCategory = categories.find(cat => cat.name === case_.category)
                            const iconValue = case_.category_icon || selectedCategory?.icon || null
                            const IconComponent = getCategoryIcon(iconValue)
                            return (
                              <Badge variant="outline" className={getCategoryBadgeClass(case_.category, case_.category_color || selectedCategory?.color || null)}>
                                <div className="flex items-center gap-1.5">
                                  {IconComponent ? (
                                    <IconComponent className="h-3 w-3" />
                                  ) : iconValue ? (
                                    <span className="text-base">{iconValue}</span>
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
                          const IconComponent = getCategoryIcon(iconValue)
                          return (
                            <SelectItem key={category.id} value={category.name}>
                              <div className="flex items-center gap-2">
                                {IconComponent ? (
                                  <IconComponent className="h-4 w-4" />
                                ) : iconValue ? (
                                  <span className="text-base">{iconValue}</span>
                                ) : null}
                                <span>{category.name}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    {case_.category && (() => {
                      const selectedCategory = categories.find(cat => cat.name === case_.category)
                      const iconValue = case_.category_icon || selectedCategory?.icon || null
                      const IconComponent = getCategoryIcon(iconValue)
                      return (
                        <div className="mt-1.5">
                          <Badge variant="outline" className={getCategoryBadgeClass(case_.category, case_.category_color || selectedCategory?.color || null)}>
                            <div className="flex items-center gap-1.5">
                              {IconComponent ? (
                                <IconComponent className="h-3 w-3" />
                              ) : iconValue ? (
                                <span className="text-base">{iconValue}</span>
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

                  <div>
                    <Label htmlFor="priority" className="flex items-center gap-2 mb-2">
                      <Flag className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{t('priorityLevel')}</span>
                      {case_.priority && (
                        <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                      )}
                    </Label>
                    <Select
                      value={case_.priority || 'medium'}
                      onValueChange={(value) => handleInputChange('priority', value)}
                    >
                      <SelectTrigger id="priority">
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
                      <div className="mt-1.5">
                        <Badge 
                          variant="outline" 
                          className={getPriorityBadgeClass(case_.priority)}
                        >
                          {case_.priority.charAt(0).toUpperCase() + case_.priority.slice(1)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <Label htmlFor="location" className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{t('location')}</span>
                    <span className="text-xs text-gray-400">(Optional)</span>
                    {case_.location && (
                      <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                    )}
                  </Label>
                  <Input
                    id="location"
                    value={case_.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder={t('locationPlaceholder') || 'Enter location'}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Beneficiary Information */}
            <Card className="shadow-md border-0">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-green-600" />
                  {t('beneficiaryInformation')}
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Select or create the beneficiary for this case
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">{t('beneficiary')}</span>
                    {selectedBeneficiary && (
                      <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                    )}
                  </Label>
                  <BeneficiarySelector
                    selectedBeneficiary={selectedBeneficiary}
                    onSelect={setSelectedBeneficiary}
                    showOpenButton={true}
                    defaultName={case_.beneficiary_name || undefined}
                    defaultMobileNumber={case_.beneficiary_contact || undefined}
                  />
                </div>
              </CardContent>
            </Card>

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
