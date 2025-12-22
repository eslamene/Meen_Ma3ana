'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { User, FileText, FileEdit, Save, Users } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EditPageHeader, EditPageFooter } from '@/components/crud'
import BeneficiaryForm, { type BeneficiaryFormRef } from '@/components/beneficiaries/BeneficiaryForm'
import { LookupService } from '@/lib/services/lookupService'
import { toast } from 'sonner'
import type { CreateBeneficiaryData, UpdateBeneficiaryData, City, IdType } from '@/types/beneficiary'

import { defaultLogger as logger } from '@/lib/logger'

export default function CreateBeneficiaryPage() {
  const t = useTranslations('beneficiaries')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string || 'en'
  const { containerVariant } = useLayout()
  const formRef = useRef<BeneficiaryFormRef>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  const [idTypes, setIdTypes] = useState<IdType[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'data' | 'documents'>('data')
  const [draftBeneficiaryId, setDraftBeneficiaryId] = useState<string | null>(null)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [formData, setFormData] = useState<Partial<CreateBeneficiaryData>>({})
  const supabase = createClient()

  // Load lookup data
  useEffect(() => {
    const loadLookupData = async () => {
      try {
        setLoading(true)
        const [citiesData, idTypesData] = await Promise.all([
          LookupService.getCities(),
          LookupService.getIdTypes()
        ])
        setCities(citiesData)
        setIdTypes(idTypesData)
      } catch (error) {
        logger.error('Error loading lookup data:', { error: error })
      } finally {
        setLoading(false)
      }
    }

    loadLookupData()
  }, [])

  // Cleanup draft beneficiary on unmount or navigation away
  const cleanupDraftBeneficiary = useCallback(async () => {
    if (draftBeneficiaryId && !isSubmitting) {
      try {
        await supabase
          .from('beneficiaries')
          .delete()
          .eq('id', draftBeneficiaryId)
        console.log('Draft beneficiary cleaned up:', draftBeneficiaryId)
      } catch (error) {
        logger.error('Error cleaning up draft beneficiary:', { error: error })
      }
    }
  }, [draftBeneficiaryId, isSubmitting, supabase])

  // Create draft beneficiary when name and mobile_number are provided
  const ensureDraftBeneficiary = useCallback(async (): Promise<string | null> => {
    if (draftBeneficiaryId) {
      return draftBeneficiaryId
    }
    if (creatingDraft) {
      return null
    }

    const name = formData.name?.trim() || ''
    const mobileNumber = formData.mobile_number?.trim() || ''
    
    // Require both name and mobile_number to create draft
    if (name.length === 0 || mobileNumber.length === 0) {
      return null
    }

    setCreatingDraft(true)
    try {
      const insertData: any = {
        name: name,
        name_ar: formData.name_ar || null,
        mobile_number: mobileNumber,
        additional_mobile_number: formData.additional_mobile_number?.trim() || null,
        age: formData.age || null,
        gender: formData.gender || null,
        email: formData.email?.trim() || null,
        national_id: formData.national_id?.trim() || null,
        id_type: formData.id_type || 'national_id',
        country: formData.country || 'Egypt',
        city: formData.city?.trim() || null,
        address: formData.address?.trim() || null,
        medical_condition: formData.medical_condition?.trim() || null,
        notes: formData.notes?.trim() || null,
        risk_level: formData.risk_level || 'low',
      }

      // Only include id_type_id if it's provided
      if (formData.id_type_id) {
        insertData.id_type_id = formData.id_type_id
      }

      // Only include city_id if it's provided
      if (formData.city_id) {
        insertData.city_id = formData.city_id
      }

      // Remove undefined values
      Object.keys(insertData).forEach(key => {
        if (insertData[key] === undefined) {
          delete insertData[key]
        }
      })

      // Use API endpoint to bypass RLS (same as final save)
      const response = await fetch('/api/beneficiaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(insertData),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Error creating draft beneficiary:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          insertData
        })
        setCreatingDraft(false)
        return null
      }
      
      const result = await response.json()
      if (result.success && result.data) {
        setDraftBeneficiaryId(result.data.id)
        setCreatingDraft(false)
        return result.data.id
      } else {
        logger.error('Unexpected response format:', { error: result })
        setCreatingDraft(false)
        return null
      }
    } catch (error) {
      logger.error('Error creating draft beneficiary (catch):', {
        error,
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      })
      setCreatingDraft(false)
      return null
    }
  }, [draftBeneficiaryId, creatingDraft, formData])

  // Watch for name and mobile_number changes to create draft
  useEffect(() => {
    const name = formData.name?.trim() || ''
    const mobileNumber = formData.mobile_number?.trim() || ''
    // Only create draft if both name and mobile_number are provided
    if (name.length > 0 && mobileNumber.length > 0 && !draftBeneficiaryId && !creatingDraft) {
      ensureDraftBeneficiary().catch(err => {
        logger.error('Error creating draft beneficiary:', { error: err })
      })
    }
  }, [formData.name, formData.mobile_number, draftBeneficiaryId, creatingDraft, ensureDraftBeneficiary])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupDraftBeneficiary()
    }
  }, [cleanupDraftBeneficiary])

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (draftBeneficiaryId && !isSubmitting) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [draftBeneficiaryId, isSubmitting])

  const handleFormDataChange = useCallback((data: Partial<CreateBeneficiaryData>) => {
    setFormData(data)
    
    // Update draft if it exists
    if (draftBeneficiaryId) {
      const updateDraft = async () => {
        try {
          const updateData: any = {
            name: data.name || '',
            name_ar: data.name_ar || '',
            mobile_number: data.mobile_number || '',
            additional_mobile_number: data.additional_mobile_number || '',
            age: data.age || undefined,
            gender: data.gender || undefined,
            email: data.email || '',
            national_id: data.national_id || '',
            id_type: data.id_type || 'national_id',
            id_type_id: data.id_type_id || undefined,
            country: data.country || 'Egypt',
            city: data.city || '',
            city_id: data.city_id || undefined,
            address: data.address || '',
            medical_condition: data.medical_condition || '',
            notes: data.notes || '',
            risk_level: data.risk_level || 'low',
          }

          // Remove undefined values
          Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined || updateData[key] === '') {
              delete updateData[key]
            }
          })

          await supabase
            .from('beneficiaries')
            .update(updateData)
            .eq('id', draftBeneficiaryId)
        } catch (error) {
          logger.error('Error updating draft beneficiary:', { error: error })
        }
      }
      updateDraft()
    }
  }, [draftBeneficiaryId, supabase])

  const handleSubmit = async (data: CreateBeneficiaryData | UpdateBeneficiaryData) => {
    try {
      setIsSubmitting(true)

      // If we have a draft, update it via API; otherwise create new
      if (draftBeneficiaryId) {
        // Convert age to year_of_birth if provided
        const updateData: any = { ...data }
        if (data.age) {
          const currentYear = new Date().getFullYear()
          updateData.year_of_birth = currentYear - data.age
          delete updateData.age
        }

        // Filter out empty strings for UUID fields
        if (updateData.id_type_id === '' || updateData.id_type_id === null) {
          delete updateData.id_type_id
        }
        if (updateData.city_id === '' || updateData.city_id === null) {
          delete updateData.city_id
        }

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key]
          }
        })

        // Use API endpoint with PUT method to update the draft
        const response = await fetch(`/api/beneficiaries/${draftBeneficiaryId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to update beneficiary' }))
          const errorMessage = errorData.error || 'Failed to update beneficiary'
          throw new Error(errorMessage)
        }
        
        // Show success toast
        toast.success(
          'Beneficiary Updated',
          { description: 'Beneficiary has been updated successfully.' }
        )
        
        // Delay redirect to allow toast to be visible
        setTimeout(() => {
          router.push(`/${locale}/beneficiaries/${draftBeneficiaryId}`)
        }, 500)
      } else {
        // Create new beneficiary via API
        const response = await fetch('/api/beneficiaries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          const errorMessage = errorData.error || 'Failed to create beneficiary'
          throw new Error(errorMessage)
        }
        
        const result = await response.json()
        const newBeneficiary = result.data
        
        // Show success toast
        toast.success(
          'Beneficiary Created',
          { description: `Beneficiary "${data.name || 'Untitled'}" has been created successfully.` }
        )
        
        // Delay redirect to allow toast to be visible
        setTimeout(() => {
          router.push(`/${locale}/beneficiaries/${newBeneficiary.id}`)
        }, 500)
      }
    } catch (error) {
      logger.error('Error saving beneficiary:', { error: error })
      const errorMessage = error instanceof Error ? error.message : 'Failed to save beneficiary. Please try again.'
      toast.error(
        'Save Failed',
        { description:  errorMessage }
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    cleanupDraftBeneficiary()
    router.push(`/${locale}/beneficiaries`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Container variant={containerVariant} className="py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-indigo-600"></div>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Container variant={containerVariant} className="py-4 sm:py-6 lg:py-8">
        <EditPageHeader
          backUrl={`/${locale}/beneficiaries`}
          icon={Users}
          title={t('createBeneficiary') || 'Create Beneficiary'}
          description={t('createBeneficiaryDescription') || 'Add a new beneficiary to the system'}
          backLabel={t('back') || 'Back'}
        />

        {/* Form */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="w-full p-4 sm:p-6 lg:p-8">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'data' | 'documents')}
            >
              <TabsList variant="branded" className="mb-4 sm:mb-6">
                <TabsTrigger 
                  value="data" 
                  variant="branded"
                  icon={FileEdit}
                  tabIndex={0}
                >
                  <span className="hidden sm:inline">{t('beneficiaryInfo') || 'Beneficiary Information'}</span>
                  <span className="sm:hidden">Info</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="documents" 
                  variant="branded"
                  icon={FileText}
                  tabIndex={1}
                >
                  {t('documents') || 'Documents'}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="data" className="mt-0">
                <div className="space-y-4 sm:space-y-6">
                  <BeneficiaryForm
                    mode="create"
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    idTypes={idTypes}
                    cities={cities}
                    showDocuments={false}
                    allowCreateDocuments={false}
                    showFooter={false}
                    ref={formRef}
                    onFormDataChange={handleFormDataChange}
                  />
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                <div className="space-y-4 sm:space-y-6">
                  <div className="text-center py-8 sm:py-12 px-4">
                    <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                      {t('documentsWillBeAvailable') || 'Documents will be available after creation'}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
                      {t('documentsAfterCreationMessage') || 'Once you create the beneficiary, you can upload and manage documents using the unified document manager on the beneficiary detail page.'}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <EditPageFooter
          primaryAction={{
            label: t('createBeneficiary') || 'Create Beneficiary',
            onClick: () => formRef.current?.submit(),
            disabled: isSubmitting,
            loading: isSubmitting,
            icon: <Save className="h-4 w-4 mr-2" />
          }}
          secondaryActions={[
            {
              label: t('cancel') || 'Cancel',
              onClick: handleBack,
              variant: 'outline'
            }
          ]}
          className="mt-6 sm:mt-8"
        />
      </Container>
    </div>
  )
}
