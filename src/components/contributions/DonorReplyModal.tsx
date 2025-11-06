'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { MessageSquare, AlertTriangle, Upload, Send } from 'lucide-react'

interface DonorReplyModalProps {
  isOpen: boolean
  onClose: () => void
  contributionId: string
  rejectionReason: string
  adminComment: string
  resubmissionCount: number
  onReply: (replyData: {
    donor_reply: string
    payment_proof_url?: string
  }) => Promise<void>
}

export default function DonorReplyModal({
  isOpen,
  onClose,
  contributionId: _contributionId, // eslint-disable-line @typescript-eslint/no-unused-vars
  rejectionReason,
  adminComment,
  resubmissionCount,
  onReply
}: DonorReplyModalProps) {
  const [donorReply, setDonorReply] = useState('')
  const [paymentProofUrl, setPaymentProofUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canResubmit = resubmissionCount < 2

  const handleSubmit = async () => {
    if (!donorReply.trim()) {
      setError('Please provide a reply')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onReply({
        donor_reply: donorReply.trim(),
        payment_proof_url: paymentProofUrl || undefined
      })
      
      // Reset form
      setDonorReply('')
      setPaymentProofUrl('')
      onClose()
    } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
      setError('Failed to submit reply. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setDonorReply('')
      setPaymentProofUrl('')
      setError('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <MessageSquare className="h-5 w-5" />
            Reply to Rejection
          </DialogTitle>
          <DialogDescription>
            {canResubmit 
              ? 'Please provide additional information or new payment proof to help us review your contribution.'
              : 'You have reached the maximum number of resubmissions. You can only acknowledge the rejection.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Show rejection details */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Rejection Details</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-600">Reason:</span>
                <p className="text-gray-800">{rejectionReason}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Admin Comment:</span>
                <p className="text-gray-800">{adminComment}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Resubmission Count:</span>
                <p className="text-gray-800">{resubmissionCount}/2</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="donor-reply">
              {canResubmit ? 'Your Reply *' : 'Acknowledgment *'}
            </Label>
            <Textarea
              id="donor-reply"
              placeholder={
                canResubmit 
                  ? "Please provide additional information, clarification, or new payment proof..."
                  : "Please acknowledge that you understand the rejection..."
              }
              value={donorReply}
              onChange={(e) => setDonorReply(e.target.value)}
              rows={4}
              className="resize-none"
            />
            {canResubmit && (
              <p className="text-xs text-gray-500">
                Provide any additional information that might help us reconsider your contribution.
              </p>
            )}
          </div>

          {canResubmit && (
            <div className="space-y-2">
              <Label htmlFor="payment-proof">New Payment Proof URL (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="payment-proof"
                  type="url"
                  placeholder="https://example.com/payment-proof.jpg"
                  value={paymentProofUrl}
                  onChange={(e) => setPaymentProofUrl(e.target.value)}
                />
                <Button variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                If you have new payment proof, provide the URL here.
              </p>
            </div>
          )}

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
              onClick={handleSubmit}
              disabled={isSubmitting || !donorReply.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {canResubmit ? 'Submit Reply' : 'Acknowledge'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 