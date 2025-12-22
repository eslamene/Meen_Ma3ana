'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { AlertTriangle, User, Trash2, Save, ArrowLeft, FileText, FileEdit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EditPageHeader, EditPageFooter } from '@/components/crud'
import BeneficiaryForm, { type BeneficiaryFormRef } from '@/components/beneficiaries/BeneficiaryForm'
import BeneficiaryFileManager from '@/components/beneficiaries/BeneficiaryFileManager'
import { LookupService } from '@/lib/services/lookupService'
import { toast } from 'sonner'
import type { Beneficiary, UpdateBeneficiaryData, City, IdType } from '@/types/beneficiary'

import { defaultLogger as logger } from '@/lib/logger'

export default function EditBeneficiaryPage() {
  const t = useTranslations('beneficiaries')
  const params = useParams()
  const router = useRouter()
  const { containerVariant } = useLayout()
  
  const beneficiaryId = params.id as string
  const locale = params.locale as string
  
  // State
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cities, setCities] = useState<City[]>([])
  const [idTypes, setIdTypes] = useState<IdType[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'data' | 'documents'>('data')
  const [documentCount, setDocumentCount] = useState(0)
  const formRef = useRef<BeneficiaryFormRef>(null)

  // Load beneficiary data
  useEffect(() => {
    const loadBeneficiary = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/beneficiaries/${beneficiaryId}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          setBeneficiary(result.data)
        } else {
          logger.error('Error loading beneficiary:', { error: result.error })
          router.push(`/${locale}/beneficiaries`)
        }
      } catch (error) {
        logger.error('Error loading beneficiary:', { error: error })
        router.push(`/${locale}/beneficiaries`)
      } finally {
        setLoading(false)
      }
    }

    if (beneficiaryId) {
      loadBeneficiary()
    }
  }, [beneficiaryId, router, locale])

  // Load lookup data
  useEffect(() => {
    const loadLookupData = async () => {
      try {
        const [citiesData, idTypesData] = await Promise.all([
          LookupService.getCities(),
          LookupService.getIdTypes()
        ])
        setCities(citiesData)
        setIdTypes(idTypesData)
      } catch (error) {
        logger.error('Error loading lookup data:', { error: error })
      }
    }

    loadLookupData()
  }, [])

  const handleSubmit = async (data: UpdateBeneficiaryData) => {
    try {
      setIsSubmitting(true)
      
      // Use API route instead of direct service call to bypass RLS
      const response = await fetch(`/api/beneficiaries/${beneficiaryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update beneficiary')
      }
      
      const result = await response.json()
      const updatedBeneficiary = result.data
      
      toast.success(
        'Beneficiary Updated',
        { description: 'Beneficiary has been updated successfully.' }
      )
      
      // Delay redirect to allow toast to be visible
      setTimeout(() => {
        router.push(`/${locale}/beneficiaries/${updatedBeneficiary.id}`)
      }, 500)
    } catch (error) {
      logger.error('Error updating beneficiary:', { error: error })
      toast.error(
        'Update Failed',
        { description: error instanceof Error ? error.message : 'Failed to update beneficiary. Please try again.' }
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!beneficiary) return
    
    try {
      setIsDeleting(true)
      
      // Use API endpoint to bypass RLS (same as create/update)
      const response = await fetch(`/api/beneficiaries/${beneficiary.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        type ErrorData = {
          error?: string
          details?: string | { assignedCasesCount?: number; assignedCases?: Array<{ id: string; title: string }> }
          assignedCasesCount?: number
          assignedCases?: Array<{ id: string; title: string }>
        }
        let errorData: ErrorData = {}
        try {
          errorData = await response.json()
        } catch (parseError) {
          // If JSON parsing fails, use status text
          errorData = { 
            error: response.statusText || 'Failed to delete beneficiary',
            details: `HTTP ${response.status}: ${response.statusText}`
          }
        }
        
        // Build detailed error message
        const errorMessage = errorData.error || 'Failed to delete beneficiary'
        let errorDetails = typeof errorData.details === 'string' ? errorData.details : ''
        
        // Extract assignedCasesCount from details if it's an object, or from top level
        const assignedCasesCount = errorData.assignedCasesCount ?? (typeof errorData.details === 'object' && errorData.details !== null && !Array.isArray(errorData.details) ? (errorData.details as { assignedCasesCount?: number }).assignedCasesCount : undefined)
        const assignedCases = errorData.assignedCases ?? (typeof errorData.details === 'object' && errorData.details !== null && !Array.isArray(errorData.details) ? (errorData.details as { assignedCases?: Array<{ id: string; title: string }> }).assignedCases : undefined)
        
        // Add specific context based on error type
        if (assignedCasesCount !== undefined && assignedCasesCount > 0) {
          errorDetails = `This beneficiary is currently assigned to ${assignedCasesCount} case(s). Please remove the beneficiary from all cases before attempting to delete.`
        } else if (response.status === 404) {
          errorDetails = 'The beneficiary may have already been deleted or does not exist.'
        } else if (response.status === 500) {
          errorDetails = 'A server error occurred while attempting to delete the beneficiary. Please try again later or contact support if the issue persists.'
        } else if (response.status === 400) {
          errorDetails = errorData.error || 'The request was invalid. Please check the beneficiary data and try again.'
        }
        
        // Log detailed error for debugging (only for unexpected errors, not validation errors)
        // 400 status is expected for validation errors, so log as info instead
        if (response.status >= 500) {
          console.error('Error deleting beneficiary:', {
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
            details: errorDetails,
            assignedCasesCount: assignedCasesCount,
            fullErrorData: errorData
          })
        } else if (response.status === 400) {
          // Log validation errors as info (expected behavior)
          console.info('Beneficiary deletion blocked:', {
            status: response.status,
            reason: errorDetails || errorMessage,
            assignedCasesCount: assignedCasesCount
          })
        }
        
        // Show detailed error to user
        toast.error('Delete Failed', {
          description: errorDetails || errorMessage,
          duration: 6000 // Show for longer to allow reading
        })
        
        // Close the dialog when deletion fails
        setIsDeleteDialogOpen(false)
        setIsDeleting(false)
        return // Exit early to prevent navigation
      }
      
      toast.success(
        'Beneficiary Deleted',
        { description: `Beneficiary "${beneficiary.name || 'Untitled'}" has been deleted successfully.` }
      )
      
      router.push(`/${locale}/beneficiaries`)
    } catch (error) {
      // Only log actual exceptions/errors, not expected API responses
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string'
        ? error
        : 'An unexpected error occurred while deleting the beneficiary.'
      
      // Log error details only if it's a real error
      if (error instanceof Error) {
        console.error('Unexpected error deleting beneficiary:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        })
      } else if (error && typeof error === 'object') {
        // Log non-Error objects with their properties
        logger.error('Unexpected error deleting beneficiary:', { error: error })
      } else {
        // Log primitive errors
        logger.error('Unexpected error deleting beneficiary:', { error: errorMessage })
      }
      
      toast.error('Delete Failed', {
        description: `${errorMessage}\n\nPlease try again or contact support if the issue persists.`,
        duration: 6000
      })
      // Close the dialog when an unexpected error occurs
      setIsDeleteDialogOpen(false)
      setIsDeleting(false)
    }
  }

  const handleFormSubmit = () => {
    formRef.current?.submit()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Container variant={containerVariant} className="py-12">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">{t('loading') || 'Loading...'}</p>
            </div>
          </div>
        </Container>
      </div>
    )
  }

  if (!beneficiary) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Container variant={containerVariant} className="py-12">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-12 px-6">
              <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {t('beneficiaryNotFound') || 'Beneficiary not found'}
            </h3>
              <p className="text-gray-600 mb-6 text-base">
                {t('beneficiaryNotFoundDescription') || 'The beneficiary you are looking for does not exist or may have been deleted.'}
            </p>
              <Button 
                onClick={() => router.push(`/${locale}/beneficiaries`)}
                className="min-w-[200px]"
              >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToBeneficiaries') || 'Back to Beneficiaries'}
            </Button>
          </CardContent>
        </Card>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <EditPageHeader
          backUrl={`/${locale}/beneficiaries/${beneficiaryId}`}
          icon={User}
          title={t('editBeneficiary') || 'Edit Beneficiary'}
          description={t('editBeneficiaryDescription') || 'Update beneficiary information and documents'}
          itemName={beneficiary.name}
          backLabel={t('back') || 'Back'}
          menuActions={[
            {
              label: t('delete') || 'Delete',
              icon: Trash2,
              onClick: () => setIsDeleteDialogOpen(true),
              variant: 'destructive',
            },
          ]}
        />

        {/* Form Section */}
        <div className="rounded-lg border bg-white text-gray-900 shadow-lg">
          <div className="w-full p-6">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'data' | 'documents')}
            >
              <TabsList variant="branded">
                <TabsTrigger 
                  value="data" 
                  variant="branded"
                  icon={FileEdit}
                  tabIndex={0}
                >
                  {t('beneficiaryInfo') || 'Beneficiary Information'}
                </TabsTrigger>
                <TabsTrigger 
                  value="documents" 
                  variant="branded"
                  icon={FileText}
                  badge={documentCount > 0 ? documentCount : undefined}
                  tabIndex={1}
                >
                  {t('documents') || 'Documents'}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="data" className="mt-0">
                <div className="space-y-6">
                  <BeneficiaryForm
                    mode="edit"
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    idTypes={idTypes}
                    cities={cities}
                    showDocuments={false}
                    showFooter={false}
                    ref={formRef}
                    defaultValues={beneficiary ? {
                      name: beneficiary.name,
                      name_ar: beneficiary.name_ar || '',
                      age: beneficiary.age,
                      gender: beneficiary.gender || 'male',
                      mobile_number: beneficiary.mobile_number || '',
                      additional_mobile_number: beneficiary.additional_mobile_number || '',
                      email: beneficiary.email || '',
                      alternative_contact: beneficiary.alternative_contact || '',
                      national_id: beneficiary.national_id || '',
                      country: beneficiary.country || 'Egypt',
                      id_type: beneficiary.id_type || 'national_id',
                      id_type_id: beneficiary.id_type_id || undefined,
                      city: beneficiary.city || '',
                      city_id: beneficiary.city_id || undefined,
                      address: beneficiary.address || '',
                      medical_condition: beneficiary.medical_condition || '',
                      notes: beneficiary.notes || '',
                      risk_level: beneficiary.risk_level || 'low'
                    } : undefined}
                  />
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                {beneficiary ? (
                  <BeneficiaryFileManager
                    beneficiaryId={beneficiary.id}
                    canEdit={true}
                    onFilesChange={(files) => setDocumentCount(files.length)}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t('loading') || 'Loading...'}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <EditPageFooter
          primaryAction={{
            label: t('updateBeneficiary') || 'Update Beneficiary',
            onClick: handleFormSubmit,
            disabled: isSubmitting,
            loading: isSubmitting,
            icon: <Save className="h-4 w-4 mr-2" />
          }}
          secondaryActions={[
            {
              label: t('cancel') || 'Cancel',
              onClick: () => router.push(`/${locale}/beneficiaries/${beneficiaryId}`),
              variant: 'outline'
            },
            {
              label: t('delete') || 'Delete',
              onClick: () => setIsDeleteDialogOpen(true),
              variant: 'destructive',
              icon: <Trash2 className="h-4 w-4 mr-2" />
            }
          ]}
        />
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {t('deleteBeneficiary') || 'Delete Beneficiary'}
            </DialogTitle>
            <DialogDescription>
              <span className="block">
                {t('deleteConfirmation') || 'Are you sure you want to delete this beneficiary? This action cannot be undone.'}
              </span>
              {beneficiary && (
                <span className="block mt-2 font-medium">
                  {beneficiary.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (t('deleting') || 'Deleting...') : (t('delete') || 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
