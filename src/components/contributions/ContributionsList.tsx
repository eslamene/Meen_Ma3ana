'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar, 
  DollarSign, 
  Eye, 
  Download, 
  Heart, 
  Target, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  ArrowLeft, 
  Info, 
  RefreshCw, 
  Copy,
  Check,
  X,
  MoreVertical
} from 'lucide-react'
import ContributionDetailsModal from './ContributionDetailsModal'
import ContributionRevisionModal from './ContributionRevisionModal'

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
}

interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface Filters {
  status: string
  search: string
  dateFrom: string
  dateTo: string
}

interface ContributionsListProps {
  contributions: Contribution[]
  pagination: PaginationState
  filters: Filters
  loading: boolean
  error: string | null
  isAdmin?: boolean
  onStatusUpdate?: (contributionId: string, status: 'approved' | 'rejected', adminComment?: string) => Promise<void>
  onSearch: (search: string) => void
  onFilterChange: (key: keyof Filters, value: string) => void
  onClearFilters: () => void
  onPageChange: (page: number) => void
  onRefresh: () => void
}

export default function ContributionsList({
  contributions,
  pagination,
  filters,
  loading,
  error,
  isAdmin = false,
  onStatusUpdate,
  onSearch,
  onFilterChange,
  onClearFilters,
  onPageChange,
  onRefresh
}: ContributionsListProps) {
  const router = useRouter()
  const params = useParams()
  const [searchInput, setSearchInput] = useState(filters.search || '')
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false)
  const [openMenuForId, setOpenMenuForId] = useState<string | null>(null)

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
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'No date available'
    try {
      const now = new Date()
      const date = new Date(dateString)
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
      
      if (diffInHours < 1) return 'Just now'
      if (diffInHours < 24) return `${diffInHours} hours ago`
      if (diffInHours < 48) return 'Yesterday'
      return formatDate(dateString)
    } catch (error) {
      return 'Invalid date'
    }
  }

  const truncateId = (id?: string) => {
    if (!id) return ''
    if (id.length <= 12) return id
    return `${id.slice(0, 6)}...${id.slice(-6)}`
  }

  const copyToClipboard = async (text?: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      console.log('Transaction ID copied to clipboard')
    } catch {
      console.error('Could not copy ID')
    }
  }

  const handleViewProof = (proofUrl: string) => {
    window.open(proofUrl, '_blank')
  }

  const handleDownloadReceipt = (contribution: Contribution) => {
    const receiptContent = `
Receipt Number: ${contribution.id}
Date: ${formatDate(contribution.createdAt)}
Case: ${contribution.caseTitle}
Amount: ${formatAmount(contribution.amount)}
Status: ${contribution.status}
${contribution.message ? `Message: ${contribution.message}` : ''}
${contribution.anonymous ? 'Anonymous Contribution' : `Donor: ${contribution.donorName}`}
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

  const handleViewDetails = (contribution: Contribution) => {
    setSelectedContribution(contribution)
    setIsDetailsModalOpen(true)
  }

  const getOriginalContribution = (contribution: Contribution): Contribution | null => {
    let originalContributionId: string | null = null
    
    if (contribution.approval_status?.[0]?.admin_comment) {
      const revisionMatch = contribution.approval_status[0].admin_comment.match(/Revision of contribution ([a-f0-9-]+)\. Original rejection reason: (.+)/)
      if (revisionMatch) {
        originalContributionId = revisionMatch[1]
      }
    }
    
    if (!originalContributionId && contribution.notes && contribution.notes.startsWith('REVISION:')) {
      const revisionMatch = contribution.notes.match(/Revision of contribution ([a-f0-9-]+)\. Original rejection reason: (.+)/)
      if (revisionMatch) {
        originalContributionId = revisionMatch[1]
      }
    }
    
    if (originalContributionId) {
      return contributions.find(orig => orig.id === originalContributionId) || null
    }
    
    return null
  }

  const handleRevisionRequest = (contribution: Contribution) => {
    setSelectedContribution(contribution)
    setIsDetailsModalOpen(false)
    setIsRevisionModalOpen(true)
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

      onRefresh()
    } catch (error) {
      console.error('Error submitting revision:', error)
      throw error
    }
  }

  const applySearch = () => {
    onSearch(searchInput)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <div onClick={onRefresh} className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white cursor-pointer inline-flex items-center justify-center h-10 px-4 py-2 rounded-md text-sm font-medium">
              Try Again
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group contributions into threads
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
    .map(([key, g]) => ({ key, ...g }))
    .sort((a, b) => {
      const maxA = [a.parent?.createdAt, ...a.children.map(c => c.createdAt)].filter(Boolean).sort().pop() || '1970'
      const maxB = [b.parent?.createdAt, ...b.children.map(c => c.createdAt)].filter(Boolean).sort().pop() || '1970'
      return new Date(maxB).getTime() - new Date(maxA).getTime()
    })

  const renderContribution = (contribution: Contribution, nested = false, isParent = false) => (
    <Card 
      key={contribution.id} 
      className={`relative bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] overflow-visible ${
        openMenuForId === contribution.id ? 'z-[60]' : ''
      } ${
        nested 
          ? 'ml-12 border-l-4 border-blue-300 bg-blue-50/50' 
          : isParent 
            ? 'border-l-4 border-red-300 bg-red-50/50' 
            : ''
      }`}
    >
      {nested && (
        <div className="absolute -left-3 top-6 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <RefreshCw className="h-3 w-3 text-white" />
        </div>
      )}
      {isParent && (
        <div className="absolute -left-3 top-6 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
          <XCircle className="h-3 w-3 text-white" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            <div className={`p-2 rounded-lg ${
              contribution.status === 'approved' ? 'bg-green-100' :
              contribution.status === 'rejected' ? 'bg-red-100' :
              contribution.status === 'pending' ? 'bg-yellow-100' :
              'bg-blue-100'
            }`}>
              {contribution.status === 'approved' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : contribution.status === 'rejected' ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : contribution.status === 'pending' ? (
                <Clock className="h-5 w-5 text-yellow-600" />
              ) : (
                <RefreshCw className="h-5 w-5 text-blue-600" />
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div
                  onClick={() => router.push(`/${params.locale}/cases/${contribution.caseId}`)}
                  className="font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors text-left w-full cursor-pointer"
                >
                  {contribution.caseTitle}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(contribution.status)}
                  {contribution.anonymous && (
                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                      Anonymous
                    </Badge>
                  )}
                  {nested && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-200 font-semibold">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      REVISION
                    </Badge>
                  )}
                  {isParent && (
                    <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-200 font-semibold">
                      <XCircle className="h-3 w-3 mr-1" />
                      ORIGINAL
                    </Badge>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    Transaction ID: <span className="font-mono text-gray-600">{truncateId(contribution.id)}</span>
                    <div
                      className="text-gray-400 hover:text-gray-600 cursor-pointer inline-flex"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(contribution.id)
                      }}
                      aria-label="Copy ID"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </div>
                  </span>
                  {isAdmin && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      Donor: <span className="font-mono text-gray-600">{contribution.donorEmail}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-gray-900">{formatAmount(contribution.amount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{getTimeAgo(contribution.createdAt)}</span>
              </div>
            </div>

            {contribution.message && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700 italic">
                  &ldquo;{contribution.message}&rdquo;
                </p>
              </div>
            )}

            {contribution.notes && contribution.notes.startsWith('REVISION:') && (
              <div className="bg-blue-100 rounded-lg p-3 mb-3 border-l-4 border-blue-400 shadow-sm">
                <div className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-1">Revision Details</p>
                    <p className="text-sm text-blue-700">
                      {contribution.notes.replace('REVISION: ', '')}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {isParent && contribution.approval_status?.[0]?.rejection_reason && (
              <div className="bg-red-100 rounded-lg p-3 mb-3 border-l-4 border-red-400 shadow-sm">
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-700">
                      {contribution.approval_status[0].rejection_reason}
                    </p>
                    {contribution.approval_status[0].admin_comment && (
                      <p className="text-sm text-red-600 mt-1 italic">
                        Admin: {contribution.approval_status[0].admin_comment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions + Menu */}
          <div className="relative flex items-center gap-2 flex-shrink-0">
            <div
              title="View details"
              onClick={() => handleViewDetails(contribution)}
              className="h-9 w-9 p-0 rounded-full border border-purple-200 hover:border-purple-500 hover:bg-purple-50 cursor-pointer inline-flex items-center justify-center"
            >
              <Info className="h-4 w-4" />
            </div>
            {contribution.proofUrl && (
              <div
                title="View proof"
                onClick={() => handleViewProof(contribution.proofUrl!)}
                className="h-9 w-9 p-0 rounded-full border border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer inline-flex items-center justify-center"
              >
                <Eye className="h-4 w-4" />
              </div>
            )}
            {isAdmin && contribution.status === 'pending' && onStatusUpdate && (
              <>
                <div
                  title="Approve"
                  onClick={() => onStatusUpdate(contribution.id, 'approved')}
                  className="h-9 w-9 p-0 rounded-full border border-green-200 text-green-700 hover:bg-green-50 cursor-pointer inline-flex items-center justify-center"
                >
                  <Check className="h-4 w-4" />
                </div>
                <div
                  title="Reject"
                  onClick={() => onStatusUpdate(contribution.id, 'rejected')}
                  className="h-9 w-9 p-0 rounded-full border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer inline-flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </div>
              </>
            )}
            <div
              aria-haspopup="menu"
              aria-expanded={openMenuForId === contribution.id}
              onClick={() => setOpenMenuForId(prev => prev === contribution.id ? null : contribution.id)}
              className="h-9 w-9 p-0 rounded-full border border-gray-200 hover:border-gray-400 cursor-pointer inline-flex items-center justify-center"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </div>
            {openMenuForId === contribution.id && (
              <div className="absolute right-0 top-10 z-[70] w-44 rounded-md border border-gray-200 bg-white shadow-lg">
                <div
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setOpenMenuForId(null); handleViewDetails(contribution); }}
                >
                  View Details
                </div>
                <div
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setOpenMenuForId(null); router.push(`/${params.locale}/cases/${contribution.caseId}`); }}
                >
                  View Case
                </div>
                {contribution.proofUrl && (
                  <div
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                    onClick={() => { setOpenMenuForId(null); handleViewProof(contribution.proofUrl!); }}
                  >
                    View Proof
                  </div>
                )}
                <div
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setOpenMenuForId(null); handleDownloadReceipt(contribution); }}
                >
                  Receipt
                </div>
                {isAdmin && contribution.status === 'pending' && onStatusUpdate && (
                  <>
                    <div
                      className="w-full px-3 py-2 text-left text-sm text-green-700 hover:bg-green-50 cursor-pointer"
                      onClick={() => { setOpenMenuForId(null); onStatusUpdate(contribution.id, 'approved'); }}
                    >
                      Approve
                    </div>
                    <div
                      className="w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 cursor-pointer"
                      onClick={() => { setOpenMenuForId(null); onStatusUpdate(contribution.id, 'rejected'); }}
                    >
                      Reject
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
              <Filter className="h-5 w-5 text-blue-600" />
              Filters & Search
              <span className="ml-2 text-xs font-normal text-gray-500">Press Enter or click Search</span>
            </CardTitle>
            <div
              onClick={onClearFilters}
              className="h-9 px-3 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground text-gray-600 hover:text-gray-900 cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium"
            >
              Clear Filters
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search */}
            <div className="relative md:col-span-5">
              <label className="sr-only" htmlFor="contrib-search">Search</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <div className="flex gap-2">
                <Input
                  id="contrib-search"
                  placeholder="Search cases or transaction ID..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applySearch() }}
                  className="pl-10 h-11"
                />
                <div
                  onClick={applySearch}
                  className="h-11 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium"
                >
                  <Search className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <label className="sr-only" htmlFor="status-filter">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => onFilterChange('status', value)}
              >
                <SelectTrigger id="status-filter" className="h-11">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="md:col-span-2">
              <label className="sr-only" htmlFor="date-from">Date From</label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                className="h-11"
              />
            </div>

            {/* Date To */}
            <div className="md:col-span-2">
              <label className="sr-only" htmlFor="date-to">Date To</label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFilterChange('dateTo', e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contributions List */}
      <div className="space-y-4">
        {/* Render grouped threads */}
        {groups.map((g) => (
          <div key={g.key} className="space-y-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm font-semibold text-gray-700">Transaction Thread</span>
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                {g.children.length + 1} items
              </Badge>
            </div>
            {g.parent ? (
              <div className="relative">
                {g.children.length > 0 && (
                  <div className="absolute left-6 top-16 w-0.5 h-4 bg-red-300"></div>
                )}
                {renderContribution(g.parent, false, true)}
                {g.children.map((child, index) => (
                  <div key={child.id} className="relative">
                    {index < g.children.length - 1 && (
                      <div className="absolute left-6 top-16 w-0.5 h-4 bg-blue-300"></div>
                    )}
                    {renderContribution(child, true, false)}
                  </div>
                ))}
              </div>
            ) : (
              g.children.map((child, index) => (
                <div key={child.id} className="relative">
                  {index < g.children.length - 1 && (
                    <div className="absolute left-6 top-16 w-0.5 h-4 bg-blue-300"></div>
                  )}
                  {renderContribution(child, true, false)}
                </div>
              ))
            )}
          </div>
        ))}

        {/* Render standalone contributions */}
        {standalone.map((contribution) => renderContribution(contribution, false, false))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} contributions
              </div>
              <div className="flex items-center gap-2">
                <div
                  onClick={() => pagination.hasPreviousPage && onPageChange(pagination.page - 1)}
                  className={`flex items-center gap-2 h-9 rounded-md px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium ${
                    !pagination.hasPreviousPage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </div>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div
                  onClick={() => pagination.hasNextPage && onPageChange(pagination.page + 1)}
                  className={`flex items-center gap-2 h-9 rounded-md px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium ${
                    !pagination.hasNextPage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  Next
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <ContributionDetailsModal
        contribution={selectedContribution}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onRevisionRequest={handleRevisionRequest}
        originalContribution={selectedContribution ? getOriginalContribution(selectedContribution) : null}
      />

      <ContributionRevisionModal
        originalContribution={selectedContribution}
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        onRevisionSubmit={handleRevisionSubmit}
      />
    </div>
  )
} 