'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import DynamicIcon from '@/components/ui/dynamic-icon'
import { toast } from 'sonner'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { useInfiniteScrollPagination } from '@/hooks/useInfiniteScrollPagination'
import { theme, brandColors } from '@/lib/theme'
import { defaultLogger as logger } from '@/lib/logger'
import { AdminContributionModal } from '@/components/admin/AdminContributionModal'
import { useAdmin } from '@/lib/admin/hooks'

import { 
  Target, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Zap,
  Tag,
  Flag,
  Info,
  Save,
  Gift
} from 'lucide-react'

interface Beneficiary {
  id: string
  name: string
  name_ar?: string
  age?: number
  gender?: 'male' | 'female' | 'other'
  mobile_number?: string
  email?: string
  city?: string
  governorate?: string
  risk_level?: 'low' | 'medium' | 'high' | 'critical'
  is_verified?: boolean
  total_cases?: number
  active_cases?: number
}

interface Case {
  id: string
  title?: string
  title_en?: string
  title_ar?: string
  description?: string
  description_en?: string
  description_ar?: string
  target_amount: number
  current_amount: number
  status: 'draft' | 'submitted' | 'published' | 'closed' | 'under_review'
  created_at: string
  created_by: string
  image_url?: string
  beneficiary_id?: string
  beneficiary_name?: string
  beneficiary_contact?: string
  beneficiaries?: Beneficiary | null
  category_id?: string | null
  priority?: string
  case_categories?: {
    id: string
    name: string
    name_en?: string
    name_ar?: string
    icon?: string | null
    color?: string | null
  } | {
    id: string
    name: string
    name_en?: string
    name_ar?: string
    icon?: string | null
    color?: string | null
  }[] | null
  // Calculated fields
  approved_amount?: number
  total_contributions?: number
  contributor_count?: number
}

