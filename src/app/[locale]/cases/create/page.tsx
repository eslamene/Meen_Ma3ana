'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, Repeat } from 'lucide-react'

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
  )
} 