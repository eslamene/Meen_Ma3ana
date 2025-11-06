'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { AlertTriangle, X } from 'lucide-react'

interface ContributionRejectionModalProps {
  isOpen: boolean
  onClose: () => void
  onReject: (reason: string, customReason?: string) => void
  contributionTitle: string
  loading?: boolean
}

const PREDEFINED_REASONS = [
  {
    id: 'insufficient_proof',
    label: 'Insufficient proof of payment',
    description: 'The provided proof of payment is unclear or incomplete'
  },
  {
    id: 'invalid_amount',
    label: 'Invalid contribution amount',
    description: 'The contribution amount does not match the case requirements'
  },
  {
    id: 'duplicate_contribution',
    label: 'Duplicate contribution',
    description: 'This appears to be a duplicate of an existing contribution'
  },
  {
    id: 'suspicious_activity',
    label: 'Suspicious activity detected',
    description: 'The contribution shows signs of suspicious or fraudulent activity'
  },
  {
    id: 'case_closed',
    label: 'Case no longer accepting contributions',
    description: 'The case has been closed or is no longer accepting new contributions'
  },
  {
    id: 'payment_method_issue',
    label: 'Payment method not supported',
    description: 'The payment method used is not supported or valid'
  },
  {
    id: 'other',
    label: 'Other reason',
    description: 'Please specify the reason below'
  }
]

export default function ContributionRejectionModal({
  isOpen,
  onClose,
  onReject,
  contributionTitle,
  loading = false
}: ContributionRejectionModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')

  const handleReject = () => {
    if (!selectedReason) return
    
    const _reason = selectedReason === 'other' ? customReason : selectedReason
    onReject(selectedReason, selectedReason === 'other' ? customReason : undefined)
  }

  const handleClose = () => {
    setSelectedReason('')
    setCustomReason('')
    onClose()
  }

  const isRejectDisabled = !selectedReason || (selectedReason === 'other' && !customReason.trim())

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Reject Contribution
          </DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting the contribution for <strong>&quot;{contributionTitle}&quot;</strong>.
            This will help the donor understand why their contribution was not accepted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Select rejection reason:
            </Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              <div className="space-y-3">
                {PREDEFINED_REASONS.map((reason) => (
                  <div key={reason.id} className="flex items-start space-x-3">
                    <RadioGroupItem value={reason.id} id={reason.id} className="mt-1" />
                    <div className="flex-1">
                      <Label 
                        htmlFor={reason.id} 
                        className="text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        {reason.label}
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        {reason.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {selectedReason === 'other' && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Please specify the reason:
              </Label>
              <Textarea
                placeholder="Enter the specific reason for rejection..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="min-h-[80px]"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {customReason.length}/500 characters
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isRejectDisabled || loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Rejecting...' : 'Reject Contribution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}