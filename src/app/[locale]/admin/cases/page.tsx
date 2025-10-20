'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Target, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
  Users
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Case {
  id: string
  title: string
  description: string
  target_amount: number
  current_amount: number
  status: 'active' | 'completed' | 'paused'
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
    active: 0,
    completed: 0,
    paused: 0
  })

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
      const active = casesWithAmounts?.filter(c => c.status === 'active').length || 0
      const completed = casesWithAmounts?.filter(c => c.status === 'completed').length || 0
      const paused = casesWithAmounts?.filter(c => c.status === 'paused').length || 0

      setStats({ total, active, completed, paused })
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
      case 'active':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      case 'paused':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Paused
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

  return (
    <ProtectedRoute>
      <PermissionGuard permission="cases:read">
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
                      <p className="text-sm font-medium text-gray-600">Active Cases</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
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
                    <div className="p-3 bg-purple-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Paused</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.paused}</p>
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
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
                            <img
                              src={case_.image_url}
                              alt={case_.title}
                              className="w-20 h-20 object-cover rounded-lg"
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </PermissionGuard>
    </ProtectedRoute>
  )
} 