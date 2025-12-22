'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Calendar, 
  Eye, 
  Info, 
  Copy, 
  RefreshCw,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  ExternalLink,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'
import ContributionRejectionModal from '@/components/contributions/ContributionRejectionModal'
import ContributionDetailsModal from '@/components/contributions/ContributionDetailsModal'
import PaymentProofModal from '@/components/contributions/PaymentProofModal'

import { defaultLogger as logger } from '@/lib/logger'

// Utility functions
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
const truncateId = (id: string) => `${id.slice(0, 8)}...${id.slice(-8)}`

interface Contribution {
  id: string
  caseId: string
  amount: number
  proofUrl?: string
  payment_method?: string
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

interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}


interface ContributionsListProps {
  contributions: Contribution[]
  loading?: boolean
  onStatusUpdate?: (contributionId: string, status: 'approved' | 'rejected', rejectionReason?: string) => void
  highlightedTxId?: string
  isAdmin?: boolean
  pagination?: PaginationState
  error?: string | null
  onPageChange?: (page: number) => void
  onRefresh?: () => void
}

// Status configuration inspired by the provided code
const statusConfig: Record<string, { 
  color: string
  bg: string
  border: string
  icon: React.ReactElement
}> = {
  approved: {
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    border: "border-emerald-200",
    icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  },
  pending: {
    color: "text-yellow-700",
    bg: "bg-yellow-100",
    border: "border-yellow-200",
    icon: <Clock className="w-4 h-4 text-yellow-500" />,
  },
  rejected: {
    color: "text-red-700",
    bg: "bg-red-100",
    border: "border-red-200",
    icon: <XCircle className="w-4 h-4 text-red-500" />,
  },
  revised: {
    color: "text-blue-700",
    bg: "bg-blue-100",
    border: "border-blue-200",
    icon: <RefreshCw className="w-4 h-4 text-blue-500" />,
  },
  acknowledged: {
    color: "text-gray-700",
    bg: "bg-gray-100",
    border: "border-gray-200",
    icon: <CheckCircle className="w-4 h-4 text-gray-500" />,
  },
}

interface ContributionItemProps {
  contribution: Contribution
  level?: number
  isParent?: boolean
  isNested?: boolean
  onStatusUpdate?: (contributionId: string, status: 'approved' | 'rejected', rejectionReason?: string) => void
  onViewDetails: (contribution: Contribution) => void
  onViewProof: (contribution: Contribution) => void
  isAdmin?: boolean
  isHighlighted?: boolean
}

