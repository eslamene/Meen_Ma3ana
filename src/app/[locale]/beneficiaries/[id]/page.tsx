'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, Upload, Download, Eye, User, Phone, MapPin, Calendar, IdCard, Mail, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BeneficiaryService } from '@/lib/services/beneficiaryService'
import { BeneficiaryDocumentService } from '@/lib/services/beneficiaryDocumentService'
import type { Beneficiary, BeneficiaryDocument } from '@/types/beneficiary'

export default function BeneficiaryDetailPage() {
  const t = useTranslations('beneficiaries')
  const params = useParams()
  const router = useRouter()
  
  const beneficiaryId = params.id as string
  const locale = params.locale as string
  
  // State
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null)
  const [documents, setDocuments] = useState<BeneficiaryDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Load beneficiary data
  useEffect(() => {
    const loadBeneficiary = async () => {
      try {
        setLoading(true)
        const beneficiaryData = await BeneficiaryService.getById(beneficiaryId)
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

  // Load documents
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setDocumentsLoading(true)
        const documentsData = await BeneficiaryDocumentService.getByBeneficiaryId(beneficiaryId)
        setDocuments(documentsData)
      } catch (error) {
        console.error('Error loading documents:', error)
      } finally {
        setDocumentsLoading(false)
      }
    }

    if (beneficiaryId) {
      loadDocuments()
    }
  }, [beneficiaryId])

  const handleDeleteBeneficiary = async () => {
    if (!beneficiary) return

    try {
      setDeleting(true)
      await BeneficiaryService.delete(beneficiary.id)
      router.push(`/${locale}/beneficiaries`)
    } catch (error) {
      console.error('Error deleting beneficiary:', error)
      alert('Failed to delete beneficiary')
    } finally {
      setDeleting(false)
    }
  }

  const handleDocumentUploaded = (document: BeneficiaryDocument) => {
    setDocuments(prev => [document, ...prev])
  }

  const handleDocumentDeleted = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))
  }

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType === 'application/pdf') return '📄'
    return '📁'
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!beneficiary) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <CardContent>
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('beneficiaryNotFound') || 'Beneficiary not found'}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('beneficiaryNotFoundDescription') || 'The beneficiary you are looking for does not exist.'}
            </p>
            <Button onClick={() => router.push(`/${locale}/beneficiaries`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToBeneficiaries') || 'Back to Beneficiaries'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/beneficiaries')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back') || 'Back'}
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{beneficiary.name}</h1>
            <p className="text-gray-600 mt-1">{t('beneficiaryDetails') || 'Beneficiary Details'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/beneficiaries/${beneficiary.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            {t('edit') || 'Edit'}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('delete') || 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Beneficiary Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('basicInformation') || 'Basic Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('name') || 'Name'}</label>
                  <p className="text-lg font-semibold">{beneficiary.name}</p>
                </div>
                {beneficiary.name_ar && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('nameAr') || 'Name (Arabic)'}</label>
                    <p className="text-lg font-semibold">{beneficiary.name_ar}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('age') || 'Age'}</label>
                  <p className="text-lg">{beneficiary.age || t('notSpecified') || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('gender') || 'Gender'}</label>
                  <p className="text-lg capitalize">{beneficiary.gender || t('notSpecified') || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('riskLevel') || 'Risk Level'}</label>
                  <Badge className={getRiskLevelColor(beneficiary.risk_level)}>
                    {t(beneficiary.risk_level) || beneficiary.risk_level}
                  </Badge>
                </div>
                {beneficiary.is_verified && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('status') || 'Status'}</label>
                    <Badge className="bg-green-500 text-white">
                      {t('verified') || 'Verified'}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                {t('contactInformation') || 'Contact Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {beneficiary.mobile_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">{t('mobileNumber') || 'Mobile Number'}</label>
                      <p className="text-lg">{beneficiary.mobile_number}</p>
                    </div>
                  </div>
                )}
                {beneficiary.additional_mobile_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">{t('additionalMobileNumber') || 'Additional Mobile'}</label>
                      <p className="text-lg">{beneficiary.additional_mobile_number}</p>
                    </div>
                  </div>
                )}
                {beneficiary.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">{t('email') || 'Email'}</label>
                      <p className="text-lg">{beneficiary.email}</p>
                    </div>
                  </div>
                )}
                {beneficiary.alternative_contact && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <label className="text-sm font-medium text-gray-500">{t('alternativeContact') || 'Alternative Contact'}</label>
                      <p className="text-lg">{beneficiary.alternative_contact}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Identification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IdCard className="h-5 w-5" />
                {t('identification') || 'Identification'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('idType') || 'ID Type'}</label>
                  <p className="text-lg capitalize">{beneficiary.id_type || t('notSpecified') || 'Not specified'}</p>
                </div>
                {beneficiary.national_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('nationalId') || 'National ID'}</label>
                    <p className="text-lg font-mono">{beneficiary.national_id}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('country') || 'Country'}</label>
                  <p className="text-lg">{beneficiary.country}</p>
                </div>
                {beneficiary.city && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('city') || 'City'}</label>
                    <p className="text-lg">{beneficiary.city}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          {(beneficiary.address || beneficiary.medical_condition || beneficiary.notes) && (
            <Card>
              <CardHeader>
                <CardTitle>{t('additionalInformation') || 'Additional Information'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {beneficiary.address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('address') || 'Address'}</label>
                    <p className="text-lg">{beneficiary.address}</p>
                  </div>
                )}
                {beneficiary.medical_condition && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('medicalCondition') || 'Medical Condition'}</label>
                    <p className="text-lg">{beneficiary.medical_condition}</p>
                  </div>
                )}
                {beneficiary.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">{t('notes') || 'Notes'}</label>
                    <p className="text-lg">{beneficiary.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {t('documents') || 'Documents'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(doc.mime_type || '')}</span>
                        <div>
                          <p className="font-medium text-sm">{doc.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {doc.is_public ? t('public') || 'Public' : t('private') || 'Private'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = doc.file_url
                            link.download = doc.file_name
                            link.click()
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{t('noDocuments') || 'No documents uploaded'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('statistics') || 'Statistics'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('totalCases') || 'Total Cases'}</span>
                <span className="font-semibold">{beneficiary.total_cases || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('activeCases') || 'Active Cases'}</span>
                <span className="font-semibold">{beneficiary.active_cases || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('created') || 'Created'}</span>
                <span className="font-semibold">{formatDate(beneficiary.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">{t('lastUpdated') || 'Last Updated'}</span>
                <span className="font-semibold">{formatDate(beneficiary.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteBeneficiary') || 'Delete Beneficiary'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              {t('deleteConfirmation') || 'Are you sure you want to delete this beneficiary? This action cannot be undone.'}
            </p>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{beneficiary.name}</p>
              <p className="text-sm text-gray-600">{beneficiary.mobile_number}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleting}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBeneficiary}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('deleting') || 'Deleting...'}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('delete') || 'Delete'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
