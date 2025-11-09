'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, Repeat } from 'lucide-react'
import PermissionGuard from '@/components/auth/PermissionGuard'

type CaseType = 'one-time' | 'recurring'

export default function CreateCasePage() {
  const t = useTranslations('cases')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const [selectedType, setSelectedType] = useState<CaseType | null>(null)

  const handleTypeSelection = (type: CaseType) => {
    setSelectedType(type)
  }

  const handleContinue = () => {
    if (selectedType) {
      router.push(`/${locale}/cases/create/details?type=${selectedType}`)
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <PermissionGuard 
      permissions={['cases:create']}
      fallback={
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="bg-white shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-red-500 mb-4">
                  <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600 mb-4">You don&apos;t have permission to create cases. Only administrators and moderators can create new cases.</p>
                <Button onClick={() => router.push(`/${locale}/cases`)} className="bg-blue-600 hover:bg-blue-700">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Cases
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('createCase')}
          </h1>
          <p className="text-gray-600">
            {t('createCaseDescription')}
          </p>
        </div>

        {/* Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* One-time Case */}
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedType === 'one-time' 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => handleTypeSelection('one-time')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  {t('oneTimeCase')}
                </CardTitle>
                {selectedType === 'one-time' && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 mb-4">
                {t('oneTimeCaseDescription')}
              </CardDescription>
              <div className="space-y-2 text-sm text-gray-500">
                <div>• {t('oneTimeCaseFeature1')}</div>
                <div>• {t('oneTimeCaseFeature2')}</div>
                <div>• {t('oneTimeCaseFeature3')}</div>
              </div>
            </CardContent>
          </Card>

          {/* Recurring Case */}
          <Card 
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedType === 'recurring' 
                ? 'ring-2 ring-green-500 bg-green-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => handleTypeSelection('recurring')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Repeat className="h-5 w-5 mr-2 text-green-600" />
                  {t('recurringCase')}
                </CardTitle>
                {selectedType === 'recurring' && (
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 mb-4">
                {t('recurringCaseDescription')}
              </CardDescription>
              <div className="space-y-2 text-sm text-gray-500">
                <div>• {t('recurringCaseFeature1')}</div>
                <div>• {t('recurringCaseFeature2')}</div>
                <div>• {t('recurringCaseFeature3')}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={!selectedType}
            className="px-8"
          >
            {t('continue')}
          </Button>
        </div>
      </div>
    </div>
    </PermissionGuard>
  )
} 