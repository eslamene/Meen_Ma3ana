'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { XCircle, AlertTriangle, Send } from 'lucide-react'

interface ContributionRejectionModalProps {
  isOpen: boolean
  onClose: () => void
  contributionId: string
  onReject: (rejectionData: {
    rejection_reason: string
    admin_comment: string
  }) => Promise<void>
}

const REJECTION_REASONS = [
  { value: 'payment_proof_invalid', label: 'Invalid Payment Proof - Please provide a clear, readable proof of payment' },
  { value: 'payment_not_received', label: 'Payment Not Received - We could not verify the payment was made' },
  { value: 'insufficient_funds', label: 'Insufficient Funds - The payment amount is less than the contribution amount' },
  { value: 'duplicate_payment', label: 'Duplicate Payment - This appears to be a duplicate contribution' },
  { value: 'wrong_payment_method', label: 'Wrong Payment Method - Please use the specified payment method' },
  { value: 'payment_expired', label: 'Payment Expired - The payment proof shows an expired transaction' },
  { value: 'wrong_amount', label: 'Wrong Amount - The payment amount does not match the contribution amount' },
  { value: 'suspicious_activity', label: 'Suspicious Activity - Payment requires additional verification' },
  { value: 'other', label: 'Other - Please specify the reason in the admin comment' }
]

export default function ContributionRejectionModal({
  isOpen,
  onClose,
  contributionId,
  onReject
}: ContributionRejectionModalProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminComment, setAdminComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!rejectionReason) {
      setError('Please select a rejection reason')
      return
    }

    if (!adminComment.trim()) {
      setError('Please provide an admin comment')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onReject({
        rejection_reason: rejectionReason,
        admin_comment: adminComment.trim()
      })
      
      // Reset form
      setRejectionReason('')
      setAdminComment('')
      onClose()
    } catch (err) {
      setError('Failed to reject contribution. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setRejectionReason('')
      setAdminComment('')
      setError('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Reject Contribution
          </DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this contribution. The donor will be notified and can resubmit with corrected information. Be specific about what needs to be fixed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Select value={rejectionReason} onValueChange={setRejectionReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-comment">Admin Comment *</Label>
            <Textarea
              id="admin-comment"
              placeholder="Provide specific instructions on what the donor needs to fix (e.g., 'Please provide a clearer screenshot of the payment confirmation', 'The amount should be 500 EGP, not 50 EGP')..."
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              This comment will be visible to the donor and should provide clear instructions on what needs to be corrected for resubmission.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={isSubmitting || !rejectionReason || !adminComment.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Rejecting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Reject Contribution
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 