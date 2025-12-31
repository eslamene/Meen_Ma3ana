'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, User, Target, DollarSign, CreditCard, ArrowRight } from 'lucide-react'
import { theme, brandColors } from '@/lib/theme'
import { useAdmin } from '@/lib/admin/hooks'

export default function AdminReportsPage() {
  const t = useTranslations('admin.reports')
  const router = useRouter()
  const params = useParams()
  const { containerVariant } = useLayout()
  const { hasPermission } = useAdmin()

  const reports = [
    {
      id: 'contributors',
      title: t('contributorReports'),
      description: t('contributorReportsDescription'),
      icon: User,
      permission: 'reports:contributors',
      href: `/${params.locale}/admin/reports/contributors`,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'cases',
      title: t('casePerformance'),
      description: t('casePerformanceDescription'),
      icon: Target,
      permission: 'reports:cases',
      href: `/${params.locale}/admin/reports/cases`,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
    },
    {
      id: 'financial',
      title: t('financialSummary'),
      description: t('financialSummaryDescription'),
      icon: DollarSign,
      permission: 'reports:financial',
      href: `/${params.locale}/admin/reports/financial`,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      id: 'payment-methods',
      title: t('paymentMethods'),
      description: t('paymentMethodsDescription'),
      icon: CreditCard,
      permission: 'reports:payment-methods',
      href: `/${params.locale}/admin/reports/payment-methods`,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  const availableReports = reports.filter((report) => hasPermission(report.permission))

  return (
    <ProtectedRoute>
      <PermissionGuard permission="admin:analytics">
        <div className="min-h-screen" style={{ background: theme.gradients.brandSubtle }}>
          <Container variant={containerVariant} className="py-4 sm:py-6 lg:py-8">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <div className="bg-gradient-to-r from-white via-indigo-50/30 to-white rounded-xl border border-gray-200/60 shadow-sm p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg">
                      <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                      {t('title')}
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">
                      Comprehensive reporting and analytics for system administration. Select a report to view detailed insights.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reports Grid */}
            {availableReports.length === 0 ? (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('noReportsAvailable')}</h3>
                  <p className="text-gray-600">
                    {t('noReportsDescription')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableReports.map((report) => {
                  const Icon = report.icon
                  return (
                    <Card
                      key={report.id}
                      className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                      style={{ boxShadow: theme.shadows.primary }}
                      onClick={() => router.push(report.href)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-4 rounded-xl bg-gradient-to-br ${report.color} shadow-lg group-hover:scale-110 transition-transform`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.title}</h3>
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{report.description}</p>
                            <Button
                              variant="outline"
                              className="w-full group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(report.href)
                              }}
                            >
                              {t('viewReport')}
                              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </Container>
        </div>
      </PermissionGuard>
    </ProtectedRoute>
  )
}
