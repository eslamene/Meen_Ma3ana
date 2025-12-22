'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  ExternalLink,
  Copy,
  RefreshCw,
  Info
} from 'lucide-react'
import { toast } from 'sonner'

import { defaultLogger as logger } from '@/lib/logger'

interface Contribution {
  id: string
  caseId: string
  amount: number
  proofUrl?: string
  payment_method?: string
  payment_method_id?: string
  payment_method_name?: string
  payment_method_name_ar?: string
  status: 'pending' | 'approved' | 'rejected' | 'revised' | 'acknowledged'
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
  message?: string
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
}

interface ContributionDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  contribution: Contribution | null
  isAdmin?: boolean
  onStatusUpdate?: (contributionId: string, status: 'approved' | 'rejected', rejectionReason?: string) => void
}

export default function ContributionDetailsModal({
  isOpen,
  onClose,
  contribution,
  isAdmin = false,
  onStatusUpdate
}: ContributionDetailsModalProps) {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const [isExpanded, setIsExpanded] = useState(false)

  if (!contribution) return null

  const formatAmount = (amount: number) => `EGP ${amount.toLocaleString()}`
  
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} days ago`
    return date.toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
      pending: { color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200', icon: <Clock className="w-4 h-4 text-yellow-500" /> },
      rejected: { color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200', icon: <XCircle className="w-4 h-4 text-red-500" /> },
      revised: { color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200', icon: <RefreshCw className="w-4 h-4 text-blue-500" /> },
      acknowledged: { color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-200', icon: <CheckCircle className="w-4 h-4 text-gray-500" /> }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <Badge className={`flex items-center gap-1.5 ${config.bg} ${config.color} border-0`}>
        {config.icon}
        <span className="font-medium">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </Badge>
    )
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied!', { description: 'Transaction ID copied to clipboard' })
    } catch (err: any) {
      logger.error('Failed to copy: ', { error: err })
      toast.error('Error', { description: 'Failed to copy to clipboard' })
    }
  }

  const handleExpand = () => {
    router.push(`/${params.locale}/contributions/${contribution.id}`)
  }

  const handleViewProof = () => {
    if (contribution.proofUrl) {
      window.open(contribution.proofUrl, '_blank')
    }
  }

  const handleStatusUpdate = (status: 'approved' | 'rejected') => {
    if (onStatusUpdate) {
      onStatusUpdate(contribution.id, status)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Info className="h-5 w-5 text-blue-500" />
              Contribution Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExpand}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Page
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main Contribution Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{contribution.caseTitle}</h3>
                  {getStatusBadge(contribution.status)}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {formatAmount(contribution.amount)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {getTimeAgo(contribution.createdAt)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Transaction ID */}
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Transaction ID:</Label>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {contribution.id}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(contribution.id)}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              {/* Donor Information */}
              {!contribution.anonymous && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Donor Name:</Label>
                    <p className="text-sm text-gray-600">{contribution.donorName}</p>
                  </div>
                  {contribution.donorEmail && (
                    <div>
                      <Label className="text-sm font-medium">Email:</Label>
                      <p className="text-sm text-gray-600">{contribution.donorEmail}</p>
                    </div>
                  )}
                  {contribution.donorPhone && (
                    <div>
                      <Label className="text-sm font-medium">Phone:</Label>
                      <p className="text-sm text-gray-600">{contribution.donorPhone}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method */}
              {contribution.payment_method && (
                <div>
                  <Label className="text-sm font-medium">Payment Method:</Label>
                  <p className="text-sm text-gray-600">
                    {locale === 'ar' 
                      ? (contribution.payment_method_name_ar || contribution.payment_method)
                      : (contribution.payment_method_name || contribution.payment_method)
                    }
                  </p>
                </div>
              )}

              {/* Message */}
              {contribution.message && (
                <div>
                  <Label className="text-sm font-medium">Message:</Label>
                  <p className="text-sm text-gray-600 italic">&quot;{contribution.message}&quot;</p>
                </div>
              )}

              {/* Notes */}
              {contribution.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes:</Label>
                  <p className="text-sm text-gray-600">{contribution.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Proof */}
          {contribution.proofUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Payment Proof
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={handleViewProof}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Proof
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(contribution.proofUrl!, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval History */}
          {contribution.approval_status && contribution.approval_status.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Approval History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contribution.approval_status.map((status, index) => (
                    <div key={status.id} className="border-l-4 border-gray-200 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(status.status)}
                        <span className="text-sm text-gray-500">
                          {getTimeAgo(status.created_at)}
                        </span>
                      </div>
                      {status.rejection_reason && (
                        <Alert className="mb-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Rejection Reason:</strong> {status.rejection_reason}
                          </AlertDescription>
                        </Alert>
                      )}
                      {status.admin_comment && (
                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Admin Comment:</strong> {status.admin_comment}
                        </div>
                      )}
                      {status.donor_reply && (
                        <div className="text-sm text-blue-600 mb-2">
                          <strong>Donor Reply:</strong> {status.donor_reply}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Actions */}
          {isAdmin && contribution.status === 'pending' && onStatusUpdate && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleStatusUpdate('approved')}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate('rejected')}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
