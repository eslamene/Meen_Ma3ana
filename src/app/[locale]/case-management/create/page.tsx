'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  Clock,
  Repeat,
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
import TranslationButton from '@/components/translation/TranslationButton'
import AIGenerateButton from '@/components/ai/AIGenerateButton'

import { defaultLogger as logger } from '@/lib/logger'

type CaseType = 'one-time' | 'recurring'

interface CaseFormData {
  title_en: string
  title_ar: string
  description_en: string
  description_ar: string
  target_amount: number | null
  status: string
  priority: string
  category_id: string | null
  category: string | null
  category_icon?: string | null
  category_color?: string | null
  location: string
  beneficiary_name: string | null
  beneficiary_contact: string | null
  case_type: CaseType
  duration: number | null
}

export default function CreateCasePage() {
  const t = useTranslations('cases')
  const router = useRouter()
  const params = useParams()
  const [caseFiles, setCaseFiles] = useState<CaseFile[]>([])
  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [categories, setCategories] = useState<Array<{id: string, name: string, name_en?: string, name_ar?: string, icon: string | null, color: string | null}>>([])
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null)
  const [caseType, setCaseType] = useState<CaseType | null>(null)
  const [draftCaseId, setDraftCaseId] = useState<string | null>(null)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [validationSettings, setValidationSettings] = useState<ValidationSettings | null>(null)
  const caseSavedRef = useRef<string | null>(null) // Track the saved case ID to prevent cleanup
  const draftCaseIdRef = useRef<string | null>(null) // Track draft case ID in ref to avoid closure issues
  const savingRef = useRef(false) // Track saving state in ref to avoid closure issues
  const { containerVariant } = useLayout()

  const supabase = createClient()
  const locale = params.locale as string

  const [formData, setFormData] = useState<CaseFormData>({
    title_en: '',
    title_ar: '',
    description_en: '',
    description_ar: '',
    target_amount: null,
    status: 'draft',
    priority: 'medium',
    category_id: null,
    category: null,
    category_icon: null,
    category_color: null,
    location: '',
    beneficiary_name: null,
    beneficiary_contact: null,
    case_type: 'one-time',
    duration: null
  })

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

  // Load validation settings
  useEffect(() => {
    const loadValidationSettings = async () => {
      try {
        const settings = await getValidationSettings()
        console.log('Validation settings loaded in create form:', settings)
        setValidationSettings(settings)
      } catch (error) {
        logger.error('Failed to load validation settings:', { error: error })
      }
    }
    loadValidationSettings()
  }, [])

  // Re-validate when validation settings are loaded
  useEffect(() => {
    if (!validationSettings) return
    
    // Re-validate all fields when settings load to update error messages
    if (formData.title_en) {
      handleInputChange('title_en', formData.title_en)
    }
    if (formData.title_ar) {
      handleInputChange('title_ar', formData.title_ar)
    }
    if (formData.description_en) {
      handleInputChange('description_en', formData.description_en)
    }
    if (formData.description_ar) {
      handleInputChange('description_ar', formData.description_ar)
    }
    if (formData.target_amount) {
      handleInputChange('target_amount', formData.target_amount)
    }
    if (formData.duration) {
      handleInputChange('duration', formData.duration)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationSettings])

  // Lazy creation of draft case - only when titles are valid AND user uploads files
  const ensureDraftCase = useCallback(async (): Promise<string | null> => {
    // If draft already exists, return it
    if (draftCaseId) {
      return draftCaseId
    }

    // If no case type selected, can't create draft
    if (!caseType) {
      return null
    }

    // If already creating, wait
    if (creatingDraft) {
      return null
    }

    // Validation settings must be loaded
    if (!validationSettings) {
      logger.warn('Validation settings not loaded, cannot create draft case')
      return null
    }

    // Check that both titles meet minimum length requirements
    const titleEn = formData.title_en?.trim() || ''
    const titleAr = formData.title_ar?.trim() || ''
    const minLength = validationSettings.caseTitleMinLength

    if (titleEn.length < minLength || titleAr.length < minLength) {
      console.log('Cannot create draft: titles do not meet minimum length requirements', {
        titleEnLength: titleEn.length,
        titleArLength: titleAr.length,
        minLength
      })
      return null
    }

        setCreatingDraft(true)
        try {
          const response = await fetch('/api/cases', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title_en: titleEn,
              title_ar: titleAr,
              description_en: formData.description_en || '',
              description_ar: formData.description_ar || '',
              targetAmount: formData.target_amount || 0,
              status: 'draft',
              priority: formData.priority || 'medium',
              type: caseType,
              category: formData.category || '__none__',
            }),
          })

          const result = await response.json()

          if (!response.ok) {
            const errorMsg = result.error || 'Failed to initialize case form'
            setError(errorMsg)
            toast.error('Create Failed', { description: errorMsg })
            setCreatingDraft(false)
            return null
          }

          const caseId = result.case?.id
          if (caseId) {
            setDraftCaseId(caseId)
            draftCaseIdRef.current = caseId
            setCreatingDraft(false)
            return caseId
          } else {
            const errorMsg = 'Failed to initialize case form: No case ID returned'
            setError(errorMsg)
            toast.error('Create Failed', { description: errorMsg })
            setCreatingDraft(false)
            return null
          }
        } catch (error) {
          logger.error('Error creating draft case:', { error: error })
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const errorMsg = `Failed to initialize case form: ${errorMessage}`
          setError(errorMsg)
          toast.error('Create Failed', { description: errorMsg })
          setCreatingDraft(false)
          return null
        }
  }, [caseType, draftCaseId, creatingDraft, formData, validationSettings])

  // Create draft case when files tab is active and titles are valid
  useEffect(() => {
    if (activeTab === 'files' && !draftCaseId && !creatingDraft && caseType && validationSettings) {
      const titleEn = formData.title_en?.trim() || ''
      const titleAr = formData.title_ar?.trim() || ''
      const minLength = validationSettings.caseTitleMinLength

      if (titleEn.length >= minLength && titleAr.length >= minLength) {
        ensureDraftCase().catch(err => {
          logger.error('Error creating draft case for file upload:', { error: err })
        })
      }
    }
  }, [activeTab, draftCaseId, creatingDraft, caseType, validationSettings, formData.title_en, formData.title_ar, ensureDraftCase])

  const handleInputChange = (field: keyof CaseFormData, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

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
      const titleEn = field === 'title_en' ? (value as string) : formData.title_en
      const titleAr = field === 'title_ar' ? (value as string) : formData.title_ar
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
      const descEn = field === 'description_en' ? (value as string) : formData.description_en
      const descAr = field === 'description_ar' ? (value as string) : formData.description_ar
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
    if (field === 'target_amount') {
      const amount = value as number
      if (!amount || amount <= 0) {
        newErrors.target_amount = t('validation.targetAmountInvalid') || 'Target amount must be greater than 0'
      } else if (amount > settings.caseTargetAmountMax) {
        newErrors.target_amount = t('validation.targetAmountTooHigh', { max: settings.caseTargetAmountMax.toLocaleString() }) || `Target amount must not exceed ${settings.caseTargetAmountMax.toLocaleString()} EGP`
      }
    }

    // Validate duration
    if (field === 'duration' && caseType === 'one-time') {
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

  const getCategoryIcon = (iconName: string | null | undefined): LucideIcon | null => {
    if (!iconName) return Tag
    
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u
    if (emojiRegex.test(iconName) || iconName.length <= 2) {
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

  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {}

    // Validation settings must be loaded before form validation
    if (!validationSettings) {
      logger.warn('Validation settings not loaded yet, cannot validate form')
      toast.error('Error', { description: 'Validation settings are loading. Please wait a moment and try again.' })
      return { isValid: false, errors: {} }
    }

    const settings = validationSettings

    // Title validation - at least one language required
    const finalTitle = formData.title_en || formData.title_ar
    if (!finalTitle || !finalTitle.trim()) {
      newErrors.title = t('validation.titleRequired') || 'At least one language (English or Arabic) is required'
    } else if (finalTitle.trim().length < settings.caseTitleMinLength) {
      newErrors.title = t('validation.titleTooShort', { min: settings.caseTitleMinLength }) || `Title must be at least ${settings.caseTitleMinLength} characters`
    } else if (finalTitle.trim().length > settings.caseTitleMaxLength) {
      newErrors.title = t('validation.titleTooLong', { max: settings.caseTitleMaxLength }) || `Title must not exceed ${settings.caseTitleMaxLength} characters`
    }

    // Individual title field validation
    if (formData.title_en && formData.title_en.trim().length > 0 && formData.title_en.trim().length < settings.caseTitleMinLength) {
      newErrors.title_en = t('validation.titleTooShort', { min: settings.caseTitleMinLength }) || `Title must be at least ${settings.caseTitleMinLength} characters`
    }
    if (formData.title_ar && formData.title_ar.trim().length > 0 && formData.title_ar.trim().length < settings.caseTitleMinLength) {
      newErrors.title_ar = t('validation.titleTooShort', { min: settings.caseTitleMinLength }) || `Title must be at least ${settings.caseTitleMinLength} characters`
    }

    // Description validation - at least one language required
    const finalDesc = formData.description_en || formData.description_ar
    if (!finalDesc || !finalDesc.trim()) {
      newErrors.description = t('validation.descriptionRequired') || 'At least one language (English or Arabic) is required'
    } else if (finalDesc.trim().length < settings.caseDescriptionMinLength) {
      newErrors.description = t('validation.descriptionTooShort', { min: settings.caseDescriptionMinLength }) || `Description must be at least ${settings.caseDescriptionMinLength} characters`
    } else if (finalDesc.trim().length > settings.caseDescriptionMaxLength) {
      newErrors.description = t('validation.descriptionTooLong', { max: settings.caseDescriptionMaxLength }) || `Description must not exceed ${settings.caseDescriptionMaxLength} characters`
    }

    // Individual description field validation
    if (formData.description_en && formData.description_en.trim().length > 0 && formData.description_en.trim().length < settings.caseDescriptionMinLength) {
      newErrors.description_en = t('validation.descriptionTooShort', { min: settings.caseDescriptionMinLength }) || `Description must be at least ${settings.caseDescriptionMinLength} characters`
    }
    if (formData.description_ar && formData.description_ar.trim().length > 0 && formData.description_ar.trim().length < settings.caseDescriptionMinLength) {
      newErrors.description_ar = t('validation.descriptionTooShort', { min: settings.caseDescriptionMinLength }) || `Description must be at least ${settings.caseDescriptionMinLength} characters`
    }

    // Target amount validation
    if (!formData.target_amount || formData.target_amount <= 0) {
      newErrors.target_amount = t('validation.targetAmountRequired') || 'Target amount is required'
    } else if (formData.target_amount > settings.caseTargetAmountMax) {
      newErrors.target_amount = t('validation.targetAmountTooHigh', { max: settings.caseTargetAmountMax.toLocaleString() }) || `Target amount must not exceed ${settings.caseTargetAmountMax.toLocaleString()} EGP`
    }

    // Duration validation (for one-time cases)
    if (caseType === 'one-time' && formData.duration !== null && formData.duration !== undefined) {
      if (formData.duration <= 0) {
        newErrors.duration = t('validation.durationInvalid') || 'Duration must be greater than 0'
      } else if (formData.duration > settings.caseDurationMax) {
        newErrors.duration = t('validation.durationTooLong') || `Duration must not exceed ${settings.caseDurationMax} days`
      }
    }

    // Category validation - required
    if (!formData.category || !formData.category.trim() || formData.category === '__none__') {
      newErrors.category = t('validation.categoryRequired') || 'Category is required'
    }

    setErrors(newErrors)
    const isValid = Object.keys(newErrors).length === 0
    return { isValid, errors: newErrors }
  }

  // Check if form is valid enough to enable the submit button
  const isFormValid = (): boolean => {
    // Validation settings must be loaded
    if (!validationSettings) {
      return false
    }

    const settings = validationSettings

    // Check required fields - at least one title must be provided
    const hasTitleEn = formData.title_en && formData.title_en.trim()
    const hasTitleAr = formData.title_ar && formData.title_ar.trim()
    
    if (!hasTitleEn && !hasTitleAr) {
      return false
    }
    
    // If English title is provided, it must be within limits
    if (hasTitleEn) {
      const titleEnLength = formData.title_en.trim().length
      if (titleEnLength < settings.caseTitleMinLength || titleEnLength > settings.caseTitleMaxLength) {
        return false
      }
    }
    
    // If Arabic title is provided, it must be within limits
    if (hasTitleAr) {
      const titleArLength = formData.title_ar.trim().length
      if (titleArLength < settings.caseTitleMinLength || titleArLength > settings.caseTitleMaxLength) {
        return false
      }
    }
    
    // Category is required
    if (!formData.category || !formData.category.trim() || formData.category === '__none__') {
      return false
    }

    // Check descriptions - at least one description must be provided
    const hasDescEn = formData.description_en && formData.description_en.trim()
    const hasDescAr = formData.description_ar && formData.description_ar.trim()
    
    if (!hasDescEn && !hasDescAr) {
      return false
    }
    
    // If English description is provided, it must be within limits
    if (hasDescEn) {
      const descEnLength = formData.description_en.trim().length
      if (descEnLength < settings.caseDescriptionMinLength || descEnLength > settings.caseDescriptionMaxLength) {
        return false
      }
    }
    
    // If Arabic description is provided, it must be within limits
    if (hasDescAr) {
      const descArLength = formData.description_ar.trim().length
      if (descArLength < settings.caseDescriptionMinLength || descArLength > settings.caseDescriptionMaxLength) {
        return false
      }
    }

    // Target amount is required
    if (!formData.target_amount || formData.target_amount <= 0 || formData.target_amount > settings.caseTargetAmountMax) {
      return false
    }

    // Duration validation (for one-time cases) - only if provided
    if (caseType === 'one-time' && formData.duration !== null && formData.duration !== undefined) {
      if (formData.duration <= 0 || formData.duration > settings.caseDurationMax) {
        return false
      }
    }

    return true
  }

  const handleSave = async () => {
    // Validate form first
    const validationResult = validateForm()
    if (!validationResult.isValid) {
      // Collect all validation error messages
      const errorMessages = Object.values(validationResult.errors).filter(Boolean)
      const errorCount = errorMessages.length
      
      // Build detailed error message for toast
      let errorDescription = 'Please fix the validation errors before saving'
      if (errorCount > 0) {
        if (errorCount === 1) {
          errorDescription = errorMessages[0]
        } else {
          // Show first 3 errors, then count if more
          const displayedErrors = errorMessages.slice(0, 3)
          const remainingCount = errorCount - 3
          errorDescription = displayedErrors.join(' • ')
          if (remainingCount > 0) {
            errorDescription += ` • and ${remainingCount} more error${remainingCount > 1 ? 's' : ''}`
          }
        }
      }
      
      const errorMsg = 'Please fix the validation errors before saving'
      setError(errorMsg)
      
      // Show toast with specific validation errors
      toast.error('Validation Failed', { 
        description: errorDescription,
        duration: 5000 // Show for 5 seconds to give user time to read
      })
      setSaving(false)
      savingRef.current = false
      return
    }

    // After validation passes, ensure draft case exists
    const caseId = draftCaseId || await ensureDraftCase()
    
    if (!caseId) {
      const errorMsg = 'Cannot create case. Please ensure both English and Arabic titles meet the minimum length requirements.'
      setError(errorMsg)
      toast.error('Create Failed', { description: errorMsg })
      setSaving(false)
      savingRef.current = false
      return
    }

    // Update draftCaseId if it was just created
    if (!draftCaseId) {
      setDraftCaseId(caseId)
      draftCaseIdRef.current = caseId
    }

    try {
      setSaving(true)
      savingRef.current = true
      setError(null)

      // Get category ID
      let categoryId = formData.category_id
      if (formData.category && !categoryId) {
        // Try to find category in local list first
        const selectedCategory = categories.find(cat => 
          cat.name === formData.category || 
          (cat as any).name_en === formData.category ||
          (cat as any).name_ar === formData.category
        )
        if (selectedCategory) {
          categoryId = selectedCategory.id
        } else {
          // Fallback: query database if not in local categories list
          const { data: categoryData } = await supabase
            .from('case_categories')
            .select('id')
            .or(`name.eq.${formData.category},name_en.eq.${formData.category},name_ar.eq.${formData.category}`)
            .single()
          
          if (categoryData) {
            categoryId = categoryData.id
          }
        }
      }

      // Update the draft case via API
      const updateResponse = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title_en: formData.title_en || null,
          title_ar: formData.title_ar || null,
          description_en: formData.description_en || null,
          description_ar: formData.description_ar || null,
          targetAmount: formData.target_amount,
          status: formData.status,
          priority: formData.priority,
          category_id: categoryId,
          location: formData.location || null,
          beneficiaryName: selectedBeneficiary?.name || formData.beneficiary_name || null,
          beneficiaryContact: selectedBeneficiary?.mobile_number || formData.beneficiary_contact || null,
          duration: formData.duration || null,
        }),
      })

      const updateResult = await updateResponse.json()

      if (!updateResponse.ok) {
        const errorMsg = updateResult.error || 'Failed to save case'
        toast.error('Create Failed', {
          description: errorMsg
        })
        setError(errorMsg)
        setSaving(false)
        savingRef.current = false
        return
      }

      // Files are handled by CaseFileManager component which uploads them automatically

      // Mark this case ID as saved to prevent cleanup from deleting it
      caseSavedRef.current = caseId
      // Clear draftCaseId to prevent cleanup from deleting the successfully saved case
      setDraftCaseId(null)
      draftCaseIdRef.current = null

      // Show success toast
      const caseTitle = formData.title_en || formData.title_ar || 'Untitled'
      toast.success('Case Created Successfully', {
        description: `Case "${caseTitle}" has been created.`
      })

      // Delay redirect to allow toast to be visible and ensure database update propagates
      // Increased delay to ensure toast is visible
      setTimeout(() => {
        router.push(`/${locale}/cases/${caseId}`)
      }, 1500)
    } catch (error) {
      logger.error('Error saving case:', { error: error })
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Create Failed', {
        description: `An unexpected error occurred: ${errorMessage}`
      })
      setError(`An unexpected error occurred: ${errorMessage}`)
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  // Cleanup function to delete draft case if user leaves without saving
  const cleanupDraftCase = useCallback(async () => {
    // Use refs to get current values, avoiding closure issues
    const idToCheck = draftCaseIdRef.current
    const isSaving = savingRef.current
    // Don't cleanup if this case was successfully saved
    if (caseSavedRef.current === idToCheck) {
      console.log('Skipping cleanup - case was successfully saved:', idToCheck)
      return
    }
    if (idToCheck && !isSaving) {
      try {
        await supabase
          .from('cases')
          .delete()
          .eq('id', idToCheck)
        console.log('Draft case cleaned up:', idToCheck)
      } catch (error) {
        logger.error('Error cleaning up draft case:', { error: error })
        // Don't throw - cleanup errors shouldn't block navigation
      }
    }
  }, [supabase])

  // Track form data in ref to avoid dependency issues
  const formDataRef = useRef(formData)
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  // Cleanup on unmount or when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Don't warn if case was successfully saved
      if (caseSavedRef.current) {
        return
      }
      if (draftCaseIdRef.current && !savingRef.current) {
        // Only warn if there's actual content entered (use ref to get current value)
        const currentFormData = formDataRef.current
        const hasContent = currentFormData.title_en || currentFormData.title_ar || currentFormData.description_en || currentFormData.description_ar || currentFormData.target_amount
        if (hasContent) {
          e.preventDefault()
          e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
          return e.returnValue
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Cleanup draft case ONLY when component unmounts (user navigates away from the entire page)
      // This does NOT run when switching tabs - tabs are within the same component
      // Note: We can't await in cleanup, but the cleanup function handles errors gracefully
      // Cleanup will use refs to get current values
      if (draftCaseIdRef.current && !savingRef.current && !caseSavedRef.current) {
        // Only cleanup if case wasn't saved and we're actually leaving the page
        cleanupDraftCase().catch(err => {
          logger.error('Error during cleanup:', { error: err })
        })
      }
    }
  }, [cleanupDraftCase]) // Only depend on cleanupDraftCase which is stable


  const handleBack = async () => {
    if (caseType) {
      // Clean up draft case before clearing state
      await cleanupDraftCase()
      
      // If case type is selected, clear it to show type selection
      setCaseType(null)
      setDraftCaseId(null)
      draftCaseIdRef.current = null
      setFormData({
        title_en: '',
        title_ar: '',
        description_en: '',
        description_ar: '',
        target_amount: null,
        status: 'draft',
        priority: 'medium',
        category_id: null,
        category: null,
        category_icon: null,
        category_color: null,
        location: '',
        duration: null,
        case_type: 'one-time' as CaseType,
        beneficiary_name: null,
        beneficiary_contact: null,
      })
      setErrors({})
    } else {
      // Otherwise, go back to case management dashboard
      router.push(`/${locale}/case-management`)
    }
  }

  const handleFilesChange = useCallback(async (updatedFiles: CaseFile[]) => {
    // Create draft case only when user starts uploading files AND titles are valid
    if (!draftCaseId && caseType && updatedFiles.length > caseFiles.length) {
      // User is uploading a new file - ensure draft case exists with valid titles
      const caseId = await ensureDraftCase()
      if (!caseId) {
        toast.error('Cannot Upload Files', {
          description: `Please ensure both English and Arabic titles are at least ${validationSettings?.caseTitleMinLength || 10} characters long before uploading files.`
        })
        // Don't update files if draft case creation failed
        return
      }
    }
    setCaseFiles(updatedFiles)
  }, [draftCaseId, caseType, caseFiles.length, ensureDraftCase, validationSettings])

  return (
    <PermissionGuard permissions={["cases:create"]} fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to create cases.</p>
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-[#6B8E7E]/5 to-gray-50">
        <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <EditPageHeader
            backUrl={`/${locale}/case-management`}
            icon={FileEdit}
            title={t('createCase') || 'Create Case'}
            description={t('createCaseDescription') || 'Choose the type of charity case and provide detailed information to help beneficiaries.'}
            backLabel={t('back') || 'Back'}
            showBackButton={true}
            badge={caseType ? {
              label: caseType === 'one-time' ? 'One-time Case' : 'Recurring Case',
              variant: 'secondary'
            } : undefined}
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

          {/* Quick Admin Controls - Status, Category, Priority - Only show when case type is selected */}
          {caseType && (
            <Card className="mb-6 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm">
              <CardHeader className="border-b border-indigo-200/50 pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <div className="p-1.5 rounded-lg bg-indigo-100">
                    <Tag className="h-4 w-4 text-indigo-600" />
                  </div>
                  Quick Admin Controls
                </CardTitle>
                <CardDescription className="text-gray-600 text-sm mt-1">
                  Manage case status, category, and priority level
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <div className="p-1 rounded bg-blue-50">
                        <Info className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      {t('status')}
                      {formData.status && (
                        <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                      )}
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger id="status" className="h-10 bg-white hover:bg-gray-50 transition-colors">
                        <SelectValue>
                          {formData.status && (
                            <Badge 
                              variant="outline" 
                              className={
                                formData.status === 'published' ? 'bg-green-100 text-green-700 border-green-300' :
                                formData.status === 'active' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                formData.status === 'completed' ? 'bg-purple-100 text-purple-700 border-purple-300' :
                                formData.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-300' :
                                'bg-gray-100 text-gray-700 border-gray-300'
                              }
                            >
                              {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
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

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <div className="p-1 rounded bg-purple-50">
                        <Tag className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      {t('category')}
                      <span className="text-red-500">*</span>
                      {formData.category && formData.category !== '__none__' && (
                        <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                      )}
                    </Label>
                    <Select
                      value={formData.category || '__none__'}
                      onValueChange={(value) => {
                        if (value === '__none__') {
                          handleInputChange('category', null)
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
                      <SelectTrigger id="category" className={`h-10 bg-white hover:bg-gray-50 transition-colors ${errors.category ? 'border-red-500 focus-visible:ring-red-500' : ''}`}>
                        <SelectValue placeholder={t('notSpecified')}>
                          {formData.category ? (() => {
                            // Try to find category by name, name_en, or name_ar
                            const selectedCategory = categories.find(cat => 
                              cat.name === formData.category || 
                              (cat as any).name_en === formData.category ||
                              (cat as any).name_ar === formData.category
                            )
                            // Always prefer the matched category's icon and color from the API
                            const iconValue = selectedCategory?.icon || formData.category_icon || null
                            const categoryColor = selectedCategory?.color || formData.category_color || null
                            return (
                              <Badge variant="outline" className={getCategoryBadgeClass(formData.category, categoryColor)}>
                                <div className="flex items-center gap-1.5">
                                  {iconValue ? (
                                    <DynamicIcon name={iconValue} className="h-3 w-3" fallback="tag" />
                                  ) : (
                                    <Tag className="h-3 w-3" />
                                  )}
                                  {formData.category}
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
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label htmlFor="priority" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <div className="p-1 rounded bg-orange-50">
                        <Flag className="h-3.5 w-3.5 text-orange-600" />
                      </div>
                      {t('priorityLevel')}
                      {formData.priority && (
                        <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
                      )}
                    </Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => handleInputChange('priority', value)}
                    >
                      <SelectTrigger id="priority" className="h-10 bg-white hover:bg-gray-50 transition-colors">
                        <SelectValue>
                          {formData.priority && (
                            <Badge variant="outline" className={getPriorityBadgeClass(formData.priority)}>
                              {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
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
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Case Type Selection - Compact when selected, full when not */}
          {!caseType ? (
            <Card className="mb-6 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Select Case Type</CardTitle>
                <CardDescription>Choose the type of charity case you want to create</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* One-time Case Card */}
                  <Card 
                    className={`group cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
                      caseType === 'one-time' 
                        ? 'ring-2 ring-[#6B8E7E] border-[#6B8E7E] bg-gradient-to-br from-[#6B8E7E]/10 to-[#6B8E7E]/5 shadow-lg' 
                        : 'border-gray-200 hover:border-[#6B8E7E]/50'
                    }`}
                    onClick={() => {
                      setCaseType('one-time')
                      setFormData(prev => ({ ...prev, case_type: 'one-time' }))
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#6B8E7E]/10 text-[#6B8E7E] group-hover:bg-[#6B8E7E] group-hover:text-white transition-colors">
                          <Clock className="h-5 w-5" />
                        </div>
                      </div>
                      <CardTitle className="text-base font-semibold text-gray-900">
                        {t('oneTimeCase')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm text-gray-600">
                        {t('oneTimeCaseDescription')}
                      </CardDescription>
                    </CardContent>
                  </Card>

                  {/* Recurring Case Card */}
                  <Card 
                    className={`group cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
                      caseType === 'recurring' 
                        ? 'ring-2 ring-[#6B8E7E] border-[#6B8E7E] bg-gradient-to-br from-[#6B8E7E]/10 to-[#6B8E7E]/5 shadow-lg' 
                        : 'border-gray-200 hover:border-[#6B8E7E]/50'
                    }`}
                    onClick={() => {
                      setCaseType('recurring')
                      setFormData(prev => ({ ...prev, case_type: 'recurring' }))
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#6B8E7E]/10 text-[#6B8E7E] group-hover:bg-[#6B8E7E] group-hover:text-white transition-colors">
                          <Repeat className="h-5 w-5" />
                        </div>
                      </div>
                      <CardTitle className="text-base font-semibold text-gray-900">
                        {t('recurringCase')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm text-gray-600">
                        {t('recurringCaseDescription')}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6 border-[#6B8E7E]/30 bg-[#6B8E7E]/5 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#6B8E7E] text-white">
                      {caseType === 'one-time' ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <Repeat className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {caseType === 'one-time' ? t('oneTimeCase') : t('recurringCase')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {caseType === 'one-time' ? t('oneTimeCaseDescription') : t('recurringCaseDescription')}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      // Clean up draft case before changing type
                      if (draftCaseId) {
                        await cleanupDraftCase()
                      }
                      setCaseType(null)
                      setDraftCaseId(null)
                      setFormData({
                        title_en: '',
                        title_ar: '',
                        description_en: '',
                        description_ar: '',
                        target_amount: null,
                        status: 'draft',
                        priority: 'medium',
                        category_id: null,
                        category: null,
                        category_icon: null,
                        category_color: null,
                        location: '',
                        duration: null,
                        case_type: 'one-time' as CaseType,
                        beneficiary_name: null,
                        beneficiary_contact: null,
                      })
                      setErrors({})
                    }}
                    className="text-[#6B8E7E] hover:text-[#5A7A6B] hover:bg-[#6B8E7E]/10"
                  >
                    <Repeat className="h-4 w-4 mr-2" />
                    Change Type
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Form with Tabs - Only show when case type is selected */}
          {caseType && (
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <Tabs
                  value={activeTab}
                  onValueChange={(value) => {
                    // When switching to files tab, ensure draft case exists if titles are valid
                    if (value === 'files' && !draftCaseId && !creatingDraft && caseType && validationSettings) {
                      const titleEn = formData.title_en?.trim() || ''
                      const titleAr = formData.title_ar?.trim() || ''
                      const minLength = validationSettings.caseTitleMinLength

                      if (titleEn.length >= minLength && titleAr.length >= minLength) {
                        // Create draft case before switching tabs
                        ensureDraftCase().then(() => {
                          setActiveTab(value as 'details' | 'files')
                      }).catch(err => {
                        logger.error('Error creating draft case for file upload:', { error: err })
                        toast.error('Cannot Upload Files', {
                          description: `Please ensure both English and Arabic titles are at least ${minLength} characters long before uploading files.`
                        })
                      })
                      return // Don't switch tab yet, wait for draft case
                    } else {
                      // Titles not valid, show error and don't switch
                      toast.error('Titles Required', {
                        description: `Please ensure both English and Arabic titles are at least ${minLength} characters long before uploading files.`
                      })
                      return // Don't switch to files tab
                    }
                  }
                  // Safe to switch tabs
                  setActiveTab(value as 'details' | 'files')
                }}
              >
                <TabsList variant="branded">
                  <TabsTrigger 
                    value="details" 
                    variant="branded"
                    icon={FileEdit}
                    tabIndex={0}
                  >
                    {t('caseDetails')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="files" 
                    variant="branded"
                    icon={FileText}
                    badge={caseFiles.length > 0 ? caseFiles.length : undefined}
                    tabIndex={1}
                  >
                    {t('files.files')}
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
                                {t('caseTitle')} (English) <span className="text-red-500">*</span>
                              </Label>
                              <div className="relative">
                              <Input
                                id="title_en"
                                value={formData.title_en}
                                onChange={(e) => handleInputChange('title_en', e.target.value)}
                                placeholder="Enter case title in English"
                                dir="ltr"
                                className={`h-11 pr-32 ${errors.title_en ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                maxLength={validationSettings?.caseTitleMaxLength || 100}
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                  <AIGenerateButton
                                    type="title"
                                    language="en"
                                    inputs={{
                                      beneficiaryName: selectedBeneficiary?.name || formData.beneficiary_name || undefined,
                                      beneficiarySituation: selectedBeneficiary?.social_situation || undefined,
                                      beneficiaryNeeds: selectedBeneficiary?.medical_condition || undefined,
                                      category: formData.category || undefined,
                                      location: formData.location || selectedBeneficiary?.city || undefined,
                                      targetAmount: formData.target_amount || undefined,
                                      caseType: formData.case_type,
                                    }}
                                    onGenerate={(result) => {
                                      if (result.title_en) {
                                        handleInputChange('title_en', result.title_en)
                                      }
                                    }}
                                    size="sm"
                                    variant="ghost"
                                    iconOnly
                                    className="h-6 w-6 p-0"
                                  />
                                  <TranslationButton
                                    sourceText={formData.title_ar}
                                    direction="ar-to-en"
                                    onTranslate={(translated) => handleInputChange('title_en', translated)}
                                    size="sm"
                                    variant="ghost"
                                    iconOnly
                                    className="h-6 w-6 p-0"
                                  />
                                  <span className="text-xs text-gray-400">
                                    {formData.title_en.length}/{validationSettings?.caseTitleMaxLength || 100}
                                  </span>
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
                                value={formData.title_ar}
                                onChange={(e) => handleInputChange('title_ar', e.target.value)}
                                placeholder="أدخل عنوان الحالة بالعربية"
                                dir="rtl"
                                className={`h-11 pl-32 ${errors.title_ar ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                maxLength={validationSettings?.caseTitleMaxLength || 100}
                              />
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                  <span className="text-xs text-gray-400">
                                    {formData.title_ar.length}/{validationSettings?.caseTitleMaxLength || 100}
                                  </span>
                                  <TranslationButton
                                    sourceText={formData.title_en}
                                    direction="en-to-ar"
                                    onTranslate={(translated) => handleInputChange('title_ar', translated)}
                                    size="sm"
                                    variant="ghost"
                                    iconOnly
                                    className="h-6 w-6 p-0"
                                  />
                                  <AIGenerateButton
                                    type="title"
                                    language="ar"
                                    inputs={{
                                      beneficiaryName: selectedBeneficiary?.name || formData.beneficiary_name || undefined,
                                      beneficiarySituation: selectedBeneficiary?.social_situation || undefined,
                                      beneficiaryNeeds: selectedBeneficiary?.medical_condition || undefined,
                                      category: formData.category || undefined,
                                      location: formData.location || selectedBeneficiary?.city || undefined,
                                      targetAmount: formData.target_amount || undefined,
                                      caseType: formData.case_type,
                                    }}
                                    onGenerate={(result) => {
                                      if (result.title_ar) {
                                        handleInputChange('title_ar', result.title_ar)
                                      }
                                    }}
                                    size="sm"
                                    variant="ghost"
                                    iconOnly
                                    className="h-6 w-6 p-0"
                                  />
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
                                value={formData.description_en}
                                onChange={(e) => handleInputChange('description_en', e.target.value)}
                                placeholder="Enter case description in English"
                                rows={5}
                                dir="ltr"
                                  className={`resize-none pb-10 ${errors.description_en ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                  maxLength={validationSettings?.caseDescriptionMaxLength || 2000}
                                />
                                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                  <AIGenerateButton
                                    type="description"
                                    language="en"
                                    inputs={{
                                      beneficiaryName: selectedBeneficiary?.name || formData.beneficiary_name || undefined,
                                      beneficiarySituation: selectedBeneficiary?.social_situation || undefined,
                                      beneficiaryNeeds: selectedBeneficiary?.medical_condition || undefined,
                                      category: formData.category || undefined,
                                      location: formData.location || selectedBeneficiary?.city || undefined,
                                      targetAmount: formData.target_amount || undefined,
                                      caseType: formData.case_type,
                                      title_en: formData.title_en || undefined,
                                      title_ar: formData.title_ar || undefined,
                                    }}
                                    onGenerate={(result) => {
                                      if (result.description_en) {
                                        handleInputChange('description_en', result.description_en)
                                      }
                                    }}
                                    size="sm"
                                    variant="ghost"
                                    iconOnly
                                    className="h-6 w-6 p-0 bg-white"
                                  />
                                  <TranslationButton
                                    sourceText={formData.description_ar}
                                    direction="ar-to-en"
                                    onTranslate={(translated) => handleInputChange('description_en', translated)}
                                    size="sm"
                                    variant="ghost"
                                    iconOnly
                                    className="h-6 w-6 p-0 bg-white"
                                  />
                                  <span className="text-xs text-gray-400 bg-white px-1 rounded">
                                    {formData.description_en.length}/{validationSettings?.caseDescriptionMaxLength || 2000}
                                  </span>
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
                                value={formData.description_ar}
                                onChange={(e) => handleInputChange('description_ar', e.target.value)}
                                placeholder="أدخل وصف الحالة بالعربية"
                                rows={5}
                                dir="rtl"
                                  className={`resize-none pb-10 ${errors.description_ar ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                  maxLength={validationSettings?.caseDescriptionMaxLength || 2000}
                              />
                                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                                  <span className="text-xs text-gray-400 bg-white px-1 rounded">
                                    {formData.description_ar.length}/{validationSettings?.caseDescriptionMaxLength || 2000}
                                  </span>
                                  <TranslationButton
                                    sourceText={formData.description_en}
                                    direction="en-to-ar"
                                    onTranslate={(translated) => handleInputChange('description_ar', translated)}
                                    size="sm"
                                    variant="ghost"
                                    iconOnly
                                    className="h-6 w-6 p-0 bg-white"
                                  />
                                  <AIGenerateButton
                                    type="description"
                                    language="ar"
                                    inputs={{
                                      beneficiaryName: selectedBeneficiary?.name || formData.beneficiary_name || undefined,
                                      beneficiarySituation: selectedBeneficiary?.social_situation || undefined,
                                      beneficiaryNeeds: selectedBeneficiary?.medical_condition || undefined,
                                      category: formData.category || undefined,
                                      location: formData.location || selectedBeneficiary?.city || undefined,
                                      targetAmount: formData.target_amount || undefined,
                                      caseType: formData.case_type,
                                      title_en: formData.title_en || undefined,
                                      title_ar: formData.title_ar || undefined,
                                    }}
                                    onGenerate={(result) => {
                                      if (result.description_ar) {
                                        handleInputChange('description_ar', result.description_ar)
                                      }
                                    }}
                                    size="sm"
                                    variant="ghost"
                                    iconOnly
                                    className="h-6 w-6 p-0 bg-white"
                                  />
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
                              <Label htmlFor="target_amount" className="flex items-center gap-2 text-sm font-semibold">
                                <Target className="h-4 w-4 text-gray-500" />
                                {t('goalAmountEGP')} <span className="text-red-500">*</span>
                              </Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                  id="target_amount"
                                  type="number"
                                  value={formData.target_amount || ''}
                                  onChange={(e) => handleInputChange('target_amount', parseFloat(e.target.value) || null)}
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
                              <div className="pt-2">
                                <div className="space-y-2">
                                  <Label htmlFor="location" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <div className="p-1 rounded bg-indigo-50">
                                      <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                                    </div>
                                    {t('location')}
                                    <span className="text-xs font-normal text-gray-400 ml-1">(Optional)</span>
                                  </Label>
                                  <Input
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => handleInputChange('location', e.target.value)}
                                    placeholder={t('locationPlaceholder') || 'Enter location'}
                                    className="h-10 bg-white"
                                  />
                                </div>
                              </div>

                              {/* Duration field for one-time cases */}
                              {caseType === 'one-time' && (
                                <div className="pt-2 border-t border-gray-100">
                                  <div className="space-y-2">
                                    <Label htmlFor="duration" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                      <div className="p-1 rounded bg-cyan-50">
                                        <Clock className="h-3.5 w-3.5 text-cyan-600" />
                                      </div>
                                      {t('duration')}
                                      <span className="text-xs font-normal text-gray-400 ml-1">(Optional)</span>
                                    </Label>
                                    <div className="relative max-w-md">
                                      <Input
                                        id="duration"
                                        type="number"
                                        value={formData.duration || ''}
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
                                </Label>
                                <div className="bg-gray-50 rounded-lg p-1 border border-gray-200">
                                  <BeneficiarySelector
                                    selectedBeneficiary={selectedBeneficiary}
                                    onSelect={setSelectedBeneficiary}
                                    showOpenButton={true}
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="files" className="mt-0">
                    {(() => {
                      // Check if titles are valid
                      const titleEn = formData.title_en?.trim() || ''
                      const titleAr = formData.title_ar?.trim() || ''
                      const minLength = validationSettings?.caseTitleMinLength || 10
                      const titlesValid = titleEn.length >= minLength && titleAr.length >= minLength

                      // If draft exists, show file manager
                      if (draftCaseId) {
                        return (
                      <CaseFileManager
                        caseId={draftCaseId}
                        files={caseFiles}
                        canEdit={true}
                        onFilesChange={handleFilesChange}
                        viewMode="grid"
                        showUpload={true}
                      />
                        )
                      }

                      // Show loading state while creating draft
                      if (creatingDraft) {
                        return (
                      <Card>
                        <CardContent className="p-6">
                          <div className="text-center py-8 text-gray-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-lg font-medium mb-2">Preparing file upload...</p>
                                <p className="text-sm">Initializing draft case.</p>
                          </div>
                        </CardContent>
                      </Card>
                        )
                      }

                      // Show message if titles are not valid
                      return (
                        <Card>
                          <CardContent className="p-6">
                            <div className="text-center py-8 text-gray-500">
                              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                              <p className="text-lg font-medium mb-2">File Upload Not Available</p>
                              <p className="text-sm mb-2">
                                To upload files, please ensure both English and Arabic titles are at least{' '}
                                <span className="font-semibold text-gray-700">
                                  {minLength} characters
                                </span>{' '}
                                long.
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                Current lengths: English ({titleEn.length}/{minLength}), Arabic ({titleAr.length}/{minLength})
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })()}
                  </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          )}

          {/* Footer - Only show when case type is selected */}
          {caseType && (
            <EditPageFooter
              primaryAction={{
                label: saving ? (t('creating') || 'Creating...') : (t('createCase') || 'Create Case'),
                onClick: handleSave,
                disabled: saving || !isFormValid(),
                loading: saving,
                icon: <Save className="h-4 w-4 mr-2" />
              }}
              secondaryActions={[
                {
                  label: t('cancel') || 'Cancel',
                  onClick: handleBack,
                  variant: 'outline'
                }
              ]}
            />
          )}
          </Container>
        </div>
      </PermissionGuard>
    )
  }