const ContributionItem = ({
  contribution,
  level = 0,
  isParent = false,
  isNested = false,
  onStatusUpdate,
  onViewDetails,
  onViewProof,
  isAdmin = false,
  isHighlighted = false,
}: ContributionItemProps) => {
  const params = useParams()
  const router = useRouter()
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [openMenuForId, setOpenMenuForId] = useState<string | null>(null)
  

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied!', {
        description: 'Transaction ID copied to clipboard'
      })
    } catch (err) {
      logger.error('Failed to copy: ', { error: err })
      toast.error('Error',  {
        description: 'Failed to copy to clipboard'
      })
    }
  }

  const handleRejectClick = () => {
    setShowRejectionModal(true)
  }

  const handleRejectionSubmit = (rejectionReason: string) => {
    if (onStatusUpdate) {
      onStatusUpdate(contribution.id, 'rejected', rejectionReason)
    }
    setShowRejectionModal(false)
  }

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending
    return (
      <Badge className={`flex items-center gap-1 sm:gap-1.5 ${config.bg} ${config.color} border-0 text-[10px] sm:text-xs`}>
        {React.isValidElement(config.icon) 
          ? React.cloneElement(config.icon as React.ReactElement<{ className?: string }>, { className: 'w-3 h-3 sm:w-4 sm:h-4' })
          : config.icon}
        <span className="font-medium">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </Badge>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: level * 0.1 }}
        className={`relative bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg ${
          isHighlighted ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 shadow-lg' : ''
        } ${
          isNested 
            ? contribution.status === 'rejected' 
              ? 'ml-8 border-l-4 border-red-400 bg-red-50/30 border-t-0' 
              : contribution.status === 'approved'
                ? 'ml-8 border-l-4 border-green-400 bg-green-50/30 border-t-0'
                : contribution.status === 'pending'
                  ? 'ml-8 border-l-4 border-yellow-400 bg-yellow-50/30 border-t-0'
                  : 'ml-8 border-l-4 border-blue-400 bg-blue-50/30 border-t-0'
            : isParent 
              ? 'border-l-4 border-red-400 bg-red-50/30'
              : contribution.status === 'approved'
                ? 'border-l-4 border-green-400 bg-green-50/30'
                : contribution.status === 'pending'
                  ? 'border-l-4 border-yellow-400 bg-yellow-50/30'
                  : contribution.status === 'rejected'
                    ? 'border-l-4 border-red-400 bg-red-50/30'
                    : ''
        }`}
      >
        <CardContent className="p-3 sm:p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            {/* Main Content - Enhanced */}
            <div className="flex-1 min-w-0 w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div
                  onClick={() => router.push(`/${params.locale}/cases/${contribution.caseId}`)}
                  className="font-semibold text-sm sm:text-base text-gray-900 truncate hover:text-blue-600 transition-colors cursor-pointer"
                >
                  {contribution.caseTitle}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {getStatusBadge(contribution.status)}
                  {isHighlighted && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-500 text-white border-blue-500 font-semibold animate-pulse px-1.5 sm:px-2 py-0.5 sm:py-1">
                      <span className="hidden sm:inline">From Notification</span>
                      <span className="sm:hidden">New</span>
                    </Badge>
                  )}
                  {contribution.anonymous && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs bg-gray-100 text-gray-700 border-gray-200 px-1.5 sm:px-2 py-0.5 sm:py-1">
                      Anonymous
                    </Badge>
                  )}
                  {isNested && (
                    <Badge variant="outline" className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 ${
                      contribution.status === 'rejected' 
                        ? 'bg-red-500 text-white border-red-500' 
                        : contribution.status === 'approved'
                          ? 'bg-green-500 text-white border-green-500'
                          : contribution.status === 'pending'
                            ? 'bg-yellow-500 text-white border-yellow-500'
                            : 'bg-blue-500 text-white border-blue-500'
                    }`}>
                      <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                      <span className="hidden sm:inline">REVISION</span>
                      <span className="sm:hidden">REV</span>
                    </Badge>
                  )}
                  {isParent && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs bg-red-500 text-white border-red-500 font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1">
                      <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                      <span className="hidden sm:inline">ORIGINAL</span>
                      <span className="sm:hidden">ORIG</span>
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">{formatAmount(contribution.amount)}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">{getTimeAgo(contribution.createdAt)}</span>
                  </div>
                  {/* Show details button */}
                  {(contribution.message || (contribution.notes && contribution.notes.startsWith('REVISION:')) || 
                    (isParent && contribution.approval_status?.[0]?.rejection_reason) || isAdmin) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsExpanded(!isExpanded)
                      }}
                      className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 text-xs"
                    >
                      {isExpanded ? (
                        <>
                          <span className="hidden sm:inline">Hide details</span>
                          <span className="sm:hidden">Hide</span>
                          <ChevronUp className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Show details</span>
                          <span className="sm:hidden">Details</span>
                          <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Content */}
              {isExpanded && (
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                  {/* Transaction ID and Donor Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1 flex-wrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0"></span>
                      <span className="text-gray-500">ID:</span>
                      <span className="font-mono text-gray-600 break-all">{truncateId(contribution.id)}</span>
                      <div
                        className="text-gray-400 hover:text-gray-600 cursor-pointer inline-flex flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(contribution.id)
                        }}
                        aria-label="Copy ID"
                      >
                        <Copy className="h-3 w-3" />
                      </div>
                    </span>
                    {isAdmin && contribution.donorEmail && (
                      <span className="flex items-center gap-1 flex-wrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                        <span className="text-gray-500">Donor:</span>
                        <span className="font-mono text-gray-600 break-all">{contribution.donorEmail}</span>
                      </span>
                    )}
                  </div>

                  {contribution.message && (
                    <div className="bg-gray-50 rounded-md p-2 mb-2">
                      <p className="text-[10px] sm:text-xs text-gray-700 italic break-words">
                        &ldquo;{contribution.message}&rdquo;
                      </p>
                    </div>
                  )}

                  {contribution.notes && contribution.notes.startsWith('REVISION:') && (
                    <div className="bg-blue-50 rounded-md p-2 mb-2">
                      <p className="text-[10px] sm:text-xs text-blue-700 break-words">
                        <Info className="h-3 w-3 inline-block mr-1 flex-shrink-0" />
                        {contribution.notes}
                      </p>
                    </div>
                  )}

                  {isParent && contribution.approval_status?.[0]?.rejection_reason && (
                    <div className="bg-red-50 rounded-md p-2 mb-2">
                      <p className="text-[10px] sm:text-xs text-red-700 break-words">
                        <XCircle className="h-3 w-3 inline-block mr-1 flex-shrink-0" />
                        Rejection Reason: {contribution.approval_status[0].rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons - Enhanced */}
            <div className="relative flex items-center gap-1 sm:gap-1.5 flex-shrink-0 self-start sm:self-auto">
              <div
                title="View details"
                onClick={() => onViewDetails(contribution)}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer inline-flex items-center justify-center transition-all duration-200 hover:shadow-sm"
              >
                <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600 hover:text-blue-600" />
              </div>
              {contribution.proofUrl && (
                <div
                  title="View proof"
                  onClick={() => onViewProof(contribution)}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 cursor-pointer inline-flex items-center justify-center transition-all duration-200 hover:shadow-sm"
                >
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600 hover:text-green-600" />
                </div>
              )}
              {isAdmin && contribution.status === 'pending' && onStatusUpdate && (
                <>
                  <div
                    title="Approve"
                    onClick={() => onStatusUpdate(contribution.id, 'approved')}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 cursor-pointer inline-flex items-center justify-center transition-all duration-200 hover:shadow-sm"
                  >
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div
                    title="Reject"
                    onClick={handleRejectClick}
                    className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer inline-flex items-center justify-center transition-all duration-200 hover:shadow-sm"
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                </>
              )}
              <div
                aria-haspopup="menu"
                aria-expanded={openMenuForId === contribution.id}
                onClick={() => setOpenMenuForId(prev => prev === contribution.id ? null : contribution.id)}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg border border-gray-200 hover:border-gray-400 cursor-pointer inline-flex items-center justify-center transition-all duration-200 hover:shadow-sm"
                title="More actions"
              >
                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
              </div>
              {openMenuForId === contribution.id && (
                <div className="absolute right-0 top-9 sm:top-10 z-[70] w-40 sm:w-44 rounded-md border border-gray-200 bg-white shadow-lg">
                  <div
                    className="w-full px-3 py-2 text-left text-xs sm:text-sm hover:bg-gray-50 cursor-pointer"
                    onClick={() => { setOpenMenuForId(null); onViewDetails(contribution); }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 inline-block" /> View Details
                  </div>
                  {contribution.proofUrl && (
                    <div
                      className="w-full px-3 py-2 text-left text-xs sm:text-sm hover:bg-gray-50 cursor-pointer"
                      onClick={() => { setOpenMenuForId(null); onViewProof(contribution); }}
                    >
                      <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 inline-block" /> View Proof
                    </div>
                  )}
                  {isAdmin && contribution.status === 'pending' && onStatusUpdate && (
                    <>
                      <div
                        className="w-full px-3 py-2 text-left text-xs sm:text-sm text-green-600 hover:bg-green-50 cursor-pointer"
                        onClick={() => { setOpenMenuForId(null); onStatusUpdate(contribution.id, 'approved'); }}
                      >
                        <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 inline-block" /> Approve
                      </div>
                      <div
                        className="w-full px-3 py-2 text-left text-xs sm:text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                        onClick={() => { setOpenMenuForId(null); handleRejectClick(); }}
                      >
                        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 inline-block" /> Reject
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </motion.div>

      {/* Rejection Modal */}
      <ContributionRejectionModal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        onReject={handleRejectionSubmit}
        contributionTitle={contribution.caseTitle}
      />
    </>
  )
}

interface ContributionThreadProps {
  parent?: Contribution
  children: React.ReactNode
  onStatusUpdate?: (contributionId: string, status: 'approved' | 'rejected', rejectionReason?: string) => void
  onViewDetails: (contribution: Contribution) => void
  onViewProof: (contribution: Contribution) => void
  isAdmin?: boolean
  highlightedTxId?: string
}

const ContributionThread = ({
  parent,
  children,
  onStatusUpdate,
  onViewDetails,
  onViewProof,
  isAdmin = false,
  highlightedTxId,
}: ContributionThreadProps) => {
  const childrenArray = Array.isArray(children) ? children : [children]
  
  return (
    <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-sm">
      {/* Thread Header */}
      <div className="flex items-center gap-2 mb-2 sm:mb-3 pb-2 border-b border-gray-200 flex-wrap">
        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
        <span className="text-xs sm:text-sm font-medium text-gray-700">Transaction Thread</span>
        <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 border-blue-200">
          {childrenArray.length + (parent ? 1 : 0)} items
        </Badge>
      </div>
      
      <div className="space-y-2">
        {parent ? (
          <div className="space-y-3">
            <ContributionItem
              contribution={parent}
              isParent={true}
              onStatusUpdate={onStatusUpdate}
              onViewDetails={onViewDetails}
              onViewProof={onViewProof}
              isAdmin={isAdmin}
              isHighlighted={highlightedTxId === parent.id}
            />
            {childrenArray.map((child: Contribution) => (
              <div key={child.id}>
                <ContributionItem
                  contribution={child}
                  isNested={true}
                  onStatusUpdate={onStatusUpdate}
                  onViewDetails={onViewDetails}
                  onViewProof={onViewProof}
                  isAdmin={isAdmin}
                  isHighlighted={highlightedTxId === child.id}
                />
              </div>
            ))}
          </div>
        ) : (
          childrenArray.map((child: Contribution) => (
            <div key={child.id}>
              <ContributionItem
                contribution={child}
                isNested={true}
                onStatusUpdate={onStatusUpdate}
                onViewDetails={onViewDetails}
                onViewProof={onViewProof}
                isAdmin={isAdmin}
                isHighlighted={highlightedTxId === child.id}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function ContributionsList({
  contributions,
  loading = false,
  onStatusUpdate,
  highlightedTxId,
  isAdmin = false,
  pagination,
  error,
  onPageChange,
  onRefresh,
}: ContributionsListProps) {
  const [openMenuForId, setOpenMenuForId] = useState<string | null>(null)
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedProofContribution, setSelectedProofContribution] = useState<Contribution | null>(null)
  const [isProofModalOpen, setIsProofModalOpen] = useState(false)

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuForId) {
        setOpenMenuForId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuForId])

  // Group contributions into threads (same logic as current design)
  const threads: Record<string, { parent?: Contribution; children: Contribution[] }> = {}
  const standalone: Contribution[] = []

  contributions.forEach((c) => {
    const isRevision = c.notes && c.notes.startsWith('REVISION:')
    const hasRevisionComment = c.approval_status?.[0]?.admin_comment?.includes('Revision of contribution')
    
    if (c.status === 'rejected' && !isRevision && !hasRevisionComment) {
      const key = c.id
      if (!threads[key]) threads[key] = { children: [] }
      const existing = threads[key].parent
      if (!existing || new Date(c.createdAt) > new Date(existing.createdAt)) {
        threads[key].parent = c
      }
    } else if (isRevision || hasRevisionComment) {
      let originalContributionId: string | null = null
      
      if (c.approval_status?.[0]?.admin_comment) {
        const revisionMatch = c.approval_status[0].admin_comment.match(/Revision of contribution ([a-f0-9-]+)\. Original rejection reason: (.+)/)
        if (revisionMatch) {
          originalContributionId = revisionMatch[1]
        }
      }
      
      if (!originalContributionId && c.notes) {
        const revisionMatch = c.notes.match(/Revision of contribution ([a-f0-9-]+)\. Original rejection reason: (.+)/)
        if (revisionMatch) {
          originalContributionId = revisionMatch[1]
        }
      }
      
      if (originalContributionId) {
        const originalContribution = contributions.find(orig => orig.id === originalContributionId)
        if (originalContribution) {
          const key = originalContribution.id
          if (!threads[key]) threads[key] = { children: [] }
          threads[key].children.push(c)
        } else {
          standalone.push(c)
        }
      } else {
        let rejectionReason: string | null = null
        
        if (c.approval_status?.[0]?.admin_comment) {
          const reasonMatch = c.approval_status[0].admin_comment.match(/Original rejection reason: (.+)/)
          if (reasonMatch) {
            rejectionReason = reasonMatch[1]
          }
        }
        
        if (!rejectionReason && c.notes) {
          const reasonMatch = c.notes.match(/Original rejection reason: (.+)/)
          if (reasonMatch) {
            rejectionReason = reasonMatch[1]
          }
        }
        
        if (rejectionReason) {
          const originalContribution = contributions.find(orig => 
            orig.status === 'rejected' && 
            orig.approval_status?.[0]?.rejection_reason === rejectionReason
          )
          if (originalContribution) {
            const key = originalContribution.id
            if (!threads[key]) threads[key] = { children: [] }
            threads[key].children.push(c)
          } else {
            standalone.push(c)
          }
        } else {
          standalone.push(c)
        }
      }
    } else {
      standalone.push(c)
    }
  })

  const groups = Object.entries(threads)
    .map(([key, g]) => ({ 
      key, 
      ...g,
      type: 'thread' as const,
      // Get the latest date from all items in the thread for sorting
      latestDate: [g.parent?.createdAt, ...g.children.map(c => c.createdAt)]
        .filter(Boolean)
        .sort()
        .pop() || '1970'
    }))
  
  // Add standalone contributions with a type marker and their date
  const standaloneItems = standalone.map(contribution => ({
    type: 'standalone' as const,
    contribution,
    latestDate: contribution.createdAt
  }))
  
  // Merge and sort all items (threads + standalone) by date
  const allItems = [...groups, ...standaloneItems].sort((a, b) => {
    const timeA = new Date(a.latestDate).getTime()
    const timeB = new Date(b.latestDate).getTime()
    return timeB - timeA  // Newest first
  })

  const handleViewDetails = (contribution: Contribution) => {
    setSelectedContribution(contribution)
    setIsDetailsModalOpen(true)
  }

  const handleViewProof = (contribution: Contribution) => {
    setSelectedProofContribution(contribution)
    setIsProofModalOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-2xl h-24"></div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm animate-pulse">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  // Pagination component
  const PaginationControls = () => {
    if (!pagination || pagination.totalPages <= 1) return null

    return (
      <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} contributions
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => pagination.hasPrevPage && onPageChange?.(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              className={`flex items-center gap-1 sm:gap-2 h-8 sm:h-9 rounded-md px-2 sm:px-3 border border-gray-200 bg-white hover:bg-gray-50 text-xs sm:text-sm font-medium ${
                !pagination.hasPrevPage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <span className="text-xs sm:text-sm text-gray-600 px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => pagination.hasNextPage && onPageChange?.(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className={`flex items-center gap-1 sm:gap-2 h-8 sm:h-9 rounded-md px-2 sm:px-3 border border-gray-200 bg-white hover:bg-gray-50 text-xs sm:text-sm font-medium ${
                !pagination.hasNextPage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <span className="hidden sm:inline">Next</span>
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Top Pagination */}
      <PaginationControls />

      {allItems.map((item) => {
        if (item.type === 'thread') {
          const g = item
          return (
            <motion.div
              key={g.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ContributionThread
                parent={g.parent}
                onStatusUpdate={onStatusUpdate}
                onViewDetails={handleViewDetails}
                onViewProof={handleViewProof}
                isAdmin={isAdmin}
                highlightedTxId={highlightedTxId}
              >
                {g.children as React.ReactNode}
              </ContributionThread>
            </motion.div>
          )
        } else {
          // Render standalone contribution in container
          return (
            <motion.div
              key={item.contribution.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 shadow-sm">
                {/* Standalone Header */}
                <div className="flex items-center gap-2 mb-2 sm:mb-3 pb-2 border-b border-gray-200">
                  <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Single Contribution</span>
                  <Badge variant="outline" className="text-[10px] sm:text-xs bg-gray-100 text-gray-700 border-gray-200">
                    1 item
                  </Badge>
                </div>
                
                <ContributionItem
                  contribution={item.contribution}
                  onStatusUpdate={onStatusUpdate}
                  onViewDetails={handleViewDetails}
                  onViewProof={handleViewProof}
                  isAdmin={isAdmin}
                  isHighlighted={highlightedTxId === item.contribution.id}
                />
              </div>
            </motion.div>
          )
        }
      })}

      {contributions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No contributions found</div>
        </div>
      )}

      {/* Bottom Pagination */}
      <PaginationControls />

      {/* Contribution Details Modal */}
      <ContributionDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedContribution(null)
        }}
        contribution={selectedContribution}
        isAdmin={isAdmin}
        onStatusUpdate={onStatusUpdate}
      />

      {/* Payment Proof Modal */}
      {selectedProofContribution && (
        <PaymentProofModal
          isOpen={isProofModalOpen}
          onClose={() => {
            setIsProofModalOpen(false)
            setSelectedProofContribution(null)
          }}
          proofUrl={selectedProofContribution.proofUrl!}
          contributionId={selectedProofContribution.id}
          amount={selectedProofContribution.amount}
          paymentMethod={selectedProofContribution.payment_method}
        />
      )}
    </div>
  )
}
