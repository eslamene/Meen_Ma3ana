'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  XCircle, 
  FileText,
  RefreshCw,
  Send,
  X,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

import { defaultLogger as logger } from '@/lib/logger'

interface PaymentMethod {
  id: string
  code: string
  name: string
  description?: string
  sort_order: number
}

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
  payment_method?: string
  status: 'pending' | 'approved' | 'rejected'
  anonymous: boolean
  createdAt: string
  caseTitle: string
  donorName: string
  approval_status?: ApprovalStatus[]
}

interface ContributionRevisionModalProps {
  originalContribution: Contribution | null
  isOpen: boolean
  onClose: () => void
  onRevisionSubmit?: (revisionData: {
    originalContributionId: string
    amount: number
    message?: string
    paymentMethod: string
    anonymous: boolean
    explanation: string
    proofFile?: File
  }) => Promise<void>
}

export default function ContributionRevisionModal({ 
  originalContribution, 
  isOpen, 
  onClose,
  onRevisionSubmit,
}: ContributionRevisionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Form state
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true)

  // Fetch payment methods on component mount
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await fetch('/api/payment-methods')
        if (response.ok) {
          const data = await response.json()
          setPaymentMethods(data.paymentMethods || [])
        } else {
          logger.error('Failed to fetch payment methods')
        }
      } catch (error) {
        logger.error('Error fetching payment methods:', { error: error })
      } finally {
        setLoadingPaymentMethods(false)
      }
    }

    fetchPaymentMethods()
  }, [])

  // Initialize form with original contribution data
  useEffect(() => {
    if (originalContribution) {
      setAmount(originalContribution.amount.toString())
      setMessage(originalContribution.message || '')
      setPaymentMethod(originalContribution.payment_method || '')
      setAnonymous(originalContribution.anonymous)
      setExplanation('')
      setProofFile(null)
      setProofPreview(null)
    }
  }, [originalContribution])

  if (!originalContribution) return null

  const approvalStatus = Array.isArray(originalContribution.approval_status) && originalContribution.approval_status.length > 0 
    ? originalContribution.approval_status[0] 
    : null

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setProofFile(file)
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setProofPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setProofPreview(null)
      }
    }
  }

  const handleSubmit = async () => {
    if (!amount || !paymentMethod || !explanation.trim()) {
      toast.error('Error', {
        description: 'Please fill in all required fields including amount, payment method, and explanation.',
      })
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Error', {
        description: 'Please enter a valid amount greater than 0.',
      })
      return
    }

    if (!onRevisionSubmit) return

    try {
      setIsSubmitting(true)
      await onRevisionSubmit({
        originalContributionId: originalContribution.id,
        amount: amountNum,
        message: message.trim() || undefined,
        paymentMethod,
        anonymous,
        explanation: explanation.trim(),
        proofFile: proofFile || undefined
      })
      
      toast.success('Success', {
        description: 'Your contribution revision has been submitted for review.',
      })
      
      onClose()
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to submit revision. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUploadProof = async () => {
    if (!proofFile) return

    try {
      setUploading(true)
      
      // Create a safe filename
      const safeName = proofFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `payment-proofs/revision-${Date.now()}-${safeName}`
      
      const formData = new FormData()
      formData.append('file', proofFile)
      formData.append('fileName', fileName)
      formData.append('bucket', 'contributions')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload proof')
      }

      const _data = await response.json()
      toast.success('Success', { description: 'Payment proof uploaded successfully.' })
    } catch (error) {
      logger.error('Error uploading payment proof:', { error: error })
      toast.error('Error', { description: 'Failed to upload payment proof. Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100">
              <RefreshCw className="h-5 w-5 text-orange-600" />
            </div>
            Revise Contribution
            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
              Revision #{approvalStatus?.resubmission_count ? approvalStatus.resubmission_count + 1 : 1}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Original Contribution Summary */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <FileText className="h-4 w-4" />
                Original Contribution (Rejected)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <Label className="text-orange-700 font-medium">Original Amount</Label>
                  <p className="text-orange-800 font-semibold">{formatAmount(originalContribution.amount)}</p>
                </div>
                <div>
                  <Label className="text-orange-700 font-medium">Date</Label>
                  <p className="text-orange-800">{formatDate(originalContribution.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-orange-700 font-medium">Transaction ID</Label>
                  <p className="font-mono text-xs text-orange-800">{originalContribution.id}</p>
                </div>
              </div>
              
              {approvalStatus?.rejection_reason && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Rejection Reason:</strong> {getRejectionReasonLabel(approvalStatus.rejection_reason)}
                    {approvalStatus.admin_comment && (
                      <div className="mt-1">
                        <strong>Admin Comment:</strong> {approvalStatus.admin_comment}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Revision Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Updated Contribution Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount */}
              <div>
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount (EGP) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-1"
                />
              </div>

              {/* Payment Method */}
              <div>
                <Label htmlFor="payment-method" className="text-sm font-medium">
                  Payment Method *
                </Label>
                {loadingPaymentMethods ? (
                  <div className="mt-1 h-10 bg-gray-100 rounded animate-pulse"></div>
                ) : (
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.code}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Message */}
              <div>
                <Label htmlFor="message" className="text-sm font-medium">
                  Message (Optional)
                </Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message to your contribution..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Anonymous Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={anonymous}
                  onCheckedChange={(checked) => setAnonymous(checked as boolean)}
                />
                <Label htmlFor="anonymous" className="text-sm font-medium">
                  Make this contribution anonymous
                </Label>
              </div>

              {/* Payment Proof Upload */}
              <div>
                <Label className="text-sm font-medium">
                  Payment Proof *
                </Label>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    {proofFile && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUploadProof}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {proofPreview && (
                    <div className="mt-2">
                      <Label className="text-sm font-medium text-gray-600">Preview:</Label>
                      <Image 
                        src={proofPreview} 
                        alt="Payment proof preview" 
                        width={400}
                        height={300}
                        className="mt-1 max-w-xs rounded border"
                        unoptimized
                      />
                    </div>
                  )}
                  
                  {proofFile && !proofPreview && (
                    <div className="mt-2 p-2 bg-gray-50 rounded border">
                      <p className="text-sm text-gray-600">
                        File: {proofFile.name} ({(proofFile.size / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <Label htmlFor="explanation" className="text-sm font-medium">
                  Explanation of Changes *
                </Label>
                <Textarea
                  id="explanation"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Please explain what changes you've made to address the rejection reason..."
                  rows={4}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Explain what you&apos;ve corrected or changed from the original contribution.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !amount || !paymentMethod || !explanation.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Revision
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 