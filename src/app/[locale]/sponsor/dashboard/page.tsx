'use client'
import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Plus, Calendar, DollarSign, Building2, CheckCircle, Clock, XCircle } from 'lucide-react'

import { defaultLogger as logger } from '@/lib/logger'

interface Sponsorship {
  id: string
  case_id: string
  amount: number
  status: string
  start_date: string
  end_date: string
  created_at: string
  case: {
    title: string
    description: string
    target_amount: number
    current_amount: number
    status: string
  }
}

export default function SponsorDashboardPage() {
  const t = useTranslations('sponsorships')
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const [user, setUser] = useState<User | null>(null)
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchSponsorships = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/sponsor/dashboard')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        throw new Error(`Failed to fetch sponsorships: ${response.statusText}`)
      }

      const data = await response.json()
      setSponsorships(data.sponsorships || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sponsorships')
    } finally {
      setLoading(false)
    }
  }, [router])

  const checkAuthentication = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/auth/login')
        return
      }

      setUser(user)
      fetchSponsorships()
    } catch (err) {
      logger.error('Error checking authentication:', { error: err })
      router.push('/auth/login')
    }
  }, [supabase.auth, router, fetchSponsorships])

  useEffect(() => {
    checkAuthentication()
  }, [checkAuthentication])

  const pendingSponsorships = sponsorships.filter(s => s.status === 'pending')
  const approvedSponsorships = sponsorships.filter(s => s.status === 'approved')
  const rejectedSponsorships = sponsorships.filter(s => s.status === 'rejected')

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading sponsorships...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-gray-600">{t('description')}</p>
          </div>
          <Button onClick={() => router.push('/sponsor/request')}>
            <Plus className="h-4 w-4 mr-2" />
            New Sponsorship Request
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({sponsorships.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingSponsorships.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedSponsorships.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedSponsorships.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <SponsorshipList sponsorships={sponsorships} />
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <SponsorshipList sponsorships={pendingSponsorships} />
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            <SponsorshipList sponsorships={approvedSponsorships} />
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            <SponsorshipList sponsorships={rejectedSponsorships} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function SponsorshipList({ sponsorships }: { sponsorships: Sponsorship[] }) {
  const router = useRouter()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (sponsorships.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sponsorships found</h3>
            <p className="text-gray-600 mb-4">
              You haven&apos;t submitted any sponsorship requests yet.
            </p>
            <Button onClick={() => router.push('/sponsor/request')}>
              <Plus className="h-4 w-4 mr-2" />
              Submit Your First Request
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {sponsorships.map((sponsorship) => (
        <Card key={sponsorship.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{sponsorship.case.title}</CardTitle>
                <CardDescription className="mt-2">
                  {sponsorship.case.description}
                </CardDescription>
              </div>
              {getStatusBadge(sponsorship.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-medium">${sponsorship.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>{formatDate(sponsorship.start_date)} - {formatDate(sponsorship.end_date)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span>Submitted {formatDate(sponsorship.created_at)}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Case Progress:</span>
                  <span className="text-sm font-medium">
                    ${sponsorship.case.current_amount.toLocaleString()} / ${sponsorship.case.target_amount.toLocaleString()}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/${locale}/cases/${sponsorship.case_id}`)}
                >
                  View Case
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 