'use client'
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useEnhancedToast } from '@/hooks/use-enhanced-toast'
import { 
  Target, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
  AlertTriangle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Case {
  id: string
  title: string
  description: string
  target_amount: number
  current_amount: number
  status: 'draft' | 'submitted' | 'published' | 'closed' | 'under_review'
  created_at: string
  created_by: string
  image_url?: string
  // Calculated fields
  approved_amount?: number
  total_contributions?: number
}

export default function AdminCasesPage() {
  const t = useTranslations('admin')
  const router = useRouter()
  const params = useParams()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    completed: 0,
    closed: 0,
    under_review: 0
  })
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    caseId: string | null
    caseTitle: string
    step: 'confirm' | 'final'
  }>({
    isOpen: false,
    caseId: null,
    caseTitle: '',
    step: 'confirm'
  })
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const { toast } = useEnhancedToast()

  const supabase = createClient()

  useEffect(() => {
    fetchCases()
  }, [])

  const fetchCases = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch contribution amounts for each case
      const casesWithAmounts = await Promise.all(
        (data || []).map(async (case_) => {
          const { approved_amount, total_contributions } = await fetchCaseContributions(case_.id)
          return {
            ...case_,
            approved_amount,
            total_contributions
          }
        })
      )

      setCases(casesWithAmounts)
      
      // Calculate stats
      const total = casesWithAmounts?.length || 0
      const published = casesWithAmounts?.filter(c => c.status === 'published').length || 0
      const completed = casesWithAmounts?.filter(c => c.status === 'completed').length || 0
      const closed = casesWithAmounts?.filter(c => c.status === 'closed').length || 0
      const under_review = casesWithAmounts?.filter(c => c.status === 'under_review').length || 0

      setStats({ total, published, completed, closed, under_review })
    } catch (error) {
      console.error('Error fetching cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCaseContributions = async (caseId: string) => {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          amount,
          contribution_approval_status!contribution_id(status)
        `)
        .eq('case_id', caseId)

      if (error) {
        console.error('Error fetching contributions for case:', caseId, error)
        return { approved_amount: 0, total_contributions: 0 }
      }

      let approved_amount = 0
      let total_contributions = 0

      ;(data || []).forEach((contribution) => {
        const amount = parseFloat(contribution.amount || 0)
        total_contributions += amount

        const approvalStatuses = contribution.contribution_approval_status || []
        const latestStatus = approvalStatuses.length > 0 ? approvalStatuses[0].status : 'none'
        
        if (latestStatus === 'approved') {
          approved_amount += amount
        }
      })

      return { approved_amount, total_contributions }
    } catch (error) {
      console.error('Error calculating contributions for case:', caseId, error)
      return { approved_amount: 0, total_contributions: 0 }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Published
          </Badge>
        )
      case 'closed':
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
            <XCircle className="h-3 w-3 mr-1" />
            Closed
          </Badge>
        )
      case 'under_review':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        )
      case 'draft':
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
            <Edit className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        )
      case 'submitted':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Submitted
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
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

  const getProgressPercentage = (current: number, target: number) => {
    if (!target || target <= 0) return 0
    return Math.min((current / target) * 100, 100)
  }

  const filteredCases = cases.filter(case_ => {
    const matchesSearch = case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         case_.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || case_.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDeleteClick = (caseId: string, caseTitle: string) => {
    setDeleteDialog({
      isOpen: true,
      caseId,
      caseTitle,
      step: 'confirm'
    })
  }

  const handleDeleteConfirm = () => {
    if (deleteDialog.step === 'confirm') {
      setDeleteDialog(prev => ({ ...prev, step: 'final' }))
      setDeleteConfirmationText('') // Reset confirmation text
    } else {
      // Check if user typed exactly "DELETE"
      if (deleteConfirmationText !== 'DELETE') {
        toast.error("Invalid Confirmation", "You must type exactly 'DELETE' to confirm deletion.")
        return
      }
      performDelete()
    }
  }

  const performDelete = async () => {
    if (!deleteDialog.caseId) return

    try {
      setDeleting(true)
      
      const response = await fetch(`/api/cases/${deleteDialog.caseId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Note: 400 responses in console are expected for contribution protection
      // This is normal browser network logging, not an actual error

      const result = await response.json()

      // Check if deletion was blocked by business logic (contribution protection)
      if (result.success === false && result.blocked === true && result.reason === 'contribution_protection') {
        // This is expected business logic, not an error
        toast.error(
          "Cannot Delete Case with Contributions",
          result.message || "This case has received contributions and cannot be deleted for data integrity. Please contact an administrator if you need to remove this case."
        )
        
        // Close dialog without treating as error
        setDeleteDialog({
          isOpen: false,
          caseId: null,
          caseTitle: '',
          step: 'confirm'
        })
        return
      }

      // Check for actual errors
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete case')
      }

      // Remove case from local state
      setCases(prev => prev.filter(c => c.id !== deleteDialog.caseId))
      
      // Update stats
      setStats(prev => ({
        ...prev,
        total: prev.total - 1
      }))

      // Close dialog
      setDeleteDialog({
        isOpen: false,
        caseId: null,
        caseTitle: '',
        step: 'confirm'
      })

      // Show success message
      toast.success(
        "Case Deleted Successfully",
        `Case "${deleteDialog.caseTitle}" and all related data have been permanently deleted.`
      )

    } catch (error) {
      // Only log actual errors, not business logic responses
      console.error('Unexpected error deleting case:', error)
      
      // Show error message for unexpected errors only
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete case'
      
      toast.error(
        "Delete Failed",
        errorMessage
      )
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      caseId: null,
      caseTitle: '',
      step: 'confirm'
    })
    setDeleteConfirmationText('') // Reset confirmation text
  }

  return (
    <ProtectedRoute>
      <PermissionGuard permission="view:admin_cases">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${params.locale}/admin`)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Admin
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Case Management</h1>
                  <p className="text-gray-600 mt-2">Manage all charity cases in the system</p>
                </div>
                <Button
                  onClick={() => router.push(`/${params.locale}/cases/create`)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Case
                </Button>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Cases</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Published</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.published}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Closed</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.closed}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <XCircle className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Under Review</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.under_review}</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search cases..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Cases List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading cases...</p>
              </div>
            ) : filteredCases.length === 0 ? (
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No cases found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your filters to see more results'
                      : 'No cases have been created yet'
                    }
                  </p>
                  <Button
                    onClick={() => router.push(`/${params.locale}/cases/create`)}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Case
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredCases.map((case_) => (
                  <Card key={case_.id} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Case Image */}
                        {case_.image_url && (
                          <div className="flex-shrink-0">
                            <Image
                              src={case_.image_url}
                              alt={case_.title}
                              className="w-20 h-20 object-cover rounded-lg"
                              width={80}
                              height={80}
                            />
                          </div>
                        )}

                        {/* Case Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {case_.title}
                              </h3>
                              <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                                {case_.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {getStatusBadge(case_.status)}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{getProgressPercentage(case_.approved_amount || 0, case_.target_amount).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${getProgressPercentage(case_.approved_amount || 0, case_.target_amount)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-6 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span>{formatAmount(case_.approved_amount || 0)} / {formatAmount(case_.target_amount)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{formatDate(case_.created_at)}</span>
                            </div>
                          </div>

                          {/* Admin Disclaimer */}
                          {case_.total_contributions && case_.approved_amount && 
                           case_.total_contributions !== case_.approved_amount && (
                            <div className="mt-2 text-xs text-amber-600">
                              ⚠️ Total contributions: {formatAmount(case_.total_contributions)} (includes pending/rejected)
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/${params.locale}/cases/${case_.id}`)}
                            className="border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/${params.locale}/cases/${case_.id}/edit`)}
                            className="border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(case_.id, case_.title)}
                            className="border-2 border-red-200 hover:border-red-500 hover:bg-red-50 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.isOpen} onOpenChange={handleDeleteCancel}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                {deleteDialog.step === 'confirm' ? 'Confirm Case Deletion' : 'Final Confirmation'}
              </DialogTitle>
              <DialogDescription asChild>
                <div>
                  {deleteDialog.step === 'confirm' ? (
                    <>
                      <p>Are you sure you want to delete the case <strong>{deleteDialog.caseTitle}</strong>?</p>
                      <p className="mt-2">This action will permanently delete:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>The case and all its data</li>
                        <li>All uploaded files and images</li>
                        <li>All case updates and comments</li>
                        <li>All related records</li>
                      </ul>
                      <p className="mt-4">
                        <strong className="text-red-600">This action cannot be undone!</strong>
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <strong className="text-red-600">FINAL WARNING!</strong>
                      </p>
                      <p className="mt-2">
                        You are about to permanently delete case <strong>{deleteDialog.caseTitle}</strong> and ALL its related data.
                      </p>
                      <p className="mt-2">
                        <strong className="text-red-600">This action cannot be undone!</strong>
                      </p>
                      <p className="mt-2">
                        Type <strong>DELETE</strong> in the box below to confirm:
                      </p>
                    </>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            
            {deleteDialog.step === 'final' && (
              <div className="py-4">
                <Input
                  placeholder="Type DELETE to confirm"
                  className="w-full"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                />
                {deleteConfirmationText && deleteConfirmationText !== 'DELETE' && (
                  <p className="text-sm text-red-600 mt-2">
                    You must type exactly &quot;DELETE&quot; to confirm
                  </p>
                )}
                {deleteConfirmationText === 'DELETE' && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ Confirmation text is correct
                  </p>
                )}
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleting || (deleteDialog.step === 'final' && deleteConfirmationText !== 'DELETE')}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Deleting...' : deleteDialog.step === 'confirm' ? 'Continue' : 'Delete Forever'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PermissionGuard>
    </ProtectedRoute>
  )
} 