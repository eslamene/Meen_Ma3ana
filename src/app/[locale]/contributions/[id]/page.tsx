'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ArrowLeft, DollarSign, User, MessageSquare, CheckCircle, XCircle, Clock, AlertCircle, Copy, ExternalLink, Eye, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import ContributionRevisionModal from '@/components/contributions/ContributionRevisionModal'

interface Contribution {
  id: string
  caseId: string
  amount: number
  proofUrl?: string
  payment_method?: string
  status: 'pending' | 'approved' | 'rejected'
  anonymous: boolean
  createdAt: string
  caseTitle: string
  donorName: string
  donorId?: string
  donorEmail?: string
  donorFirstName?: string
  donorLastName?: string
  donorPhone?: string
  notes?: string
  approval_status?: Array<{
    id: string
    status: 'pending' | 'approved' | 'rejected' | 'acknowledged'
    rejection_reason?: string
    admin_comment?: string
    donor_reply?: string
    donor_reply_date?: string
    payment_proof_url?: string
    resubmission_count: number
    created_at: string
    updated_at: string
  }>
  original_contribution?: {
    id: string
    amount: number
    status: string
    created_at: string
    rejection_reason?: string
    admin_comment?: string
  }
  is_revision?: boolean
}

export default function ContributionDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const contributionId = params.id as string
  const { toast } = useToast()
  
  const [contribution, setContribution] = useState<Contribution | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRevisionModal, setShowRevisionModal] = useState(false)

  const supabase = createClient()

  const fetchContribution = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Please log in to view contribution details')
        return
      }

      const response = await fetch(`/api/contributions/${contributionId}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 404) {
          setError(errorData.error || 'Contribution not found')
        } else if (response.status === 403) {
          setError(errorData.error || errorData.message || 'You do not have permission to view this contribution')
        } else if (response.status === 401) {
          setError('Please log in to view contribution details')
        } else {
          setError(errorData.error || errorData.message || 'Failed to load contribution details')
        }
        return
      }

      const data = await response.json()
      setContribution(data)
    } catch (error) {
      console.error('Error fetching contribution:', error)
      setError('Failed to load contribution details')
    } finally {
      setLoading(false)
    }
  }, [contributionId, supabase])

  useEffect(() => {
    fetchContribution()
  }, [fetchContribution])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date available'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const truncateId = (id: string) => {
    if (!id) return ''
    if (id.length <= 12) return id
    return `${id.slice(0, 6)}...${id.slice(-6)}`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copied',
        description: 'Transaction ID copied to clipboard'
      })
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleRevisionSubmit = async (revisionData: {
    originalContributionId: string
    amount: number
    message?: string
    paymentMethod: string
    anonymous: boolean
    explanation: string
    proofFile?: File
  }) => {
    try {
      let proofFileUrl = undefined
      if (revisionData.proofFile) {
        const safeName = revisionData.proofFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `payment-proofs/revision-${Date.now()}-${safeName}`
        
        const formData = new FormData()
        formData.append('file', revisionData.proofFile)
        formData.append('fileName', fileName)
        formData.append('bucket', 'contributions')

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || 'Failed to upload proof file')
        }

        const uploadData = await uploadResponse.json()
        proofFileUrl = uploadData.url
      }

      const revisionPayload = {
        amount: revisionData.amount,
        message: revisionData.message,
        paymentMethod: revisionData.paymentMethod,
        anonymous: revisionData.anonymous,
        explanation: revisionData.explanation,
        proofFileUrl
      }
      
      const response = await fetch(`/api/contributions/${revisionData.originalContributionId}/revise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(revisionPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit revision')
      }

      toast({
        title: 'Revision Submitted',
        description: 'Your contribution revision has been submitted for review.',
        type: 'success'
      })

      // Refresh the contribution data
      await fetchContribution()
      setShowRevisionModal(false)
    } catch (error) {
      console.error('Error submitting revision:', error)
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit revision. Please try again.',
        type: 'error'
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="w-full px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-white/50 rounded-2xl w-1/3"></div>
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              <div className="xl:col-span-3 space-y-8">
                <div className="h-64 bg-white/50 rounded-2xl"></div>
                <div className="h-48 bg-white/50 rounded-2xl"></div>
              </div>
              <div className="xl:col-span-1 space-y-6">
                <div className="h-32 bg-white/50 rounded-2xl"></div>
                <div className="h-40 bg-white/50 rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="w-full px-4 py-8">
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
            <CardContent className="p-8">
              <div className="text-center">
                <AlertCircle className="h-20 w-20 text-red-500 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Error</h3>
                <p className="text-gray-600 mb-6 text-lg">{error}</p>
                <Button onClick={() => router.back()} variant="outline" size="lg" className="hover:bg-gray-50 transition-colors">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!contribution) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="w-full px-4 py-8">
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
            <CardContent className="p-8">
              <div className="text-center">
                <AlertCircle className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Contribution Not Found</h3>
                <p className="text-gray-600 mb-6 text-lg">The contribution you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
                <Button onClick={() => router.back()} variant="outline" size="lg" className="hover:bg-gray-50 transition-colors">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => router.back()} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Contribution Details</h1>
              <div className="flex items-center gap-4">
                <p className="text-gray-600">Transaction ID: {truncateId(contribution.id)}</p>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  {contribution.status.charAt(0).toUpperCase() + contribution.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Details */}
          <div className="xl:col-span-3 space-y-8">
            {/* Contribution Overview */}
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Contribution Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Amount</label>
                    <p className="text-2xl font-bold text-green-600">{formatAmount(contribution.amount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(contribution.status)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Case</label>
                    <p className="text-lg font-semibold text-gray-900">{contribution.caseTitle}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date</label>
                    <p className="text-gray-900">{formatDate(contribution.createdAt)}</p>
                  </div>
                </div>


                {contribution.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Notes</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-md mt-1">{contribution.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Donor Information */}
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Donor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="text-gray-900">{contribution.anonymous ? 'Anonymous' : contribution.donorName}</p>
                  </div>
                  {!contribution.anonymous && contribution.donorEmail && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-gray-900">{contribution.donorEmail}</p>
                    </div>
                  )}
                  {!contribution.anonymous && contribution.donorPhone && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <p className="text-gray-900">{contribution.donorPhone}</p>
                    </div>
                  )}
                </div>
                {contribution.anonymous && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800">This contribution was made anonymously</p>
                  </div>
                )}
              </CardContent>
            </Card>


            {/* Previous Rejection Information */}
            {contribution.original_contribution && contribution.is_revision && (
              <Card className="bg-red-50/95 backdrop-blur-sm border-red-200 shadow-xl rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Original Rejected Contribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-red-700">Original Transaction ID</label>
                      <p className="text-sm font-mono text-red-800 bg-red-100 p-2 rounded">
                        {truncateId(contribution.original_contribution.id)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-red-700">Original Amount</label>
                      <p className="text-lg font-bold text-red-600">{contribution.original_contribution.amount} EGP</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-red-700">Original Date</label>
                      <p className="text-red-800">{formatDate(contribution.original_contribution.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-red-700">Original Status</label>
                      <div className="mt-1">
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejected
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {contribution.original_contribution.rejection_reason && (
                    <div className="bg-red-100 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-800">Rejection Reason</span>
                      </div>
                      <p className="text-red-700 text-sm">{contribution.original_contribution.rejection_reason}</p>
                    </div>
                  )}

                  {contribution.original_contribution.admin_comment && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Admin Comment</span>
                      </div>
                      <p className="text-blue-700 text-sm">{contribution.original_contribution.admin_comment}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Approval History */}
            {contribution.approval_status && contribution.approval_status.length > 0 && (
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                  Approval History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {contribution.approval_status.map((status) => (
                      <div key={status.id} className="border-l-4 border-gray-200 pl-4 py-3 bg-gray-50 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(status.status)}
                          <span className="text-xs text-gray-500">
                            {formatDate(status.created_at)}
                          </span>
                          {status.resubmission_count > 0 && (
                            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                              Resubmission #{status.resubmission_count}
                            </Badge>
                          )}
                        </div>
                        
                        {status.admin_comment && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-800">Admin Comment</span>
                            </div>
                            <p className="text-blue-700 text-sm">{status.admin_comment}</p>
                          </div>
                        )}
                        
                        {status.rejection_reason && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="font-medium text-red-800">Rejection Reason</span>
                            </div>
                            <p className="text-red-700 text-sm">{status.rejection_reason}</p>
                          </div>
                        )}
                        
                        {status.donor_reply && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-800">Donor Reply</span>
                              {status.donor_reply_date && (
                                <span className="text-xs text-green-600">
                                  ({formatDate(status.donor_reply_date)})
                                </span>
                              )}
                            </div>
                            <p className="text-green-700 text-sm">{status.donor_reply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Transaction ID */}
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Transaction ID</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-gray-100 p-2 rounded font-mono">
                    {truncateId(contribution.id)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(contribution.id)}
                    className="flex items-center gap-1"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/${locale}/cases/${contribution.caseId}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Case
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/${locale}/contributions`)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  All Contributions
                </Button>
                {contribution.status === 'rejected' && (
                  <Button
                    variant="outline"
                    className="w-full justify-start text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={() => setShowRevisionModal(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Revise Contribution
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <CardHeader>
              <CardTitle className="text-lg">
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600"><strong>Payment Method</strong></label>
                  <p className="text-gray-900">{contribution.payment_method || 'Not specified'}</p>
                </div>
                {contribution.proofUrl && (
                  <div>
                    <label className="text-sm font-medium text-gray-600"><strong>Payment Proof</strong></label>
                    <div className="mt-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 w-full"
                          >
                            <Eye className="h-4 w-4" />
                            View Proof
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle>Payment Proof</DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 overflow-auto">
                            {contribution.proofUrl && (
                              <div className="w-full h-full">
                                {contribution.proofUrl.toLowerCase().includes('.pdf') ? (
                                  <iframe
                                    src={contribution.proofUrl}
                                    className="w-full h-[70vh] border-0"
                                    title="Payment Proof"
                                  />
                                ) : (
                                  <Image
                                    src={contribution.proofUrl}
                                    alt="Payment Proof"
                                    width={800}
                                    height={600}
                                    className="w-full h-auto max-h-[70vh] object-contain"
                                    unoptimized
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Revision Modal */}
        {contribution && showRevisionModal && (
          <ContributionRevisionModal
            originalContribution={contribution}
            isOpen={showRevisionModal}
            onClose={() => setShowRevisionModal(false)}
            onRevisionSubmit={handleRevisionSubmit}
          />
        )}
      </div>
    </div>
  )
}