export default function AdminCasesPage() {
  const router = useRouter()
  const params = useParams()
  const { containerVariant } = useLayout()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at_desc')
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    completed: 0,
    closed: 0,
    under_review: 0
  })
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    caseId: string | null
    caseTitle: string
    step: 'confirm' | 'final'
  }>({
    isOpen: false,
    caseId: null,
    caseTitle: '',
    step: 'confirm'
  })
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [quickUpdateDialog, setQuickUpdateDialog] = useState<{
    isOpen: boolean
    caseId: string | null
    caseTitle: string
    currentStatus: string
    currentCategory: string | null
    currentCategoryId: string | null
    currentPriority: string
  }>({
    isOpen: false,
    caseId: null,
    caseTitle: '',
    currentStatus: 'draft',
    currentCategory: null,
    currentCategoryId: null,
    currentPriority: 'medium'
  })
  const [categories, setCategories] = useState<Array<{id: string, name: string, name_en?: string, name_ar?: string, icon: string | null, color: string | null}>>([])
  const [updating, setUpdating] = useState(false)
  const [updateFormData, setUpdateFormData] = useState({
    status: 'draft',
    category: null as string | null,
    category_id: null as string | null,
    priority: 'medium'
  })
  const [addContributionModal, setAddContributionModal] = useState<{
    open: boolean
    caseId: string | null
    caseTitle: string
  }>({
    open: false,
    caseId: null,
    caseTitle: ''
  })
  const { hasPermission } = useAdmin()

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      const queryString = params.toString()
      const url = `/api/admin/cases/stats${queryString ? `?${queryString}` : ''}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast.error('Unauthorized', { description: 'You do not have permission to view this page.' })
          return
        }
        throw new Error(`Failed to fetch cases: ${response.statusText}`)
      }

      const data = await response.json()
      
      const loadedCases = data.cases || []
      
      // Warn if dataset is large (this view loads all cases into memory)
      if (loadedCases.length > 1000) {
        logger.warn(`Large dataset detected: ${loadedCases.length} cases loaded. This view may experience performance issues with very large datasets. Consider implementing server-side pagination.`)
      }
      
      setCases(loadedCases)
      setStats(data.stats || {
        total: 0,
        published: 0,
        completed: 0,
        closed: 0,
        under_review: 0
      })
    } catch (error) {
      logger.error('Error fetching cases:', { error: error })
      toast.error('Error', { description: 'Failed to load cases. Please try again.' })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchTerm])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <Badge variant="outline" style={{ backgroundColor: brandColors.meen[100], color: brandColors.meen[800], borderColor: brandColors.meen[200] }}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Published
          </Badge>
        )
      case 'closed':
        return (
          <Badge variant="outline" style={{ backgroundColor: brandColors.ma3ana[100], color: brandColors.ma3ana[800], borderColor: brandColors.ma3ana[200] }}>
            <XCircle className="h-3 w-3 mr-1" />
            Closed
          </Badge>
        )
      case 'under_review':
        return (
          <Badge variant="outline" style={{ background: theme.gradients.brandSubtle, color: brandColors.meen[800], borderColor: brandColors.meen[200] }}>
            <Clock className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        )
      case 'draft':
        return (
          <Badge variant="outline" style={{ backgroundColor: brandColors.ma3ana[50], color: brandColors.ma3ana[700], borderColor: brandColors.ma3ana[200] }}>
            <Edit className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        )
      case 'submitted':
        return (
          <Badge variant="outline" style={{ backgroundColor: brandColors.meen[50], color: brandColors.meen[700], borderColor: brandColors.meen[200] }}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Submitted
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="outline" style={{ backgroundColor: brandColors.meen[100], color: brandColors.meen[800], borderColor: brandColors.meen[200] }}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        )
    }
  }

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getProgressPercentage = (current: number, target: number) => {
    if (!target || target <= 0) return 0
    return Math.min((current / target) * 100, 100)
  }

  const filteredCases = cases.filter(case_ => {
    // Handle search with null/undefined checks and bilingual fields
    const searchLower = searchTerm.toLowerCase()
    const title = case_.title || case_.title_en || case_.title_ar || ''
    const description = case_.description || case_.description_en || case_.description_ar || ''
    
    const matchesSearch = !searchTerm || 
                         (title && title.toLowerCase().includes(searchLower)) ||
                         (description && description.toLowerCase().includes(searchLower))
    
    const matchesStatus = statusFilter === 'all' || case_.status === statusFilter
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    // Apply sorting based on sortBy state
    switch (sortBy) {
      case 'contributors_high':
        return (b.contributor_count || 0) - (a.contributor_count || 0)
      case 'contributors_low':
        return (a.contributor_count || 0) - (b.contributor_count || 0)
      case 'amount_high':
        return (b.approved_amount || 0) - (a.approved_amount || 0)
      case 'amount_low':
        return (a.approved_amount || 0) - (b.approved_amount || 0)
      case 'created_at_desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'created_at_asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      default:
        return 0
    }
  })

  // Use pagination hook for client-side pagination with Load More button
  const pagination = useInfiniteScrollPagination({
    totalItems: filteredCases.length,
    initialPage: 1,
    initialItemsPerPage: 10,
    resetDependencies: [searchTerm, statusFilter, sortBy],
    useLoadMoreButton: true // Use Load More button instead of infinite scroll
  })

  // Calculate paginated cases based on hook state
  const paginatedCases = filteredCases.slice(0, pagination.state.endIndex)

  const handlePageChange = (page: number) => {
    pagination.actions.setCurrentPage(Math.max(1, Math.min(page, pagination.state.totalPages)))
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    const { currentPage, totalPages } = pagination.state
    
    if (totalPages <= maxVisible) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)
      
      if (currentPage > 3) {
        pages.push('...')
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...')
      }
      
      // Always show last page
      pages.push(totalPages)
    }
    
    return pages
  }

  const handleDeleteClick = (caseId: string, caseTitle: string) => {
    setDeleteDialog({
      isOpen: true,
      caseId,
      caseTitle,
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
        toast.error("Invalid Confirmation", { description: "You must type exactly 'DELETE' to confirm deletion." })
        return
      }
      performDelete()
    }
  }

  const performDelete = async () => {
    if (!deleteDialog.caseId) return

    try {
      setDeleting(true)
      
      const response = await fetch(`/api/cases/${deleteDialog.caseId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Note: 400 responses in console are expected for contribution protection
      // This is normal browser network logging, not an actual error

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
          caseId: null,
          caseTitle: '',
          step: 'confirm'
        })
        return
      }

      // Check for actual errors
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete case')
      }

      // Remove case from local state
      setCases(prev => prev.filter(c => c.id !== deleteDialog.caseId))
      
      // Update stats
      setStats(prev => ({
        ...prev,
        total: prev.total - 1
      }))

      // Close dialog
      setDeleteDialog({
        isOpen: false,
        caseId: null,
        caseTitle: '',
        step: 'confirm'
      })

      // Show destructive action confirmation (different from regular success)
      toast.error("Case Deleted", {
        description: `Case "${deleteDialog.caseTitle}" and all related data have been permanently deleted.`
      })

    } catch (error) {
      // Only log actual errors, not business logic responses
      logger.error('Unexpected error deleting case:', { error: error })
      
      // Show error message for unexpected errors only
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete case'
      
      toast.error("Delete Failed", { description: errorMessage })
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      caseId: null,
      caseTitle: '',
      step: 'confirm'
    })
    setDeleteConfirmationText('') // Reset confirmation text
  }

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (!response.ok) {
        logger.error('Error fetching categories:', { error: response.statusText })
        return
      }
      const result = await response.json()
      setCategories(result.categories || [])
    } catch (error) {
      logger.error('Error fetching categories:', { error: error })
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleQuickUpdateClick = (case_: Case) => {
    // Extract category data from case_categories relation
    const caseCategories = (case_ as any).case_categories
    let caseCategory: string | null = null
    let caseCategoryId: string | null = (case_ as any).category_id || null
    
    if (caseCategories) {
      // Handle array or single object
      const categoryData = Array.isArray(caseCategories) ? caseCategories[0] : caseCategories
      if (categoryData) {
        // Prefer name_en, fallback to name
        caseCategory = categoryData.name_en || categoryData.name || null
        caseCategoryId = categoryData.id || caseCategoryId
      }
    }
    
    setQuickUpdateDialog({
      isOpen: true,
      caseId: case_.id,
      caseTitle: case_.title || case_.title_en || case_.title_ar || 'Untitled Case',
      currentStatus: case_.status || 'draft',
      currentCategory: caseCategory,
      currentCategoryId: caseCategoryId,
      currentPriority: (case_ as any).priority || 'medium'
    })
    setUpdateFormData({
      status: case_.status || 'draft',
      category: caseCategory,
      category_id: caseCategoryId,
      priority: (case_ as any).priority || 'medium'
    })
  }

  const handleQuickUpdateCancel = () => {
    setQuickUpdateDialog({
      isOpen: false,
      caseId: null,
      caseTitle: '',
      currentStatus: 'draft',
      currentCategory: null,
      currentCategoryId: null,
      currentPriority: 'medium'
    })
    setUpdateFormData({
      status: 'draft',
      category: null,
      category_id: null,
      priority: 'medium'
    })
  }

  const handleQuickUpdateSave = async () => {
    if (!quickUpdateDialog.caseId) return

    try {
      setUpdating(true)

      // Get category ID if category name is provided
      let categoryId = updateFormData.category_id
      if (updateFormData.category && !categoryId) {
        const selectedCategory = categories.find(cat => 
          cat.name === updateFormData.category || 
          (cat as any).name_en === updateFormData.category ||
          (cat as any).name_ar === updateFormData.category
        )
        if (selectedCategory) {
          categoryId = selectedCategory.id
        }
      }

      const response = await fetch(`/api/cases/${quickUpdateDialog.caseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: updateFormData.status,
          priority: updateFormData.priority,
          category_id: categoryId || null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update case')
      }

      // Update local state
      setCases(prev => prev.map(c => 
        c.id === quickUpdateDialog.caseId 
          ? { 
              ...c, 
              status: updateFormData.status as 'draft' | 'submitted' | 'published' | 'closed' | 'under_review',
              priority: updateFormData.priority as 'low' | 'medium' | 'high' | 'urgent',
              category_id: categoryId || undefined
            }
          : c
      ))

      // Refresh cases to get updated data
      await fetchCases()

      toast.success('Case Updated', {
        description: `Case "${quickUpdateDialog.caseTitle}" has been updated successfully.`
      })

      handleQuickUpdateCancel()
    } catch (error) {
      logger.error('Error updating case:', { error: error })
      const errorMessage = error instanceof Error ? error.message : 'Failed to update case'
      toast.error('Update Failed', { description: errorMessage })
    } finally {
      setUpdating(false)
    }
  }

  const getCategoryBadgeClass = (category: string | null, categoryColor: string | null) => {
    if (!category) return 'bg-gray-100 text-gray-700 border-gray-300'
    
    if (categoryColor) {
      if (categoryColor.startsWith('bg-')) {
        return categoryColor
      }
      
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
      
      if (categoryColor.startsWith('#')) {
        return 'bg-purple-100 text-purple-700 border-purple-300'
      }
    }
    
    return 'bg-purple-100 text-purple-700 border-purple-300'
  }

  const getPriorityBadgeClass = (priority: string | null) => {
    if (!priority) return 'bg-gray-100 text-gray-700 border-gray-300'
    if (priority === 'critical') return 'bg-red-100 text-red-700 border-red-300'
    if (priority === 'high') return 'bg-orange-100 text-orange-700 border-orange-300'
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    return 'bg-gray-100 text-gray-700 border-gray-300'
  }

  return (
    <ProtectedRoute>
      <PermissionGuard permission="cases:manage">
        <div className="min-h-screen overflow-x-hidden" style={{ background: theme.gradients.brandSubtle }}>
          <Container variant={containerVariant} className="py-3 sm:py-4 lg:py-6 px-4 sm:px-6">
            {/* Header */}
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-3">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${params.locale}/case-management`)}
                  className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 text-sm sm:text-base"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Back to Dashboard</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Case Management</h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Manage all charity cases in the system</p>
                </div>
                <Button
                  onClick={() => router.push(`/${params.locale}/case-management/create`)}
                  className="w-full sm:w-auto text-sm sm:text-base text-white"
                  style={{
                    background: theme.gradients.primary,
                    boxShadow: theme.shadows.primary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.meen[700]} 100%)`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = theme.gradients.primary
                  }}
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Create New Case</span>
                  <span className="sm:hidden">Create Case</span>
                </Button>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.primary }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Cases</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: brandColors.meen[100] }}>
                      <Target className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.meen[600] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.primary }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Published</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.published}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: brandColors.meen[100] }}>
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.meen[600] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.primary }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Completed</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.completed}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: brandColors.ma3ana[100] }}>
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.ma3ana[600] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.secondary }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Closed</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.closed}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ backgroundColor: brandColors.ma3ana[100] }}>
                      <XCircle className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.ma3ana[600] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300" style={{ boxShadow: theme.shadows.primary }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Under Review</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.under_review}</p>
                    </div>
                    <div className="p-2 sm:p-3 rounded-full flex-shrink-0 ml-2" style={{ background: theme.gradients.brandSubtle }}>
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brandColors.meen[600] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mb-3 sm:mb-4" style={{ boxShadow: theme.shadows.primary }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="relative">
                      <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                      <Input
                        placeholder="Search cases..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 sm:pl-10 text-sm sm:text-base"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48 text-sm sm:text-base">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={pagination.state.itemsPerPage.toString()} onValueChange={(value) => {
                    pagination.actions.setItemsPerPage(Number(value))
                    pagination.actions.reset()
                  }}>
                    <SelectTrigger className="w-full sm:w-32 text-sm sm:text-base">
                      <SelectValue placeholder="Per page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="25">25 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(value) => {
                    setSortBy(value)
                    pagination.actions.reset()
                  }}>
                    <SelectTrigger className="w-full sm:w-48 text-sm sm:text-base">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at_desc">Newest First</SelectItem>
                      <SelectItem value="created_at_asc">Oldest First</SelectItem>
                      <SelectItem value="contributors_high">Contributors (High to Low)</SelectItem>
                      <SelectItem value="contributors_low">Contributors (Low to High)</SelectItem>
                      <SelectItem value="amount_high">Amount (High to Low)</SelectItem>
                      <SelectItem value="amount_low">Amount (Low to High)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Cases List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: brandColors.meen[600] }}></div>
                <p className="text-gray-600 mt-4">Loading cases...</p>
              </div>
            ) : filteredCases.length === 0 ? (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg" style={{ boxShadow: theme.shadows.primary }}>
                <CardContent className="p-12 text-center">
                  <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No cases found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your filters to see more results'
                      : 'No cases have been created yet'
                    }
                  </p>
                  <Button
                    onClick={() => router.push(`/${params.locale}/case-management/create`)}
                    className="text-white"
                    style={{
                      background: theme.gradients.primary,
                      boxShadow: theme.shadows.primary
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.meen[700]} 100%)`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = theme.gradients.primary
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Case
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Results Info */}
                <div className="mb-2 sm:mb-3 text-xs sm:text-sm text-gray-600 break-words">
                  Showing {pagination.state.startIndex + 1} to {Math.min(pagination.state.endIndex, filteredCases.length)} of {filteredCases.length} cases
                  {(searchTerm || statusFilter !== 'all') && (
                    <span className="ml-1 sm:ml-2">
                      (filtered from {cases.length} total)
                    </span>
                  )}
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {paginatedCases.map((case_) => {
                    // Handle beneficiary data - Supabase may return as object or array
                    const beneficiaryData = case_.beneficiaries
                    const beneficiary = Array.isArray(beneficiaryData) 
                      ? (beneficiaryData.length > 0 ? beneficiaryData[0] : null)
                      : beneficiaryData
                    const beneficiaryName = beneficiary?.name || case_.beneficiary_name || null
                    
                    return (
                    <Card key={case_.id} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden" style={{ boxShadow: theme.shadows.primary }}>
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          {/* Case Image */}
                          {case_.image_url && (
                            <div className="flex-shrink-0 md:w-48 w-full h-48 md:h-auto">
                              <Image
                                src={case_.image_url}
                                alt={case_.title || case_.title_en || case_.title_ar || 'Case image'}
                                className="w-full h-full object-cover"
                                width={192}
                                height={192}
                              />
                            </div>
                          )}

                          {/* Main Content */}
                          <div className="flex-1 p-3 sm:p-4 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-2 sm:line-clamp-1 break-words">
                                    {case_.title || case_.title_en || case_.title_ar || 'Untitled Case'}
                                  </h3>
                                  {/* Beneficiary Icon - Clickable Action */}
                                  {beneficiaryName && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (beneficiary?.id) {
                                          router.push(`/${params.locale}/case-management/beneficiaries/${beneficiary.id}`)
                                        } else if (case_.beneficiary_contact) {
                                          // If no beneficiary ID but we have contact, show toast
                                          toast('Beneficiary Profile', {
                                            description: `Opening beneficiary profile for ${beneficiaryName}`,
                                            action: {
                                              label: 'View',
                                              onClick: () => {
                                                // Try to find beneficiary by contact
                                                router.push(`/${params.locale}/case-management/beneficiaries?search=${encodeURIComponent(case_.beneficiary_contact || '')}`)
                                              }
                                            }
                                          })
                                        }
                                      }}
                                      className="flex-shrink-0 p-1.5 rounded-full transition-colors group"
                                      style={{ 
                                        backgroundColor: 'transparent'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = brandColors.meen[50]
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent'
                                      }}
                                      title={`View beneficiary: ${beneficiaryName}`}
                                    >
                                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:transition-colors" style={{ color: brandColors.meen[500] }} />
                                    </button>
                                  )}
                                </div>
                                <p className="text-gray-600 text-xs sm:text-sm line-clamp-2 mb-2 sm:mb-3 break-words">
                                  {case_.description || case_.description_en || case_.description_ar || 'No description'}
                                </p>
                              </div>
                              <div className="flex-shrink-0">
                                {getStatusBadge(case_.status)}
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-2 sm:mb-3">
                              <div className="flex items-center justify-between text-xs sm:text-sm text-gray-700 mb-1 sm:mb-1.5">
                                <span className="font-medium">Funding Progress</span>
                                <span className="font-semibold text-gray-900">
                                  {getProgressPercentage(case_.approved_amount || 0, case_.target_amount).toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                                <div
                                  className="h-2 sm:h-3 rounded-full transition-all duration-500 shadow-sm"
                                  style={{ 
                                    width: `${getProgressPercentage(case_.approved_amount || 0, case_.target_amount)}%`,
                                    background: theme.gradients.progress
                                  }}
                                ></div>
                              </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3">
                              <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border min-w-0" style={{ backgroundColor: brandColors.ma3ana[50], borderColor: brandColors.ma3ana[200] }}>
                                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" style={{ color: brandColors.ma3ana[600] }} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-600">Raised</p>
                                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                    {formatAmount(case_.approved_amount || 0)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border min-w-0" style={{ backgroundColor: brandColors.meen[50], borderColor: brandColors.meen[200] }}>
                                <Target className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" style={{ color: brandColors.meen[600] }} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-600">Target</p>
                                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                    {formatAmount(case_.target_amount)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border min-w-0" style={{ background: theme.gradients.brandSubtle, borderColor: brandColors.meen[200] }}>
                                <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" style={{ color: brandColors.meen[600] }} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-600">Contributors</p>
                                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                    {case_.contributor_count || 0}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border min-w-0" style={{ backgroundColor: brandColors.ma3ana[50], borderColor: brandColors.ma3ana[200] }}>
                                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" style={{ color: brandColors.ma3ana[600] }} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-gray-600">Created</p>
                                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                    {formatDate(case_.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Admin Disclaimer */}
                            {case_.total_contributions != null && case_.approved_amount != null && 
                             case_.total_contributions !== case_.approved_amount && (
                              <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                  <p className="text-xs text-amber-800 break-words">
                                    <strong>Note:</strong> Total contributions: {formatAmount(case_.total_contributions)} 
                                    (includes pending/rejected contributions)
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions Sidebar */}
                          <div className="flex flex-row md:flex-col gap-2 p-4 sm:p-6 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-200 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/${params.locale}/cases/${case_.id}`)}
                              className="flex-1 md:flex-none w-full md:w-auto border-2 text-xs sm:text-sm"
                              style={{
                                borderColor: brandColors.meen[200],
                                color: brandColors.meen[700]
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = brandColors.meen[500]
                                e.currentTarget.style.backgroundColor = brandColors.meen[50]
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = brandColors.meen[200]
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/${params.locale}/case-management/cases/${case_.id}/edit`)}
                              className="flex-1 md:flex-none w-full md:w-auto border-2 text-xs sm:text-sm"
                              style={{
                                borderColor: brandColors.meen[200],
                                color: brandColors.meen[700]
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = brandColors.meen[500]
                                e.currentTarget.style.backgroundColor = brandColors.meen[50]
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = brandColors.meen[200]
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickUpdateClick(case_)}
                              className="flex-1 md:flex-none w-full md:w-auto border-2 text-xs sm:text-sm"
                              style={{
                                borderColor: brandColors.meen[300],
                                color: brandColors.meen[700]
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = brandColors.meen[500]
                                e.currentTarget.style.backgroundColor = brandColors.meen[50]
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = brandColors.meen[300]
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                            >
                              <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Quick Update
                            </Button>
                            {(hasPermission('contributions:create') || hasPermission('admin:contributions')) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAddContributionModal({
                                  open: true,
                                  caseId: case_.id,
                                  caseTitle: case_.title || case_.title_en || case_.title_ar || 'Untitled Case'
                                })}
                                className="flex-1 md:flex-none w-full md:w-auto border-2 text-xs sm:text-sm"
                                style={{
                                  borderColor: brandColors.meen[400],
                                  color: brandColors.meen[700]
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = brandColors.meen[500]
                                  e.currentTarget.style.backgroundColor = brandColors.meen[50]
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = brandColors.meen[400]
                                  e.currentTarget.style.backgroundColor = 'transparent'
                                }}
                              >
                                <Gift className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Add Contribution
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(case_.id, case_.title || case_.title_en || case_.title_ar || 'Untitled Case')}
                              className="flex-1 md:flex-none w-full md:w-auto border-2 text-xs sm:text-sm"
                              style={{
                                borderColor: brandColors.ma3ana[200],
                                color: brandColors.ma3ana[600]
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = brandColors.ma3ana[500]
                                e.currentTarget.style.backgroundColor = brandColors.ma3ana[50]
                                e.currentTarget.style.color = brandColors.ma3ana[700]
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = brandColors.ma3ana[200]
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.color = brandColors.ma3ana[600]
                              }}
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    )
                  })}
                </div>
                
                {/* Load More button for mobile */}
                {pagination.showLoadMoreButton && (
                  <div className="flex justify-center py-4 sm:hidden">
                    <Button
                      onClick={pagination.handleLoadMore}
                      disabled={pagination.state.isLoadingMore}
                      className="text-white min-w-[120px]"
                      style={{
                        background: theme.gradients.primary,
                        boxShadow: theme.shadows.primary
                      }}
                      onMouseEnter={(e) => {
                        if (!pagination.state.isLoadingMore) {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${brandColors.meen[600]} 0%, ${brandColors.meen[700]} 100%)`
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!pagination.state.isLoadingMore) {
                          e.currentTarget.style.background = theme.gradients.primary
                        }
                      }}
                    >
                      {pagination.state.isLoadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  </div>
                )}
                
                {/* End of list indicator on mobile */}
                {pagination.state.currentPage >= pagination.state.totalPages && filteredCases.length > pagination.state.itemsPerPage && (
                  <div className="text-center py-4 text-sm text-gray-500 sm:hidden">
                    You&apos;ve reached the end of the list
                  </div>
                )}

                {/* Pagination Controls - Hidden on mobile, shown on desktop */}
                {pagination.state.totalPages > 1 && (
                  <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mt-4 sm:mt-6 hidden sm:block" style={{ boxShadow: theme.shadows.primary }}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-center sm:justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.state.currentPage - 1)}
                            disabled={pagination.state.currentPage === 1}
                            className="flex items-center gap-1 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                            style={{
                              borderColor: brandColors.meen[200],
                              color: brandColors.meen[700]
                            }}
                            onMouseEnter={(e) => {
                              if (pagination.state.currentPage !== 1) {
                                e.currentTarget.style.borderColor = brandColors.meen[500]
                                e.currentTarget.style.backgroundColor = brandColors.meen[50]
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (pagination.state.currentPage !== 1) {
                                e.currentTarget.style.borderColor = brandColors.meen[200]
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }
                            }}
                          >
                            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Previous</span>
                            <span className="sm:hidden">Prev</span>
                          </Button>
                          
                          <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto max-w-full">
                            {getPageNumbers().map((page, index) => (
                              page === '...' ? (
                                <span key={`ellipsis-${index}`} className="px-1 sm:px-2 text-gray-400 text-xs sm:text-sm">
                                  ...
                                </span>
                              ) : (
                                <Button
                                  key={page}
                                  variant={pagination.state.currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePageChange(page as number)}
                                  className="min-w-[32px] sm:min-w-[40px] h-7 sm:h-8 px-1 sm:px-2 text-xs sm:text-sm"
                                  style={
                                    pagination.state.currentPage === page
                                      ? {
                                          background: theme.gradients.primary,
                                          boxShadow: theme.shadows.primary,
                                          color: 'white',
                                          borderColor: 'transparent'
                                        }
                                      : {
                                          borderColor: brandColors.meen[200],
                                          color: brandColors.meen[700]
                                        }
                                  }
                                  onMouseEnter={(e) => {
                                    if (pagination.state.currentPage !== page) {
                                      e.currentTarget.style.borderColor = brandColors.meen[500]
                                      e.currentTarget.style.backgroundColor = brandColors.meen[50]
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (pagination.state.currentPage !== page) {
                                      e.currentTarget.style.borderColor = brandColors.meen[200]
                                      e.currentTarget.style.backgroundColor = 'transparent'
                                    }
                                  }}
                                >
                                  {page}
                                </Button>
                              )
                            ))}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.state.currentPage + 1)}
                            disabled={pagination.state.currentPage === pagination.state.totalPages}
                            className="flex items-center gap-1 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                            style={{
                              borderColor: brandColors.meen[200],
                              color: brandColors.meen[700]
                            }}
                            onMouseEnter={(e) => {
                              if (pagination.state.currentPage !== pagination.state.totalPages) {
                                e.currentTarget.style.borderColor = brandColors.meen[500]
                                e.currentTarget.style.backgroundColor = brandColors.meen[50]
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (pagination.state.currentPage !== pagination.state.totalPages) {
                                e.currentTarget.style.borderColor = brandColors.meen[200]
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }
                            }}
                          >
                            <span className="hidden sm:inline">Next</span>
                            <span className="sm:hidden">Next</span>
                            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                        
                        <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                          Page {pagination.state.currentPage} of {pagination.state.totalPages}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Mobile pagination info - always visible on mobile */}
                {pagination.state.totalPages > 1 && (
                  <div className="sm:hidden mt-4 text-center text-xs text-gray-600">
                    Showing {paginatedCases.length} of {filteredCases.length} cases
                  </div>
                )}
              </>
            )}
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
                      <p>Are you sure you want to delete the case <strong>{deleteDialog.caseTitle}</strong>?</p>
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
                        You are about to permanently delete case <strong>{deleteDialog.caseTitle}</strong> and ALL its related data.
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

        {/* Quick Update Dialog */}
        <Dialog open={quickUpdateDialog.isOpen} onOpenChange={handleQuickUpdateCancel}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-indigo-600" />
                Quick Update Case
              </DialogTitle>
              <DialogDescription>
                Update status, category, and priority for: <strong>{quickUpdateDialog.caseTitle}</strong>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="quick-status" className="flex items-center gap-2 text-sm font-semibold">
                  <Info className="h-4 w-4 text-blue-600" />
                  Status
                </Label>
                <Select
                  value={updateFormData.status}
                  onValueChange={(value) => setUpdateFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger 
                    id="quick-status" 
                    className={`h-10 ${
                      updateFormData.status === 'published' ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' :
                      updateFormData.status === 'active' ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' :
                      updateFormData.status === 'completed' ? 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200' :
                      updateFormData.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' :
                      'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                      >
                    <SelectValue>
                        {updateFormData.status.charAt(0).toUpperCase() + updateFormData.status.slice(1)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-[110]">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="quick-category" className="flex items-center gap-2 text-sm font-semibold">
                  <Tag className="h-4 w-4 text-purple-600" />
                  Category
                </Label>
                <Select
                  value={updateFormData.category || '__none__'}
                  onValueChange={(value) => {
                    if (value === '__none__') {
                      setUpdateFormData(prev => ({ ...prev, category: null, category_id: null }))
                    } else {
                      const selectedCategory = categories.find(cat => 
                        cat.name === value || 
                        (cat as any).name_en === value ||
                        (cat as any).name_ar === value
                      )
                      const categoryName = selectedCategory ? ((selectedCategory as any).name_en || selectedCategory.name) : value
                      setUpdateFormData(prev => ({
                        ...prev,
                        category: categoryName,
                        category_id: selectedCategory?.id || null
                      }))
                    }
                  }}
                >
                  <SelectTrigger 
                    id="quick-category" 
                    className={`h-10 ${(() => {
                      if (!updateFormData.category) return 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      const selectedCategory = categories.find(cat => 
                        cat.name === updateFormData.category || 
                        (cat as any).name_en === updateFormData.category ||
                        (cat as any).name_ar === updateFormData.category
                      )
                      const categoryColor = selectedCategory?.color || null
                      return getCategoryBadgeClass(updateFormData.category, categoryColor) + ' hover:opacity-80'
                    })()}`}
                  >
                    <SelectValue placeholder="Not specified">
                      {(() => {
                        if (!updateFormData.category) return 'Not specified'
                        const selectedCategory = categories.find(cat => 
                          cat.name === updateFormData.category || 
                          (cat as any).name_en === updateFormData.category ||
                          (cat as any).name_ar === updateFormData.category
                        )
                        const iconValue = selectedCategory?.icon || null
                        return (
                            <div className="flex items-center gap-1.5">
                              {iconValue ? (
                                <DynamicIcon name={iconValue} className="h-3 w-3" fallback="tag" />
                              ) : (
                                <Tag className="h-3 w-3" />
                              )}
                            <span>{updateFormData.category}</span>
                            </div>
                        )
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-[110]">
                    <SelectItem value="__none__">
                      <span className="text-gray-500">Not specified</span>
                    </SelectItem>
                    {categories.map((category) => {
                      const iconValue = category.icon
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
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="quick-priority" className="flex items-center gap-2 text-sm font-semibold">
                  <Flag className="h-4 w-4 text-orange-600" />
                  Priority Level
                </Label>
                <Select
                  value={updateFormData.priority}
                  onValueChange={(value) => setUpdateFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger 
                    id="quick-priority" 
                    className={`h-10 ${getPriorityBadgeClass(updateFormData.priority)} hover:opacity-80`}
                  >
                    <SelectValue>
                        {updateFormData.priority.charAt(0).toUpperCase() + updateFormData.priority.slice(1)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-[110]">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleQuickUpdateCancel}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleQuickUpdateSave}
                disabled={updating}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Contribution Modal */}
        {addContributionModal.caseId && (
          <AdminContributionModal
            open={addContributionModal.open}
            onClose={() => setAddContributionModal({
              open: false,
              caseId: null,
              caseTitle: ''
            })}
            onSuccess={() => {
              fetchCases() // Refresh cases list
              setAddContributionModal({
                open: false,
                caseId: null,
                caseTitle: ''
              })
            }}
            caseId={addContributionModal.caseId}
            caseTitle={addContributionModal.caseTitle}
          />
        )}
      </PermissionGuard>
    </ProtectedRoute>
  )
} 