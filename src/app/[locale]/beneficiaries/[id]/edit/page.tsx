'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import BeneficiaryForm from '@/components/beneficiaries/BeneficiaryForm'
import { BeneficiaryService } from '@/lib/services/beneficiaryService'
import { LookupService } from '@/lib/services/lookupService'
import { BeneficiaryDocumentService } from '@/lib/services/beneficiaryDocumentService'
import type { Beneficiary, UpdateBeneficiaryData, City, IdType, DocumentType } from '@/types/beneficiary'

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

  // Load beneficiary data
  useEffect(() => {
    const loadBeneficiary = async () => {
      try {
        setLoading(true)
        const beneficiaryData = await BeneficiaryService.getById(beneficiaryId)
        if (!beneficiaryData) {
          throw new Error('Beneficiary not found')
        }
        setBeneficiary(beneficiaryData)
      } catch (error) {
        console.error('Error loading beneficiary:', error)
        router.push(`/${locale}/beneficiaries`)
      } finally {
        setLoading(false)
      }
    }

    if (beneficiaryId) {
      loadBeneficiary()
    }
  }, [beneficiaryId, router])

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
        console.error('Error loading lookup data:', error)
      }
    }

    loadLookupData()
  }, [])

  const handleSubmit = async (data: UpdateBeneficiaryData, documents?: Array<{ file: File; documentType: DocumentType; isPublic: boolean; description?: string }>) => {
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
      
      // Upload documents if provided
      if (documents && documents.length > 0) {
        for (const docData of documents) {
          try {
            const safeName = docData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const fileName = `beneficiary-documents/${updatedBeneficiary.id}/${docData.documentType}-${Date.now()}-${safeName}`
            
            const formData = new FormData()
            formData.append('file', docData.file)
            formData.append('fileName', fileName)
            formData.append('bucket', 'beneficiaries')
            
            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            })
            
            if (uploadResponse.ok) {
              const uploadData = await uploadResponse.json()
              await BeneficiaryDocumentService.create({
                beneficiary_id: updatedBeneficiary.id,
                document_type: docData.documentType,
                file_name: docData.file.name,
                file_url: uploadData.url,
                file_size: docData.file.size,
                mime_type: docData.file.type,
                is_public: docData.isPublic,
                description: docData.description?.trim() || undefined
              })
            }
          } catch (docError) {
            console.error('Error uploading document:', docError)
            // Continue with other documents even if one fails
          }
        }
      }
      
      router.push(`/${locale}/beneficiaries/${updatedBeneficiary.id}`)
    } catch (error) {
      console.error('Error updating beneficiary:', error)
      alert(error instanceof Error ? error.message : 'Failed to update beneficiary. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Container variant={containerVariant} className="py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Container>
      </div>
    )
  }

  if (!beneficiary) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Container variant={containerVariant} className="py-8">
          <Card className="text-center py-12">
          <CardContent>
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('beneficiaryNotFound') || 'Beneficiary not found'}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('beneficiaryNotFoundDescription') || 'The beneficiary you are looking for does not exist.'}
            </p>
            <Button onClick={() => router.push('/beneficiaries')}>
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
      <Container variant={containerVariant} className="py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/${locale}/beneficiaries/${beneficiaryId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('back') || 'Back'}
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('editBeneficiary') || 'Edit Beneficiary'}</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">{t('editBeneficiaryDescription') || 'Update beneficiary information'}</p>
            </div>
          </div>
        </div>

        <div className="w-full">
          <BeneficiaryForm
            mode="edit"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            idTypes={idTypes}
            cities={cities}
            showDocuments={true}
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
      </Container>
    </div>
  )
}
