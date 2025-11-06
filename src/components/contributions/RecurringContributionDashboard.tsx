'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  CreditCard, 
  Repeat, 
  Pause, 
  Play, 
  X, 
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface RecurringContribution {
  id: string
  amount: number
  frequency: string
  status: string
  start_date: string
  end_date: string | null
  next_contribution_date: string
  total_contributions: number
  successful_contributions: number
  failed_contributions: number
  payment_method: string
  auto_process: boolean
  notes: string | null
  case_id: string | null
  project_id: string | null
  created_at: string
}

interface Case {
  id: string
  title: string
}

interface Project {
  id: string
  name: string
}

export default function RecurringContributionDashboard() {
  const t = useTranslations('contributions')
  const [user, setUser] = useState<User | null>(null)
  const [contributions, setContributions] = useState<RecurringContribution[]>([])
  const [cases, setCases] = useState<Record<string, Case>>({})
  const [projects, setProjects] = useState<Record<string, Project>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error getting user:', error)
        return
      }
      setUser(user)
    }

    getUser()
  }, [supabase.auth])

  const fetchRecurringContributions = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('recurring_contributions')
        .select('*')
        .eq('donor_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setContributions(data || [])

      // Fetch related cases and projects
      const caseIds = data?.filter(c => c.case_id).map(c => c.case_id) || []
      const projectIds = data?.filter(c => c.project_id).map(c => c.project_id) || []

      if (caseIds.length > 0) {
        const { data: caseData } = await supabase
          .from('cases')
          .select('id, title')
          .in('id', caseIds)
        
        const caseMap = (caseData || []).reduce((acc, c) => {
          acc[c.id] = c
          return acc
        }, {} as Record<string, Case>)
        
        setCases(caseMap)
      }

      if (projectIds.length > 0) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds)
        
        const projectMap = (projectData || []).reduce((acc, p) => {
          acc[p.id] = p
          return acc
        }, {} as Record<string, Project>)
        
        setProjects(projectMap)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch recurring contributions')
    } finally {
      setLoading(false)
    }
  }, [supabase, user?.id])

  useEffect(() => {
    if (user) {
      fetchRecurringContributions()
    }
  }, [user, fetchRecurringContributions])

  const handleStatusChange = async (contributionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('recurring_contributions')
        .update({ status: newStatus })
        .eq('id', contributionId)

      if (error) throw error

      // Refresh the list
      fetchRecurringContributions()
    } catch (err: any) {
      setError(err.message || 'Failed to update contribution status')
    }
  }

  const handleCancel = async (contributionId: string) => {
    try {
      const { error } = await supabase
        .from('recurring_contributions')
        .update({ status: 'cancelled' })
        .eq('id', contributionId)

      if (error) throw error

      // Refresh the list
      fetchRecurringContributions()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel contribution')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">{t('active')}</Badge>
      case 'paused':
        return <Badge variant="secondary">{t('paused')}</Badge>
      case 'cancelled':
        return <Badge variant="destructive">{t('cancelled')}</Badge>
      case 'completed':
        return <Badge variant="outline">{t('completed')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'weekly':
        return t('weekly')
      case 'monthly':
        return t('monthly')
      case 'quarterly':
        return t('quarterly')
      case 'yearly':
        return t('yearly')
      default:
        return frequency
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'bank_transfer':
        return t('bankTransfer')
      case 'credit_card':
        return t('creditCard')
      case 'paypal':
        return t('paypal')
      default:
        return method
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Repeat className="h-5 w-5" />
            <span>{t('recurringContributions')}</span>
          </CardTitle>
          <CardDescription>
            {t('manageRecurringContributions')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {contributions.length === 0 ? (
            <div className="text-center py-8">
              <Repeat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('noRecurringContributions')}
              </h3>
              <p className="text-gray-600">
                {t('noRecurringContributionsDescription')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {contributions.map((contribution) => {
                const relatedCase = contribution.case_id ? cases[contribution.case_id] : null
                const relatedProject = contribution.project_id ? projects[contribution.project_id] : null
                const nextDate = new Date(contribution.next_contribution_date)
                const isOverdue = nextDate < new Date() && contribution.status === 'active'
                
                return (
                  <Card key={contribution.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            ${contribution.amount.toFixed(2)} {getFrequencyLabel(contribution.frequency)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {relatedCase?.title || relatedProject?.name || t('generalContribution')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(contribution.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {t('nextContribution')}: {nextDate.toLocaleDateString()}
                            {isOverdue && <span className="text-red-500 ml-1">({t('overdue')})</span>}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{getPaymentMethodLabel(contribution.payment_method)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {contribution.successful_contributions}/{contribution.total_contributions} {t('successful')}
                          </span>
                        </div>
                      </div>

                      {contribution.total_contributions > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{t('successRate')}</span>
                            <span>{Math.round((contribution.successful_contributions / contribution.total_contributions) * 100)}%</span>
                          </div>
                          <Progress 
                            value={(contribution.successful_contributions / contribution.total_contributions) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}

                      <div className="flex justify-end space-x-2">
                        {contribution.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(contribution.id, 'paused')}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            {t('pause')}
                          </Button>
                        )}
                        {contribution.status === 'paused' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(contribution.id, 'active')}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            {t('resume')}
                          </Button>
                        )}
                        {contribution.status !== 'cancelled' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancel(contribution.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            {t('cancel')}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 