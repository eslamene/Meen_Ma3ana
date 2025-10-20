'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Repeat } from 'lucide-react'
import RecurringContributionForm from '@/components/contributions/RecurringContributionForm'
import RecurringContributionDashboard from '@/components/contributions/RecurringContributionDashboard'

export default function RecurringContributionsPage() {
  const t = useTranslations('contributions')
  const [showSetupForm, setShowSetupForm] = useState(false)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('recurringContributions')}
        </h1>
        <p className="text-gray-600">
          {t('manageRecurringContributions')}
        </p>
      </div>

      <Tabs defaultValue="manage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="setup">Setup New</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {t('recurringContributions')}
              </h2>
              <p className="text-gray-600">
                {t('manageRecurringContributions')}
              </p>
            </div>
            <Button onClick={() => setShowSetupForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Setup New
            </Button>
          </div>

          {showSetupForm ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Repeat className="h-5 w-5" />
                  <span>Setup New Recurring Contribution</span>
                </CardTitle>
                <CardDescription>
                  {t('recurringContributionDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecurringContributionForm
                  onSuccess={() => {
                    setShowSetupForm(false)
                    // Refresh the dashboard
                    window.location.reload()
                  }}
                  onCancel={() => setShowSetupForm(false)}
                />
              </CardContent>
            </Card>
          ) : (
            <RecurringContributionDashboard />
          )}
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Setup New Recurring Contribution
            </h2>
            <p className="text-gray-600 mb-6">
              {t('recurringContributionDescription')}
            </p>
          </div>

          <RecurringContributionForm
            onSuccess={() => {
              // Redirect to manage tab
              const manageTab = document.querySelector('[data-value="manage"]') as HTMLElement
              if (manageTab) {
                manageTab.click()
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
} 