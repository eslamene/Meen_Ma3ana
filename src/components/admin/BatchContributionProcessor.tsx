'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { contributionNotificationService } from '@/lib/notifications/contribution-notifications'

interface Contribution {
  id: string
  amount: number
  type: string
  status: string
  payment_method: string
  proof_of_payment: string
  notes: string
  donor_id: string
  case_id: string
  created_at: string
  donor: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  case: {
    id: string
    title: string
    beneficiary_name: string
  }
}

interface BatchContributionProcessorProps {
  contributions: Contribution[]
  onRefresh: () => void
}

export default function BatchContributionProcessor({ contributions, onRefresh }: BatchContributionProcessorProps) {
  const t = useTranslations('admin.contributions')
  const [selectedContributions, setSelectedContributions] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | ''>('')
  const [rejectionReason, setRejectionReason] = useState('')

  const supabase = createClient()

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContributions(contributions.map(c => c.id))
    } else {
      setSelectedContributions([])
    }
  }

  const handleSelectContribution = (contributionId: string, checked: boolean) => {
    if (checked) {
      setSelectedContributions(prev => [...prev, contributionId])
    } else {
      setSelectedContributions(prev => prev.filter(id => id !== contributionId))
    }
  }

  const handleBulkAction = async () => {
    if (selectedContributions.length === 0) {
      alert('Please select at least one contribution')
      return
    }

    if (bulkAction === 'reject' && !rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      setProcessing(true)

      if (bulkAction === 'approve') {
        // Approve all selected contributions
        for (const contributionId of selectedContributions) {
          const contribution = contributions.find(c => c.id === contributionId)
          
          // Update contribution status
          const { error } = await supabase
            .from('contributions')
            .update({ 
              status: 'approved',
              updated_at: new Date().toISOString()
            })
            .eq('id', contributionId)

          if (error) {
            console.error('Error approving contribution:', error)
            continue
          }

          // Update case current amount
          if (contribution) {
            const { error: caseError } = await supabase
              .from('cases')
              .update({ 
                current_amount: contribution.amount,
                updated_at: new Date().toISOString()
              })
              .eq('id', contribution.case_id)

            if (caseError) {
              console.error('Error updating case amount:', caseError)
            }
          }

          // Send notification
          await contributionNotificationService.sendApprovalNotification(
            contributionId,
            contribution.donor_id,
            contribution.amount,
            contribution.case?.title || 'Unknown Case'
          )
        }
      } else if (bulkAction === 'reject') {
        // Reject all selected contributions
        for (const contributionId of selectedContributions) {
          const { error } = await supabase
            .from('contributions')
            .update({ 
              status: 'rejected',
              notes: rejectionReason,
              updated_at: new Date().toISOString()
            })
            .eq('id', contributionId)

          if (error) {
            console.error('Error rejecting contribution:', error)
            continue
          }

          // Send notification
          const contribution = contributions.find(c => c.id === contributionId)
          if (contribution) {
            await contributionNotificationService.sendRejectionNotification(
              contributionId,
              contribution.donor_id,
              contribution.amount,
              contribution.case?.title || 'Unknown Case',
              rejectionReason
            )
          }
        }
      }

      // Reset state
      setSelectedContributions([])
      setBulkAction('')
      setRejectionReason('')
      
      // Refresh the list
      onRefresh()
    } catch (error) {
      console.error('Error processing bulk action:', error)
    } finally {
      setProcessing(false)
    }
  }



  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (contributions.length === 0) {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('batchProcessing')}</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedContributions.length === contributions.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">{t('selectAll')}</span>
            </div>
            <Badge variant="secondary">
              {selectedContributions.length} {t('selected')}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedContributions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value as 'approve' | 'reject' | '')}
                className="border rounded-md px-3 py-2"
              >
                <option value="">{t('selectAction')}</option>
                <option value="approve">{t('approveSelected')}</option>
                <option value="reject">{t('rejectSelected')}</option>
              </select>

              {bulkAction === 'reject' && (
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t('rejectionReasonPlaceholder')}
                  className="flex-1 border rounded-md px-3 py-2"
                />
              )}

              <Button
                onClick={handleBulkAction}
                disabled={processing || !bulkAction || (bulkAction === 'reject' && !rejectionReason.trim())}
                className={bulkAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {processing ? t('processing') : t('applyBulkAction')}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2 mt-4">
          {contributions.map((contribution) => (
            <div key={contribution.id} className="flex items-center gap-4 p-3 border rounded-lg">
              <Checkbox
                checked={selectedContributions.includes(contribution.id)}
                onCheckedChange={(checked) => handleSelectContribution(contribution.id, checked as boolean)}
              />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {formatAmount(contribution.amount)} - {contribution.case?.title}
                    </p>
                    <p className="text-sm text-gray-600">
                      {contribution.donor?.first_name} {contribution.donor?.last_name} ({contribution.donor?.email})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{formatDate(contribution.created_at)}</p>
                    <p className="text-sm">{contribution.payment_method}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 