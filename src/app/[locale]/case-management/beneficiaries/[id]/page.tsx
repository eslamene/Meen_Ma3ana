'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { ArrowLeft, Edit, Trash2, Upload, Download, Eye, User, Phone, MapPin, Calendar, IdCard, Mail, AlertTriangle, FileText, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DetailPageHeader, DetailPageFooter } from '@/components/crud'
import BeneficiaryFileManager from '@/components/beneficiaries/BeneficiaryFileManager'
import { toast } from 'sonner'
import type { Beneficiary, BeneficiaryDocument } from '@/types/beneficiary'

import { defaultLogger as logger } from '@/lib/logger'

export default function BeneficiaryDetailPage() {
  const t = useTranslations('beneficiaries')
  const params = useParams()
  const router = useRouter()
  const { containerVariant } = useLayout()
  
  const beneficiaryId = params.id as string
  const locale = params.locale as string
  
  // State
  const [beneficiary, setBeneficiary] = useState<Beneficiary | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  const handleDeleteBeneficiary = async () => {
    if (!beneficiary) return

    try {
      setDeleting(true)
      
      // Use API endpoint to bypass RLS (same as create/update)
      const response = await fetch(`/api/beneficiaries/${beneficiary.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete beneficiary' }))
        throw new Error(errorData.error || 'Failed to delete beneficiary')
      }
      
      toast.success(
        'Success',
        { description: `Beneficiary "${beneficiary.name || 'Untitled'}" has been deleted successfully.` }
      )
      
      router.push(`/${locale}/beneficiaries`)
    } catch (error) {
      logger.error('Error deleting beneficiary:', { error: error })
      toast.error(
        'Delete Failed',
        { description: error instanceof Error ? error.message : 'Failed to delete beneficiary' }  
      )
      setDeleting(false)
    }
  }


  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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

  // Removed getFileIcon - now handled by BeneficiaryFileManager
  const _getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType === 'application/pdf') return '📄'
    return '📁'
  }

  const getRiskLevelBadgeVariant = (riskLevel: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (riskLevel) {
      case 'low': return 'default'
      case 'medium': return 'secondary'
      case 'high': return 'destructive'
      case 'critical': return 'destructive'
      default: return 'outline'
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
              <Button onClick={() => router.push(`/${locale}/beneficiaries`)}>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
      <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
      {/* Header */}
        <DetailPageHeader
          backUrl={`/${locale}/beneficiaries`}
          icon={User}
          title={beneficiary.name}
          description={t('beneficiaryDetails') || 'Beneficiary Details'}
          backLabel={t('back') || 'Back'}
          badge={beneficiary.risk_level ? {
            label: t(beneficiary.risk_level) || beneficiary.risk_level,
            variant: getRiskLevelBadgeVariant(beneficiary.risk_level),
            className: getRiskLevelColor(beneficiary.risk_level)
          } : undefined}
          metadata={
            <div className="flex items-center gap-4 flex-wrap text-xs sm:text-sm text-gray-500">
              {beneficiary.is_verified && (
                <Badge className="bg-green-500 text-white border-0">
                  {t('verified') || 'Verified'}
                </Badge>
              )}
              {beneficiary.mobile_number && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>{beneficiary.mobile_number}</span>
          </div>
              )}
        </div>
          }
          menuActions={[
            {
              label: t('edit') || 'Edit',
              icon: Edit,
              onClick: () => router.push(`/${locale}/beneficiaries/${beneficiary.id}/edit`),
            },
            {
              label: t('delete') || 'Delete',
              icon: Trash2,
              onClick: () => setIsDeleteDialogOpen(true),
              variant: 'destructive',
            },
          ]}
        />

      {/* Statistics Section - At Top */}
      <div className="mb-8">
        <Card className="border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 border-b-0 pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl text-white">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              {t('statistics') || 'Statistics'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Total Cases */}
              <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-lg shadow-md">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider">{t('totalCases') || 'Total Cases'}</p>
                    <p className="text-3xl font-bold text-white">{beneficiary.total_cases || 0}</p>
                  </div>
                </div>
              </div>

              {/* Active Cases */}
              <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-lg shadow-md">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-green-100 uppercase tracking-wider">{t('activeCases') || 'Active Cases'}</p>
                    <p className="text-3xl font-bold text-white">{beneficiary.active_cases || 0}</p>
                  </div>
                </div>
              </div>

              {/* Created Date */}
              <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-lg shadow-md">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-purple-100 uppercase tracking-wider">{t('created') || 'Created'}</p>
                    <p className="text-sm font-semibold text-white leading-tight">{new Date(beneficiary.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-xs text-purple-100">{new Date(beneficiary.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>

              {/* Last Updated */}
              <div className="group relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-600 to-orange-600 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-lg shadow-md">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-orange-100 uppercase tracking-wider">{t('lastUpdated') || 'Last Updated'}</p>
                    <p className="text-sm font-semibold text-white leading-tight">{new Date(beneficiary.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <p className="text-xs text-orange-100">{new Date(beneficiary.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout: Beneficiary Info and Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Left Column - Beneficiary Information */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="border-gray-200/60 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-gray-200/60">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                {t('basicInformation') || 'Basic Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('name') || 'Name'}</label>
                  <p className="text-lg font-semibold text-gray-900">{beneficiary.name}</p>
                </div>
                {beneficiary.name_ar && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('nameAr') || 'Name (Arabic)'}</label>
                    <p className="text-lg font-semibold text-gray-900">{beneficiary.name_ar}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('age') || 'Age'}</label>
                  <p className="text-lg text-gray-700">{beneficiary.age || <span className="text-gray-400 italic">{t('notSpecified') || 'Not specified'}</span>}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('gender') || 'Gender'}</label>
                  <p className="text-lg text-gray-700 capitalize">{beneficiary.gender || <span className="text-gray-400 italic">{t('notSpecified') || 'Not specified'}</span>}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('riskLevel') || 'Risk Level'}</label>
                  <Badge className={`${getRiskLevelColor(beneficiary.risk_level)} border font-semibold`}>
                    {t(beneficiary.risk_level) || beneficiary.risk_level}
                  </Badge>
                </div>
                {beneficiary.is_verified && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('status') || 'Status'}</label>
                    <Badge className="bg-green-500 text-white border-0 font-semibold">
                      {t('verified') || 'Verified'}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-gray-200/60 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 border-b border-gray-200/60">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                {t('contactInformation') || 'Contact Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {beneficiary.mobile_number && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50/50 rounded-lg border border-gray-200/60">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{t('mobileNumber') || 'Mobile Number'}</label>
                      <p className="text-lg font-medium text-gray-900 break-all">{beneficiary.mobile_number}</p>
                    </div>
                  </div>
                )}
                {beneficiary.additional_mobile_number && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50/50 rounded-lg border border-gray-200/60">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Phone className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{t('additionalMobileNumber') || 'Additional Mobile'}</label>
                      <p className="text-lg font-medium text-gray-900 break-all">{beneficiary.additional_mobile_number}</p>
                    </div>
                  </div>
                )}
                {beneficiary.email && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50/50 rounded-lg border border-gray-200/60">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Mail className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{t('email') || 'Email'}</label>
                      <p className="text-lg font-medium text-gray-900 break-all">{beneficiary.email}</p>
                    </div>
                  </div>
                )}
                {beneficiary.alternative_contact && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50/50 rounded-lg border border-gray-200/60">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <User className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{t('alternativeContact') || 'Alternative Contact'}</label>
                      <p className="text-lg font-medium text-gray-900 break-all">{beneficiary.alternative_contact}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Identification */}
          <Card className="border-gray-200/60 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 border-b border-gray-200/60">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <IdCard className="h-5 w-5 text-white" />
                </div>
                {t('identification') || 'Identification'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('idType') || 'ID Type'}</label>
                  <p className="text-lg text-gray-700 capitalize">{beneficiary.id_type || <span className="text-gray-400 italic">{t('notSpecified') || 'Not specified'}</span>}</p>
                </div>
                {beneficiary.national_id && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('nationalId') || 'National ID'}</label>
                    <p className="text-lg font-mono text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{beneficiary.national_id}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('country') || 'Country'}</label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <p className="text-lg text-gray-700">{beneficiary.country}</p>
                  </div>
                </div>
                {beneficiary.city && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('city') || 'City'}</label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <p className="text-lg text-gray-700">{beneficiary.city}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          {(beneficiary.address || beneficiary.medical_condition || beneficiary.notes) && (
            <Card className="border-gray-200/60 shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="bg-gradient-to-r from-amber-50/50 to-orange-50/50 border-b border-gray-200/60">
                <CardTitle className="text-xl flex items-center gap-2">
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  {t('additionalInformation') || 'Additional Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {beneficiary.address && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      {t('address') || 'Address'}
                    </label>
                    <p className="text-lg text-gray-700 leading-relaxed">{beneficiary.address}</p>
                  </div>
                )}
                {beneficiary.medical_condition && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('medicalCondition') || 'Medical Condition'}</label>
                    <p className="text-lg text-gray-700 leading-relaxed">{beneficiary.medical_condition}</p>
                  </div>
                )}
                {beneficiary.notes && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('notes') || 'Notes'}</label>
                    <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">{beneficiary.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Documents */}
        <div className="space-y-6">
          <Card className="border-gray-200/60 shadow-md hover:shadow-lg transition-shadow duration-200 h-fit">
            <CardContent className="pt-6">
              <BeneficiaryFileManager
                beneficiaryId={beneficiaryId}
                canEdit={false}
              />
            </CardContent>
          </Card>
        </div>
      </div>

        {/* Footer */}
        {beneficiary && (
          <DetailPageFooter
            primaryAction={{
              label: t('edit') || 'Edit',
              onClick: () => {
                if (beneficiary.id) {
                  router.push(`/${locale}/beneficiaries/${beneficiary.id}/edit`)
                }
              },
              icon: <Edit className="h-4 w-4 mr-2" />
            }}
            secondaryActions={[
              {
                label: t('delete') || 'Delete',
                onClick: () => setIsDeleteDialogOpen(true),
                variant: 'destructive',
                icon: <Trash2 className="h-4 w-4 mr-2" />
              }
            ]}
          />
        )}
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {t('deleteBeneficiary') || 'Delete Beneficiary'}
            </DialogTitle>
            <DialogDescription className="mt-2">
              {t('deleteConfirmation') || 'Are you sure you want to delete this beneficiary? This action cannot be undone.'}
            </DialogDescription>
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="font-semibold text-gray-900">{beneficiary.name}</p>
              {beneficiary.mobile_number && (
                <p className="text-sm text-gray-600 mt-1">{beneficiary.mobile_number}</p>
              )}
            </div>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
