'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, User } from 'lucide-react'
import { theme } from '@/lib/theme'
import ContributorsReport from '../components/ContributorsReport'

export default function ContributorsReportPage() {
  const t = useTranslations('admin.reports')
  const { containerVariant } = useLayout()

  return (
    <ProtectedRoute>
      <PermissionGuard permission="reports:contributors">
        <div className="min-h-screen" style={{ background: theme.gradients.brandSubtle }}>
          <Container variant={containerVariant} className="py-4 sm:py-6 lg:py-8">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <div className="bg-gradient-to-r from-white via-indigo-50/30 to-white rounded-xl border border-gray-200/60 shadow-sm p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
                      <User className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                      {t('contributorReports')}
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">
                      {t('contributorReportsDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Report Content */}
            <ContributorsReport />
          </Container>
        </div>
      </PermissionGuard>
    </ProtectedRoute>
  )
}

