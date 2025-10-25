'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Download, 
  MessageSquare, 
  DollarSign, 
  Calendar, 
  User, 
  FileText,
  RefreshCw,
  Send,
  X,
  Info
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ApprovalStatus {
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
}

interface Contribution {
  id: string
  caseId: string
  amount: number
  message?: string
  proofUrl?: string
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
  approval_status?: ApprovalStatus[]
}

interface ContributionDetailsModalProps {
  contribution: Contribution | null
  isOpen: boolean
  onClose: () => void
  onRevisionRequest?: (contribution: Contribution) => void
  originalContribution?: Contribution | null
}

export default function ContributionDetailsModal({ 
  contribution, 
  isOpen, 
  onClose,
  onRevisionRequest,
  originalContribution
}: ContributionDetailsModalProps) {
  const { addToast } = useToast()

  if (!contribution) return null

  const approvalStatus = Array.isArray(contribution.approval_status) && contribution.approval_status.length > 0 
    ? contribution.approval_status[0] 
    : null

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date available'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            {status}
          </Badge>
        )
    }
  }

  const handleViewProof = (proofUrl: string) => {
    window.open(proofUrl, '_blank')
  }

  const handleDownloadReceipt = () => {
    const receiptContent = `
Receipt Number: ${contribution.id}
Date: ${formatDate(contribution.createdAt)}
Case: ${contribution.caseTitle}
Amount: ${formatAmount(contribution.amount)}
Status: ${contribution.status}
${contribution.message ? `Message: ${contribution.message}` : ''}
${contribution.anonymous ? 'Anonymous Contribution' : `Donor: ${contribution.donorName}`}
${approvalStatus?.admin_comment ? `Admin Comment: ${approvalStatus.admin_comment}` : ''}
    `.trim()

    const blob = new Blob([receiptContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${contribution.id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRevisionRequest = () => {
    if (onRevisionRequest && contribution) {
      onRevisionRequest(contribution)
    }
  }

  const getRejectionReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      'payment_proof_invalid': 'Invalid Payment Proof',
      'payment_not_received': 'Payment Not Received',
      'insufficient_funds': 'Insufficient Funds',
      'duplicate_payment': 'Duplicate Payment',
      'wrong_payment_method': 'Wrong Payment Method',
      'payment_expired': 'Payment Expired',
      'wrong_amount': 'Wrong Amount',
      'suspicious_activity': 'Suspicious Activity',
      'other': 'Other'
    }
    return reasons[reason] || reason
  }

  const formatAdminComment = (comment: string) => {
    // Check if this is a revision comment
    const revisionMatch = comment.match(/Revision of contribution ([a-f0-9-]+)\. Original rejection reason: (.+)/)
    if (revisionMatch) {
      const originalId = revisionMatch[1]
      const rejectionReason = revisionMatch[2]
      const shortId = originalId.slice(0, 8) + '...' + originalId.slice(-8)
      
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-800 font-medium">This is a revision of a previously rejected contribution</p>
              <p className="text-blue-700 text-sm">Original contribution ID: {shortId}</p>
              <p className="text-blue-700 text-sm">Original rejection reason: {getRejectionReasonLabel(rejectionReason)}</p>
            </div>
          </div>
        </div>
      )
    }
    
    // Check if this is a simple admin comment (not technical data)
    if (comment.length < 100 && !comment.includes('contribution') && !comment.includes('rejection')) {
      return <p className="text-blue-800">{comment}</p>
    }
    
    // For longer or technical comments, format them more nicely
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-800 font-medium">Administrative Note</p>
            <p className="text-blue-700 text-sm">{comment}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              Contribution Details
              {getStatusBadge(contribution.status)}
            </DialogTitle>
            {approvalStatus?.status === 'rejected' && (
              <Button
                onClick={handleRevisionRequest}
                className="bg-orange-600 hover:bg-orange-700 rounded-full px-4 py-2 h-9 shadow-sm text-white"
                aria-label="Resubmit contribution"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Resubmit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Transaction ID</Label>
                  <p className="font-mono text-sm bg-gray-50 p-2 rounded mt-1">{contribution.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Amount</Label>
                  <p className="text-lg font-semibold text-green-600 mt-1">{formatAmount(contribution.amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Case</Label>
                  <p className="font-medium text-gray-900 mt-1">{contribution.caseTitle}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Date</Label>
                  <p className="text-gray-700 mt-1">{formatDate(contribution.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Donor</Label>
                  <p className="text-gray-700 mt-1">
                    {contribution.anonymous ? 'Anonymous' : contribution.donorName}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Resubmission Count</Label>
                  <p className="text-gray-700 mt-1">
                    {approvalStatus?.resubmission_count || 0} times
                  </p>
                </div>
              </div>

              {contribution.message && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Message</Label>
                  <div className="bg-gray-50 rounded-lg p-3 mt-1">
                    <p className="text-gray-700 italic">&ldquo;{contribution.message}&rdquo;</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Donor Information */}
          {!contribution.anonymous && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Donor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contribution.donorId && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Donor ID</Label>
                      <p className="font-mono text-sm bg-gray-50 p-2 rounded mt-1">{contribution.donorId}</p>
                    </div>
                  )}
                  {contribution.donorEmail && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Email</Label>
                      <p className="text-gray-700 mt-1">{contribution.donorEmail}</p>
                    </div>
                  )}
                  {contribution.donorPhone && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Phone</Label>
                      <p className="text-gray-700 mt-1">{contribution.donorPhone}</p>
                    </div>
                  )}
                  {contribution.donorFirstName && contribution.donorLastName && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                      <p className="text-gray-700 mt-1">{contribution.donorFirstName} {contribution.donorLastName}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Original Contribution (for revisions) */}
          {originalContribution && (
            <Card className="border-l-4 border-red-400 bg-red-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <XCircle className="h-4 w-4" />
                  Original Rejected Contribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Original Transaction ID</Label>
                    <p className="font-mono text-sm bg-red-100 p-2 rounded mt-1 text-red-800">{originalContribution.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Original Amount</Label>
                    <p className="text-lg font-semibold text-red-600 mt-1">{formatAmount(originalContribution.amount)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Original Date</Label>
                    <p className="text-gray-700 mt-1">{formatDate(originalContribution.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Original Status</Label>
                    <div className="mt-1">
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                      </Badge>
                    </div>
                  </div>
                </div>

                {originalContribution.approval_status?.[0]?.rejection_reason && (
                  <Alert className="border-red-200 bg-red-100">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <div className="space-y-2">
                        <div>
                          <strong>Rejection Reason:</strong> {getRejectionReasonLabel(originalContribution.approval_status[0].rejection_reason)}
                        </div>
                        {originalContribution.approval_status[0].admin_comment && (
                          <div>
                            <strong>Admin Comment:</strong> {originalContribution.approval_status[0].admin_comment}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {originalContribution.message && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Original Message</Label>
                    <div className="bg-red-100 rounded-lg p-3 mt-1">
                      <p className="text-red-800 italic">&ldquo;{originalContribution.message}&rdquo;</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Approval Status */}
          {approvalStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(approvalStatus.status)}
                  Approval Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <div className="mt-1">{getStatusBadge(approvalStatus.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Last Updated</Label>
                    <p className="text-gray-700 mt-1">{formatDate(approvalStatus.updated_at)}</p>
                  </div>
                </div>

                {/* Rejection Details */}
                {approvalStatus.status === 'rejected' && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <div className="space-y-2">
                        {approvalStatus.rejection_reason || approvalStatus.admin_comment ? (
                          <>
                            {approvalStatus.rejection_reason && (
                              <div>
                                <strong>Reason:</strong> {getRejectionReasonLabel(approvalStatus.rejection_reason)}
                              </div>
                            )}
                            {approvalStatus.admin_comment && (
                              <div>
                                <strong>Admin Comment:</strong>
                                <div className="mt-1">
                                  {formatAdminComment(approvalStatus.admin_comment)}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div>
                            <p className="font-medium">This contribution was rejected.</p>
                            <p className="text-sm opacity-90">No specific reason was provided by the administrator.</p>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Admin Comment for other statuses */}
                {approvalStatus.admin_comment && approvalStatus.status !== 'rejected' && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Admin Comment</Label>
                    <div className="bg-blue-50 rounded-lg p-3 mt-1">
                      {formatAdminComment(approvalStatus.admin_comment)}
                    </div>
                  </div>
                )}

                {/* Donor Reply */}
                {approvalStatus.donor_reply && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Your Reply</Label>
                    <div className="bg-gray-50 rounded-lg p-3 mt-1">
                      <p className="text-gray-700">{approvalStatus.donor_reply}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Sent on {formatDate(approvalStatus.created_at || '')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Proof */}
          {contribution.proofUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Payment Proof
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleViewProof(contribution.proofUrl!)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Proof
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadReceipt}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Receipt
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revision Request */}
          {approvalStatus?.status === 'rejected' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Revise Contribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Context */}
                <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium">Your previous submission was rejected.</p>
                      {approvalStatus.rejection_reason && (
                        <p className="mt-1">
                          <span className="font-medium">Reason:</span> {getRejectionReasonLabel(approvalStatus.rejection_reason)}
                        </p>
                      )}
                      {approvalStatus.admin_comment && (
                        <p className="mt-1">
                          <span className="font-medium">Admin Note:</span> {approvalStatus.admin_comment}
                        </p>
                      )}
                      {originalContribution && (
                        <p className="mt-1">
                          <span className="font-medium">Linked to original:</span> {originalContribution.id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* What you'll need */}
                <div className="mb-4">
                  <p className="text-gray-700 font-medium mb-2">What you'll need</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Correct amount and payment method</li>
                    <li>Updated proof of payment (image or PDF)</li>
                    <li>A short explanation of the changes</li>
                  </ul>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleRevisionRequest}
                    className="bg-orange-600 hover:bg-orange-700 rounded-full px-5 h-11 text-white shadow-sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Revise Contribution
                  </Button>
                  <span className="text-xs text-gray-500">This will create a new submission linked to the original.</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 