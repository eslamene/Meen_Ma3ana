'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, CheckCircle, XCircle, Clock, Building2, User as UserIcon, Calendar, DollarSign, MessageSquare } from 'lucide-react'

import { defaultLogger as logger } from '@/lib/logger'

interface SponsorshipRequest {
  id: string
  sponsor_id: string
  case_id: string
  amount: number
  status: string
  terms: string
  start_date: string
  end_date: string
  created_at: string
  sponsor: {
    first_name: string
    last_name: string
    email: string
    company_name?: string
  }
  case: {
    title: string
    description: string
    target_amount: number
    current_amount: number
    status: string
  }
}

interface SponsorshipFromSupabase {
  id: string
  sponsor_id: string
  case_id: string
  amount: string
  status: string
  terms: string | null
  start_date: string
  end_date: string
  created_at: string
  sponsor?: {
    first_name: string | null
    last_name: string | null
    email: string | null
    company_name?: string | null
  } | Array<{
    first_name: string | null
    last_name: string | null
    email: string | null
    company_name?: string | null
  }> | null
  case?: {
    title: string | null
    description: string | null
    target_amount: string | null
    current_amount: string | null
    status: string | null
  } | Array<{
    title: string | null
    description: string | null
    target_amount: string | null
    current_amount: string | null
    status: string | null
  }> | null
}

export default function AdminSponsorshipsPage() {
  const [sponsorships, setSponsorships] = useState<SponsorshipRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSponsorship, setSelectedSponsorship] = useState<SponsorshipRequest | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [processing, setProcessing] = useState(false)
  const { containerVariant } = useLayout()

  const checkAuthentication = useCallback(async () => {
    const supabase = createClient()
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        window.location.href = '/auth/login'
        return
      }

      // Check if user is admin via API
      const response = await fetch('/api/admin/role-check')
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/auth/login'
          return
        }
        if (response.status === 403) {
          window.location.href = '/dashboard'
          return
        }
        // For other errors, redirect to dashboard as fallback
        window.location.href = '/dashboard'
        return
      }

      const data = await response.json()
      
      if (!data.isAdmin) {
        window.location.href = '/dashboard'
        return
      }

    } catch (err) {
      logger.error('Error checking authentication:', { error: err })
      window.location.href = '/auth/login'
    }
  }, [])

  const fetchSponsorships = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/sponsorships')
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = '/auth/login'
          return
        }
        throw new Error(`Failed to fetch sponsorships: ${response.statusText}`)
      }

      const data = await response.json()
      setSponsorships(data.sponsorships || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sponsorship requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuthentication()
    fetchSponsorships()
  }, [checkAuthentication, fetchSponsorships])

  const handleApprove = async (sponsorshipId: string) => {
    try {
      setProcessing(true)
      
      const response = await fetch(`/api/admin/sponsorships/${sponsorshipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approve'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve sponsorship request')
      }

      await fetchSponsorships()
      setSelectedSponsorship(null)
      setReviewComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve sponsorship request')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (sponsorshipId: string) => {
    try {
      setProcessing(true)
      
      const response = await fetch(`/api/admin/sponsorships/${sponsorshipId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reject',
          reviewComment: reviewComment || 'Request rejected by admin'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reject sponsorship request')
      }

      await fetchSponsorships()
      setSelectedSponsorship(null)
      setReviewComment('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject sponsorship request')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const pendingSponsorships = sponsorships.filter(s => s.status === 'pending')
  const approvedSponsorships = sponsorships.filter(s => s.status === 'approved')
  const rejectedSponsorships = sponsorships.filter(s => s.status === 'rejected')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Container variant={containerVariant} className="py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading sponsorship requests...</p>
          </div>
        </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Container variant={containerVariant} className="py-8">
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">Sponsorship Management</h1>
          <p className="text-gray-600">Review and manage sponsorship requests from sponsors</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending ({pendingSponsorships.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approvedSponsorships.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejectedSponsorships.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <SponsorshipRequestList 
              sponsorships={pendingSponsorships}
              onReview={(sponsorship) => setSelectedSponsorship(sponsorship)}
              showActions={true}
            />
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            <SponsorshipRequestList 
              sponsorships={approvedSponsorships}
              onReview={(sponsorship) => setSelectedSponsorship(sponsorship)}
              showActions={false}
            />
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            <SponsorshipRequestList 
              sponsorships={rejectedSponsorships}
              onReview={(sponsorship) => setSelectedSponsorship(sponsorship)}
              showActions={false}
            />
          </TabsContent>
        </Tabs>
      </div>
      </Container>

      {/* Review Dialog */}
      <Dialog open={!!selectedSponsorship} onOpenChange={() => setSelectedSponsorship(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Sponsorship Request</DialogTitle>
            <DialogDescription>
              Review the sponsorship request details and take action.
            </DialogDescription>
          </DialogHeader>
          
          {selectedSponsorship && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Sponsor</h4>
                  <p className="text-sm text-gray-600">
                    {selectedSponsorship.sponsor.first_name} {selectedSponsorship.sponsor.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{selectedSponsorship.sponsor.email}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Case</h4>
                  <p className="text-sm text-gray-600">{selectedSponsorship.case.title}</p>
                  <p className="text-sm text-gray-600">
                    ${selectedSponsorship.case.current_amount.toLocaleString()} / ${selectedSponsorship.case.target_amount.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Amount</h4>
                  <p className="text-lg font-bold text-green-600">
                    ${selectedSponsorship.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">Duration</h4>
                  <p className="text-sm text-gray-600">
                    {formatDate(selectedSponsorship.start_date)} - {formatDate(selectedSponsorship.end_date)}
                  </p>
                </div>
              </div>

              {selectedSponsorship.terms && (
                <div>
                  <h4 className="font-semibold">Terms & Conditions</h4>
                  <p className="text-sm text-gray-600">{selectedSponsorship.terms}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold">Review Comment</h4>
                <Textarea
                  placeholder="Add a comment for approval or rejection reason..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedSponsorship(null)}
              disabled={processing}
            >
              Cancel
            </Button>
            {selectedSponsorship?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedSponsorship.id)}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedSponsorship.id)}
                  disabled={processing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SponsorshipRequestList({ 
  sponsorships, 
  onReview, 
  showActions 
}: { 
  sponsorships: SponsorshipRequest[]
  onReview: (sponsorship: SponsorshipRequest) => void
  showActions: boolean
}) {
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
            <h3 className="text-lg font-semibold mb-2">No sponsorship requests found</h3>
            <p className="text-gray-600">
              There are no sponsorship requests in this category.
            </p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-blue-600" />
                <div>
                  <span className="font-medium">
                    {sponsorship.sponsor.first_name} {sponsorship.sponsor.last_name}
                  </span>
                  <p className="text-sm text-gray-600">{sponsorship.sponsor.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-medium">${sponsorship.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span>{formatDate(sponsorship.start_date)} - {formatDate(sponsorship.end_date)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-orange-600" />
                <span>Submitted {formatDate(sponsorship.created_at)}</span>
              </div>
            </div>
            
            {showActions && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReview(sponsorship)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Review Request
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 