'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, DollarSign, Eye, Download, Heart, Target, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
}

export default function ContributionHistory() {
  const t = useTranslations('cases')
  const router = useRouter()
  const params = useParams()
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })

  const supabase = createClient()

  useEffect(() => {
    fetchContributions()
  }, [pagination.page])

  const fetchContributions = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setError('You must be logged in to view contributions')
        return
      }

      const response = await fetch(`/api/contributions?page=${pagination.page}&limit=${pagination.limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch contributions')
      }
      
      const data = await response.json()
      console.log('API Response:', data)
      setContributions(data.contributions || [])
      setPagination(data.pagination || pagination)
    } catch (error) {
      console.error('Error fetching contributions:', error)
      setError('Failed to load contributions')
    } finally {
      setLoading(false)
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
      day: 'numeric'
    })
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return 'Yesterday'
    return formatDate(dateString)
  }

  const handleViewProof = (proofUrl: string) => {
    window.open(proofUrl, '_blank')
  }

  const handleDownloadReceipt = (contribution: Contribution) => {
    // Generate receipt content
    const receiptContent = `
Receipt Number: ${contribution.id}
Date: ${formatDate(contribution.createdAt)}
Case: ${contribution.caseTitle}
Amount: ${formatAmount(contribution.amount)}
Status: ${contribution.status}
${contribution.message ? `Message: ${contribution.message}` : ''}
    `.trim()

    // Create and download file
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Contribution History</h3>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Contribution History</h3>
        </div>
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchContributions} className="bg-gradient-to-r from-blue-500 to-indigo-600">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Recent Contributions</h3>
          {contributions.length > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {pagination.totalCount || contributions.length} contributions
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Sorted by latest first
            </span>
          </div>
          {pagination.totalCount > 10 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${params.locale}/contributions`)}
              className="text-blue-600 hover:text-blue-800 border-blue-200 hover:border-blue-400"
            >
              View All
            </Button>
          )}
        </div>
      </div>

      {contributions.length === 0 ? (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Heart className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No contributions yet
            </h3>
            <p className="text-gray-600 mb-6">
              Your contribution history will appear here once you start supporting cases
            </p>
            <Button 
              onClick={() => router.push(`/${params.locale}/cases`)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
            >
              <Target className="h-4 w-4 mr-2" />
              Browse Cases
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contributions.map((contribution) => (
            <Card 
              key={contribution.id} 
              className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.01] overflow-hidden"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    <div className={`p-2 rounded-lg ${
                      contribution.status === 'approved' ? 'bg-green-100' :
                      contribution.status === 'rejected' ? 'bg-red-100' :
                      'bg-yellow-100'
                    }`}>
                      {contribution.status === 'approved' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : contribution.status === 'rejected' ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => router.push(`/${params.locale}/cases/${contribution.caseId}`)}
                          className="font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors text-left w-full"
                        >
                          {contribution.caseTitle}
                        </button>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(contribution.status)}
                          {contribution.anonymous && (
                            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                              Anonymous
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            Transaction ID: <span className="font-mono text-gray-600">{contribution.id}</span>
                          </span>
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
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/${params.locale}/cases/${contribution.caseId}`)}
                      className="border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                    >
                      <Target className="h-3 w-3 mr-1" />
                      View Case
                    </Button>
                    {contribution.proofUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProof(contribution.proofUrl!)}
                        className="border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Proof
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadReceipt(contribution)}
                      className="border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-200"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Receipt
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
                      ))}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasPreviousPage}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        className="border-2 border-gray-200 hover:border-blue-500 disabled:opacity-50"
                      >
                        Previous
                      </Button>
                      
                      <div className="flex items-center px-4">
                        <span className="text-sm text-gray-600">
                          Page {pagination.page} of {pagination.totalPages}
                        </span>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasNextPage}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        className="border-2 border-gray-200 hover:border-blue-500 disabled:opacity-50"
                      >
                        Next
                      </Button>
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      Showing {contributions.length} of {pagination.totalCount} contributions
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Show "View All" button if there are more than 10 contributions */}
            {pagination.totalCount > 10 && (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4 text-center">
                  <p className="text-gray-600 mb-3">
                    Showing the last 10 contributions. View all {pagination.totalCount} contributions for full history.
                  </p>
                  <Button
                    onClick={() => router.push(`/${params.locale}/contributions`)}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    View Full Contribution History
                  </Button>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  )
} 