'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  DollarSign, 
  Tag, 
  MapPin, 
  User as UserIcon,
  Calendar,
  Clock,
  Repeat,
  AlertCircle,
  CheckCircle2,
  Info,
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
  Gift,
  Building2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import BeneficiarySelector from '@/components/beneficiaries/BeneficiarySelector'
import type { Beneficiary } from '@/types/beneficiary'

interface Category {
  id: string
  name: string
  name_en: string | null
  name_ar: string | null
  icon: string | null
  color: string | null
}

type CaseType = 'one-time' | 'recurring'
type Priority = '' | 'low' | 'medium' | 'high' | 'critical'
type Frequency = '' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

interface CaseFormData {
  title: string
  title_en: string
  title_ar: string
  description: string
  description_en: string
  description_ar: string
  targetAmount: string
  category: string
  category_icon?: string | null
  category_color?: string | null
  priority: Priority
  location: string
  selectedBeneficiary: Beneficiary | null
  duration: string
  frequency?: Frequency
  startDate: string
  endDate: string
}

export default function CaseDetailsPage() {
  const t = useTranslations('cases')
  const tAuth = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const locale = params.locale as string
  const caseType = searchParams.get('type') as CaseType
  const { toast } = useToast()

  const [formData, setFormData] = useState<CaseFormData>({
    title: '',
    title_en: '',
    title_ar: '',
    description: '',
    description_en: '',
    description_ar: '',
    targetAmount: '',
    category: '',
    category_icon: null,
    category_color: null,
    priority: '',
    location: '',
    selectedBeneficiary: null,
    duration: '',
    frequency: undefined,
    startDate: '',
    endDate: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  const supabase = createClient()

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true)
      const response = await fetch('/api/categories')
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }
      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to load categories',
      })
    } finally {
      setLoadingCategories(false)
    }
  }, [toast])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

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
    
    // Real-time validation (only for required fields)
    const newErrors = { ...errors }
    
    // Clear existing error
    if (newErrors[field]) {
      delete newErrors[field]
    }
    
    // Validate the changed field (ONLY REQUIRED FIELDS)
    if (field === 'title_en' || field === 'title_ar') {
      const titleEn = field === 'title_en' ? value : formData.title_en
      const titleAr = field === 'title_ar' ? value : formData.title_ar
      const finalTitle = titleEn || titleAr
      
      if (!finalTitle.trim()) {
        newErrors.title = t('validation.titleRequired')
      } else if (finalTitle.trim().length < 10) {
        newErrors.title = t('validation.titleTooShort')
      } else if (finalTitle.trim().length > 100) {
        newErrors.title = t('validation.titleTooLong')
      }
    } else if (field === 'description_en' || field === 'description_ar') {
      const descEn = field === 'description_en' ? value : formData.description_en
      const descAr = field === 'description_ar' ? value : formData.description_ar
      const finalDesc = descEn || descAr
      
      if (!finalDesc.trim()) {
        newErrors.description = t('validation.descriptionRequired')
      } else if (finalDesc.trim().length < 50) {
        newErrors.description = t('validation.descriptionTooShort')
      } else if (finalDesc.trim().length > 2000) {
        newErrors.description = t('validation.descriptionTooLong')
      }
    } else if (field === 'title') {
      // Legacy support
      if (!value.trim()) {
        newErrors.title = t('validation.titleRequired')
      } else if (value.trim().length < 10) {
        newErrors.title = t('validation.titleTooShort')
      } else if (value.trim().length > 100) {
        newErrors.title = t('validation.titleTooLong')
      }
    } else if (field === 'description') {
      // Legacy support
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
    } else if (field === 'category') {
      if (!value) {
        newErrors.category = t('validation.categoryRequired')
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
    // Optional fields (location, beneficiaryName, beneficiaryContact, category, priority) - no validation
    
    setErrors(newErrors)
  }

  const handleBeneficiarySelect = (beneficiary: Beneficiary | null) => {
    setFormData(prev => ({ ...prev, selectedBeneficiary: beneficiary }))
    
    // Clear beneficiary-related errors
    if (errors.beneficiary) {
      setErrors(prev => ({ ...prev, beneficiary: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Title validation (REQUIRED) - at least one language must be provided
    const hasTitleEn = formData.title_en.trim().length > 0
    const hasTitleAr = formData.title_ar.trim().length > 0
    const finalTitle = formData.title_en || formData.title_ar || formData.title
    
    if (!finalTitle.trim()) {
      newErrors.title = t('validation.titleRequired')
    } else if (finalTitle.trim().length < 10) {
      newErrors.title = t('validation.titleTooShort')
    } else if (finalTitle.trim().length > 100) {
      newErrors.title = t('validation.titleTooLong')
    }

    // Description validation (REQUIRED) - at least one language must be provided
    const hasDescEn = formData.description_en.trim().length > 0
    const hasDescAr = formData.description_ar.trim().length > 0
    const finalDesc = formData.description_en || formData.description_ar || formData.description
    
    if (!finalDesc.trim()) {
      newErrors.description = t('validation.descriptionRequired')
    } else if (finalDesc.trim().length < 50) {
      newErrors.description = t('validation.descriptionTooShort')
    } else if (finalDesc.trim().length > 2000) {
      newErrors.description = t('validation.descriptionTooLong')
    }

    // Target amount validation (REQUIRED)
    if (!formData.targetAmount) {
      newErrors.targetAmount = t('validation.targetAmountRequired')
    } else if (parseFloat(formData.targetAmount) <= 0) {
      newErrors.targetAmount = t('validation.targetAmountInvalid')
    } else if (parseFloat(formData.targetAmount) > 1000000) {
      newErrors.targetAmount = t('validation.targetAmountTooHigh')
    }

    // Category validation (REQUIRED)
    if (!formData.category) {
      newErrors.category = t('validation.categoryRequired')
    }

    // Beneficiary validation (REQUIRED)
    if (!formData.selectedBeneficiary) {
      newErrors.beneficiary = t('validation.beneficiaryRequired')
    }

    // Priority validation (OPTIONAL - removed)
    // Location validation (OPTIONAL - removed)
    // Beneficiary validation (OPTIONAL - removed)

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
    console.log('Continue button clicked')
    console.log('Form data:', formData)
    console.log('Case type:', caseType)
    
    const isValid = validateForm()
    console.log('Form validation result:', isValid)
    console.log('Validation errors:', errors)
    
    if (isValid) {
      console.log('Validation passed, navigating to images page')
      // Store form data in session storage
      sessionStorage.setItem('caseFormData', JSON.stringify(formData))
      const nextUrl = `/${locale}/cases/create/images?type=${caseType}`
      console.log('Navigating to:', nextUrl)
      router.push(nextUrl)
    } else {
      console.log('Validation failed, showing error toast')
      // Show validation error toast
      toast({
        type: 'error',
        title: t('validationError'),
        description: t('pleaseFixErrors'),
      })
      
      // Scroll to first error
      const firstErrorField = document.querySelector('.border-red-500')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const handleSaveDraft = async () => {
    if (!user) {
      toast({
        type: 'error',
        title: t('error'),
        description: tAuth('pleaseLoginFirst'),
      })
      return
    }

    // Prevent multiple submissions
    if (saving) {
      return
    }

    setSaving(true)
    try {
      // Create draft case using API endpoint
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title_en: formData.title_en || formData.title || '',
          title_ar: formData.title_ar || formData.title || '',
          description_en: formData.description_en || formData.description || '',
          description_ar: formData.description_ar || formData.description || '',
          targetAmount: formData.targetAmount,
          category: formData.category,
          priority: formData.priority,
          location: formData.location,
          beneficiaryName: formData.selectedBeneficiary?.name || '',
          beneficiaryContact: formData.selectedBeneficiary?.mobile_number || '',
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
      
      // Show success message
      toast({
        type: 'success',
        title: t('draftSaved'),
        description: t('draftSavedSuccessfully'),
      })

      console.log('Draft saved successfully:', result.case)
      
      // Redirect to cases list after a short delay
      setTimeout(() => {
        router.push(`/${locale}/admin/cases`)
      }, 1500)
    } catch (error) {
      console.error('Error saving draft:', error)
      
      // Show error message
      toast({
        type: 'error',
        title: t('saveFailed'),
        description: error instanceof Error ? error.message : t('failedToSaveDraft'),
      })
    } finally {
      setSaving(false)
    }
  }

  // Calculate form completion percentage
  const calculateProgress = () => {
    const requiredFields = [
      formData.title_en || formData.title_ar,
      formData.description_en || formData.description_ar,
      formData.targetAmount,
      formData.category,
      formData.selectedBeneficiary,
      caseType === 'one-time' ? formData.duration : (formData.frequency && formData.startDate && formData.endDate)
    ]
    const completedFields = requiredFields.filter(Boolean).length
    return Math.round((completedFields / requiredFields.length) * 100)
  }

  const progress = calculateProgress()

  // Helper function to check if a string is an emoji
  const isEmoji = (str: string | null | undefined): boolean => {
    if (!str) return false
    // Check if the string contains emoji characters
    // Emojis are typically single characters with high Unicode values
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u
    return emojiRegex.test(str) || str.length <= 2 // Also treat very short strings as potential emojis
  }

  // Helper function to get category icon component or emoji
  const getCategoryIcon = (iconName: string | null | undefined): LucideIcon | null => {
    if (!iconName) return Tag
    
    // If it's an emoji, return null (we'll render it directly)
    if (isEmoji(iconName)) {
      return null
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

  // Helper function to get category badge class based on color
  const getCategoryBadgeClass = (categoryName: string, color: string | null): string => {
    if (color) {
      // Convert hex color to Tailwind-like classes
      // For now, use a simple mapping approach
      const colorMap: Record<string, string> = {
        '#ef4444': 'bg-red-100 text-red-700 border-red-300',
        '#3b82f6': 'bg-blue-100 text-blue-700 border-blue-300',
        '#10b981': 'bg-green-100 text-green-700 border-green-300',
        '#f59e0b': 'bg-yellow-100 text-yellow-700 border-yellow-300',
        '#8b5cf6': 'bg-purple-100 text-purple-700 border-purple-300',
        '#ec4899': 'bg-pink-100 text-pink-700 border-pink-300',
        '#06b6d4': 'bg-cyan-100 text-cyan-700 border-cyan-300',
        '#f97316': 'bg-orange-100 text-orange-700 border-orange-300',
      }
      
      // Try to find exact match
      if (colorMap[color.toLowerCase()]) {
        return colorMap[color.toLowerCase()]
      }
      
      // Try to match by color name
      const colorNameMap: Record<string, string> = {
        'red': 'bg-red-100 text-red-700 border-red-300',
        'blue': 'bg-blue-100 text-blue-700 border-blue-300',
        'green': 'bg-green-100 text-green-700 border-green-300',
        'yellow': 'bg-yellow-100 text-yellow-700 border-yellow-300',
        'purple': 'bg-purple-100 text-purple-700 border-purple-300',
        'pink': 'bg-pink-100 text-pink-700 border-pink-300',
        'cyan': 'bg-cyan-100 text-cyan-700 border-cyan-300',
        'orange': 'bg-orange-100 text-orange-700 border-orange-300',
      }
      
      if (colorNameMap[color.toLowerCase()]) {
        return colorNameMap[color.toLowerCase()]
      }
    }
    
    // Default badge styling based on category name
    const categoryMap: Record<string, string> = {
      'Medical Support': 'bg-red-100 text-red-700 border-red-300',
      'Educational Assistance': 'bg-blue-100 text-blue-700 border-blue-300',
      'Housing & Rent': 'bg-green-100 text-green-700 border-green-300',
      'Emergency Relief': 'bg-orange-100 text-orange-700 border-orange-300',
      'Basic Needs & Clothing': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'Community & Social': 'bg-purple-100 text-purple-700 border-purple-300',
      'Livelihood & Business': 'bg-cyan-100 text-cyan-700 border-cyan-300',
      'Home Appliances': 'bg-pink-100 text-pink-700 border-pink-300',
      'Other Support': 'bg-gray-100 text-gray-700 border-gray-300',
    }
    
    return categoryMap[categoryName] || 'bg-gray-100 text-gray-700 border-gray-300'
  }

  if (!caseType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 sm:py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t('caseDetails')}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {caseType === 'one-time' ? t('oneTimeCase') : t('recurringCase')}
              </p>
            </div>
            {/* Progress Indicator */}
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  {progress}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Information Section */}
          <Card className="shadow-md border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-blue-600" />
                Basic Information
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Provide the essential details about the case in both English and Arabic
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Bilingual Title Fields */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Title</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title_en" className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">English</span>
                      <span className="text-red-500 text-xs">*</span>
                      {(formData.title_en || formData.title_ar) && !errors.title && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="title_en"
                        value={formData.title_en}
                        onChange={(e) => handleInputChange('title_en', e.target.value)}
                        placeholder="Enter case title in English"
                        className={`pr-10 ${errors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        dir="ltr"
                        maxLength={100}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {formData.title_en.length}/100
                      </div>
                    </div>
                    {errors.title && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="title_ar" className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">العربية</span>
                      <span className="text-red-500 text-xs">*</span>
                      {(formData.title_en || formData.title_ar) && !errors.title && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="title_ar"
                        value={formData.title_ar}
                        onChange={(e) => handleInputChange('title_ar', e.target.value)}
                        placeholder="أدخل عنوان الحالة بالعربية"
                        className={`pl-10 ${errors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        dir="rtl"
                        maxLength={100}
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        {formData.title_ar.length}/100
                      </div>
                    </div>
                    {errors.title && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.title}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  At least one language (English or Arabic) is required
                </p>
              </div>

              {/* Bilingual Description Fields */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="description_en" className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">English</span>
                      <span className="text-red-500 text-xs">*</span>
                      {(formData.description_en || formData.description_ar) && !errors.description && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </Label>
                    <div className="relative">
                      <Textarea
                        id="description_en"
                        value={formData.description_en}
                        onChange={(e) => handleInputChange('description_en', e.target.value)}
                        placeholder="Enter case description in English"
                        rows={5}
                        className={`pr-12 ${errors.description ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        dir="ltr"
                        maxLength={2000}
                      />
                      <div className="absolute bottom-2 right-3 text-xs text-gray-400 bg-white px-1.5 rounded">
                        {formData.description_en.length}/2000
                      </div>
                    </div>
                    {errors.description && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description_ar" className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">العربية</span>
                      <span className="text-red-500 text-xs">*</span>
                      {(formData.description_en || formData.description_ar) && !errors.description && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </Label>
                    <div className="relative">
                      <Textarea
                        id="description_ar"
                        value={formData.description_ar}
                        onChange={(e) => handleInputChange('description_ar', e.target.value)}
                        placeholder="أدخل وصف الحالة بالعربية"
                        rows={5}
                        className={`pl-12 ${errors.description ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        dir="rtl"
                        maxLength={2000}
                      />
                      <div className="absolute bottom-2 left-3 text-xs text-gray-400 bg-white px-1.5 rounded">
                        {formData.description_ar.length}/2000
                      </div>
                    </div>
                    {errors.description && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.description}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  At least one language (English or Arabic) is required. Minimum 50 characters.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Case Details Section */}
          <Card className="shadow-md border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="h-5 w-5 text-purple-600" />
                Case Details
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Specify the financial and categorical information
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <div>
                  <Label htmlFor="targetAmount" className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{t('targetAmount')}</span>
                    <span className="text-red-500 text-xs">*</span>
                    {formData.targetAmount && !errors.targetAmount && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="targetAmount"
                      type="number"
                      value={formData.targetAmount}
                      onChange={(e) => handleInputChange('targetAmount', e.target.value)}
                      placeholder={t('targetAmountPlaceholder') || 'Enter target amount'}
                      className={`pl-10 ${errors.targetAmount ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      min="0"
                      step="0.01"
                    />
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    {formData.targetAmount && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                        EGP
                      </span>
                    )}
                  </div>
                  {errors.targetAmount && (
                    <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.targetAmount}
                    </p>
                  )}
                  {formData.targetAmount && !errors.targetAmount && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      Maximum: 1,000,000 EGP
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category" className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{t('category')}</span>
                    <span className="text-red-500 text-xs">*</span>
                    {formData.category && !errors.category && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                    )}
                  </Label>
                  <Select
                    value={formData.category || ''}
                    onValueChange={(value) => {
                      if (!value) {
                        handleInputChange('category', '')
                        setFormData(prev => ({ ...prev, category_icon: null, category_color: null }))
                      } else {
                        const selectedCategory = categories.find(cat => 
                          (cat.name_en || cat.name || cat.id) === value
                        )
                        handleInputChange('category', value)
                        setFormData(prev => ({ 
                          ...prev, 
                          category_icon: selectedCategory?.icon || null,
                          category_color: selectedCategory?.color || null
                        }))
                      }
                    }}
                    disabled={loadingCategories}
                  >
                    <SelectTrigger 
                      id="category"
                      className={errors.category ? 'border-red-500 focus:ring-red-500' : ''}
                    >
                      <SelectValue placeholder={loadingCategories ? 'Loading categories...' : t('selectCategory')}>
                        {formData.category ? (() => {
                          const selectedCategory = categories.find(cat => 
                            (cat.name_en || cat.name || cat.id) === formData.category
                          )
                          const iconValue = formData.category_icon || selectedCategory?.icon || null
                          const IconComponent = getCategoryIcon(iconValue)
                          const categoryName = selectedCategory?.name_en || selectedCategory?.name || formData.category
                          return (
                            <Badge variant="outline" className={getCategoryBadgeClass(categoryName, formData.category_color || selectedCategory?.color || null)}>
                              <div className="flex items-center gap-1.5">
                                {IconComponent ? (
                                  <IconComponent className="h-3 w-3" />
                                ) : iconValue ? (
                                  <span className="text-base">{iconValue}</span>
                                ) : (
                                  <Tag className="h-3 w-3" />
                                )}
                                {categoryName}
                              </div>
                            </Badge>
                          )
                        })() : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 && !loadingCategories && (
                        <SelectItem value="medical">Medical</SelectItem>
                      )}
                      {categories.map((cat) => {
                        const iconValue = cat.icon
                        const IconComponent = getCategoryIcon(iconValue)
                        const categoryName = cat.name_en || cat.name || cat.id
                        return (
                          <SelectItem key={cat.id} value={categoryName}>
                            <div className="flex items-center gap-2">
                              {IconComponent ? (
                                <IconComponent className="h-4 w-4" />
                              ) : iconValue ? (
                                <span className="text-base">{iconValue}</span>
                              ) : null}
                              <span>{categoryName}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {formData.category && (() => {
                    const selectedCategory = categories.find(cat => 
                      (cat.name_en || cat.name || cat.id) === formData.category
                    )
                    const iconValue = formData.category_icon || selectedCategory?.icon || null
                    const IconComponent = getCategoryIcon(iconValue)
                    const categoryName = selectedCategory?.name_en || selectedCategory?.name || formData.category
                    return (
                      <div className="mt-1.5">
                        <Badge variant="outline" className={getCategoryBadgeClass(categoryName, formData.category_color || selectedCategory?.color || null)}>
                          <div className="flex items-center gap-1.5">
                            {IconComponent ? (
                              <IconComponent className="h-3 w-3" />
                            ) : iconValue ? (
                              <span className="text-base">{iconValue}</span>
                            ) : (
                              <Tag className="h-3 w-3" />
                            )}
                            {categoryName}
                          </div>
                        </Badge>
                      </div>
                    )
                  })()}
                  {errors.category && (
                    <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.category}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="priority" className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">{t('priority')}</span>
                    <span className="text-xs text-gray-400">(Optional)</span>
                  </Label>
                  <Select
                    value={formData.priority || ''}
                    onValueChange={(value) => handleInputChange('priority', (value || '') as Priority)}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder={t('selectPriority') || 'Select priority'} />
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
                </div>

                <div>
                  <Label htmlFor="location" className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{t('location')}</span>
                    <span className="text-xs text-gray-400">(Optional)</span>
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder={t('locationPlaceholder') || 'Enter location'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Beneficiary Section */}
          <Card className="shadow-md border-0">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserIcon className="h-5 w-5 text-green-600" />
                Beneficiary Information
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Select or create the beneficiary for this case
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">{t('beneficiary')}</span>
                  <span className="text-red-500 text-xs">*</span>
                  {formData.selectedBeneficiary && !errors.beneficiary && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                  )}
                </Label>
                <BeneficiarySelector
                  selectedBeneficiary={formData.selectedBeneficiary}
                  onSelect={handleBeneficiarySelect}
                  showOpenButton={true}
                />
                {errors.beneficiary && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.beneficiary}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Case Type Specific Section */}
          {caseType === 'one-time' ? (
            <Card className="shadow-md border-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Duration
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Specify how long this case will be active
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="max-w-md">
                  <Label htmlFor="duration" className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700">{t('duration')}</span>
                    <span className="text-red-500 text-xs">*</span>
                    {formData.duration && !errors.duration && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', e.target.value)}
                      placeholder={t('durationPlaceholder') || 'Enter duration in days'}
                      className={`pr-16 ${errors.duration ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      min="1"
                      max="365"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      days
                    </span>
                  </div>
                  {errors.duration && (
                    <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.duration}
                    </p>
                  )}
                  {formData.duration && !errors.duration && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      Maximum: 365 days (1 year)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md border-0">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Repeat className="h-5 w-5 text-indigo-600" />
                  Recurring Schedule
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1">
                  Set up the recurring payment schedule
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="frequency" className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">{t('frequency')}</span>
                      <span className="text-red-500 text-xs">*</span>
                      {formData.frequency && !errors.frequency && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                      )}
                    </Label>
                    <Select
                      value={formData.frequency || ''}
                      onValueChange={(value) => handleInputChange('frequency', (value || '') as Frequency)}
                    >
                      <SelectTrigger 
                        id="frequency"
                        className={errors.frequency ? 'border-red-500 focus:ring-red-500' : ''}
                      >
                        <SelectValue placeholder={t('selectFrequency') || 'Select frequency'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.frequency && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.frequency}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="startDate" className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{t('startDate')}</span>
                      <span className="text-red-500 text-xs">*</span>
                      {formData.startDate && !errors.startDate && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                      )}
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className={errors.startDate ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.startDate && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.startDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="endDate" className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{t('endDate')}</span>
                      <span className="text-red-500 text-xs">*</span>
                      {formData.endDate && !errors.endDate && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                      )}
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className={errors.endDate ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                    />
                    {errors.endDate && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.endDate}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons - Sticky Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mt-8 z-10">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between gap-4">
            <Button 
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={saving}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                  {t('saving')}...
                </>
              ) : (
                t('saveDraft')
              )}
            </Button>
            <Button 
              onClick={handleNext}
              disabled={saving}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
            >
              {t('continue')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 