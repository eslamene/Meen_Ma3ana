'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle, ArrowLeft, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

interface AccessDeniedProps {
  requiredPermission?: string
  requiredRole?: string
  resource?: string
  action?: string
  showBackButton?: boolean
}

export default function AccessDenied({
  requiredPermission,
  requiredRole,
  resource,
  action,
  showBackButton = true
}: AccessDeniedProps) {
  const t = useTranslations('auth')
  const router = useRouter()

  const handleGoBack = () => {
    router.back()
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {t('accessDenied')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p className="mb-2">
              {t('accessDeniedMessage')}
            </p>
            
            {requiredPermission && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">
                    <strong>{t('requiredPermission')}:</strong> {requiredPermission}
                  </span>
                </div>
              </div>
            )}

            {requiredRole && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                  <span className="text-sm text-yellow-800">
                    <strong>{t('requiredRole')}:</strong> {requiredRole}
                  </span>
                </div>
              </div>
            )}

            {resource && action && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm text-blue-800">
                    <strong>{t('requiredAccess')}:</strong> {action} {resource}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-2">
            {showBackButton && (
              <Button
                variant="outline"
                onClick={handleGoBack}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('goBack')}
              </Button>
            )}
            
            <Button
              onClick={handleGoHome}
              className="w-full"
            >
              {t('goHome')}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>
              {t('contactAdmin')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
