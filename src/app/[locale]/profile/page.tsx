'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Settings, 
  History, 
  Heart,
  TrendingUp,
  DollarSign,
  Shield,
  Globe,
  Edit,
  Bell,
  Download,
  Eye,
  Target,
  Clock,
  AlertCircle,
  CheckCircle,
  Activity,
  Award
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ContributionHistory from '@/components/profile/ContributionHistory'
import UserRoleInfo from '@/components/profile/UserRoleInfo'
import { theme, brandColors } from '@/lib/theme'

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  address: string | null
  profile_image: string | null
  role: string
  language: string
  created_at: string
  is_active: boolean
  email_verified: boolean
}

interface LatestContribution {
  id: string
  amount: string
  created_at: string
  case_id: string | null
  status: string
  cases?: {
    title: string
    status: string
  } | null
}

interface ProfileStats {
  totalContributions: number
  totalAmount: number
  activeCases: number
  completedCases: number
  averageContribution: number
  lastContribution: string | null
  latestContribution: LatestContribution | null
}

export default function ProfilePage() {
  const t = useTranslations('profile')
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<ProfileStats>({
    totalContributions: 0,
    totalAmount: 0,
    activeCases: 0,
    completedCases: 0,
    averageContribution: 0,
    lastContribution: null,
    latestContribution: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchUserProfile()
  }, [])

  // Refresh data when component becomes visible (e.g., when returning from edit page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUserProfile()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Refresh data when pathname changes (e.g., when returning from edit page)
  useEffect(() => {
    fetchUserProfile()
  }, [pathname])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      
      // Get current user for auth check
      const supabase = createClient()
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        router.push(`/${params.locale}/auth/login`)
        return
      }

      // Fetch user profile and stats from API
      const response = await fetch('/api/profile/stats')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push(`/${params.locale}/auth/login`)
          return
        }
        throw new Error(`Failed to fetch profile: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.user) {
        setUser(data.user)
      }
      
      if (data.stats) {
        setStats({
          totalContributions: data.stats.totalContributions || 0,
          totalAmount: data.stats.totalAmount || 0,
          activeCases: data.stats.activeCases || 0,
          completedCases: data.stats.completedCases || 0,
          averageContribution: data.stats.averageContribution || 0,
          lastContribution: data.stats.lastContribution || null,
          latestContribution: data.stats.latestContribution || null
        })
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'U'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const getRoleLabel = (role: string) => {
    const roleLabels = {
      donor: 'Donor',
      sponsor: 'Sponsor',
      admin: 'Administrator'
    }
    return roleLabels[role as keyof typeof roleLabels] || role
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-ma3ana-100 text-ma3ana-800 border-ma3ana-200'
      case 'sponsor': return 'bg-meen-100 text-meen-800 border-meen-200'
      default: return 'bg-meen-100 text-meen-800 border-meen-200'
    }
  }

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'Never'
    
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return 'Yesterday'
    return formatDate(dateString)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-meen'
      case 'pending':
        return 'text-ma3ana'
      case 'rejected':
        return 'text-ma3ana'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved'
      case 'pending':
        return 'Pending'
      case 'rejected':
        return 'Rejected'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen py-8" style={{ background: theme.gradients.brandSubtle }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-96 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-48 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen py-8" style={{ background: theme.gradients.brandSubtle }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-ma3ana mx-auto mb-4" />
                <p className="text-ma3ana mb-4">{error || 'User not found'}</p>
                <Button onClick={fetchUserProfile} className="bg-gradient-to-r from-blue-500 to-indigo-600">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {t('title')}
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">
                    {t('description')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/${params.locale}/profile/edit`)}
                className="border-2 border-gray-200 hover:border-meen hover:bg-meen-50 transition-all duration-200"
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('editProfile')}
              </Button>
              <Button 
                variant="outline"
                className="border-2 border-gray-200 hover:border-meen hover:bg-meen-50 transition-all duration-200"
              >
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Overview Card */}
            <Card className="border-2 border-blue-50 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
              <CardHeader className="pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                                              <AvatarImage src={user.profile_image || undefined} alt="Profile" />
                      <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                        {getInitials(user.first_name, user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {(() => {

                            if (user.first_name && user.last_name) {
                              return `${user.first_name} ${user.last_name}`
                            } else if (user.first_name || user.last_name) {
                              return `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            } else {
                              return 'User'
                            }
                          })()}
                        </h2>
                        <Badge variant="outline" className={`${getRoleColor(user.role)} font-semibold px-3 py-1`}>
                          {getRoleLabel(user.role)}
                        </Badge>
                        {user.email_verified && (
                          <Badge variant="outline" className="bg-meen-100 text-meen-800 border-meen-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Member since {formatDate(user.created_at)}</span>
                        </div>
                      </div>
                      
                      {(!user.first_name || !user.last_name) && (
                        <div className="mt-3 p-3 bg-ma3ana-50 border border-ma3ana-200 rounded-lg">
                          <div className="flex items-center gap-2 text-ma3ana-800">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Complete your profile by adding your name in the edit profile section
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: brandColors.ma3ana[100] }}>
                      <Heart className="h-5 w-5" style={{ color: brandColors.ma3ana[600] }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Contributions</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalContributions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: brandColors.meen[100] }}>
                      <DollarSign className="h-5 w-5" style={{ color: brandColors.meen[600] }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">
                        {formatAmount(stats.totalAmount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ background: theme.gradients.brandSubtle }}>
                      <Target className="h-5 w-5" style={{ color: brandColors.meen[600] }} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active Cases</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.activeCases}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Award className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.completedCases}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Tabs */}
            <Card className="border-2 border-blue-50 bg-gradient-to-br from-white to-blue-50 shadow-lg overflow-hidden">
              <div className="w-full h-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600"></div>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="pb-4">
                  <TabsList className="grid w-full grid-cols-3 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                    <TabsTrigger 
                      value="overview" 
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                    >
                      <Activity className="h-4 w-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="contributions" 
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                    >
                      <History className="h-4 w-4" />
                      Contributions
                    </TabsTrigger>
                    <TabsTrigger 
                      value="settings" 
                      className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent>
                  <TabsContent value="overview" className="space-y-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                        <User className="h-5 w-5 text-blue-600" />
                        Personal Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm font-medium text-gray-900">{user.email}</p>
                          </div>
                        </div>

                        {user.phone && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Phone</p>
                              <p className="text-sm font-medium text-gray-900">{user.phone}</p>
                            </div>
                          </div>
                        )}

                        {user.address && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg md:col-span-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-xs text-gray-500">Address</p>
                              <p className="text-sm font-medium text-gray-900">{user.address}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Member Since</p>
                            <p className="text-sm font-medium text-gray-900">{formatDate(user.created_at)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Language</p>
                            <p className="text-sm font-medium text-gray-900 capitalize">{user.language}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Role Information */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                          <Shield className="h-5 w-5 text-purple-600" />
                          Role & Permissions
                        </h3>
                        <Link href="/profile/role">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                      </div>
                      <UserRoleInfo showDetails={false} />
                    </div>

                    {/* Recent Activity */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                        <Activity className="h-5 w-5 text-orange-600" />
                        Recent Activity
                      </h3>
                      <div className="space-y-3">
                        {stats.latestContribution ? (
                          <div className="flex items-start gap-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                            <div className="flex-shrink-0 w-3 h-3 rounded-full mt-1.5" style={{ backgroundColor: brandColors.meen[500] }}></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Heart className="h-4 w-4 text-meen" />
                                  <span className="font-medium text-gray-800">Latest Contribution</span>
                                </div>
                                <span className="text-sm text-gray-500">{getTimeAgo(stats.latestContribution.created_at)}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Made a contribution of {formatAmount(parseFloat(stats.latestContribution.amount))}
                                {stats.latestContribution.cases && (
                                  <span className="text-gray-500"> to </span>
                                )}
                                {stats.latestContribution.cases && (
                                  <button
                                    onClick={() => router.push(`/${params.locale}/cases/${stats.latestContribution?.case_id}`)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                                  >
                                    {(stats.latestContribution.cases as any)?.title_en || (stats.latestContribution.cases as any)?.title_ar || stats.latestContribution.cases?.title || 'Untitled Case'}
                                  </button>
                                )}
                              </p>
                              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                  Status: <span className={`font-medium ${getStatusColor(stats.latestContribution.status)}`}>
                                    {getStatusText(stats.latestContribution.status)}
                                  </span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                  Transaction ID: <span className="font-mono text-gray-600">{stats.latestContribution.id}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Heart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>No recent activity</p>
                            <p className="text-sm text-gray-400 mt-2">Start contributing to see your activity here</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="contributions">
                    <ContributionHistory />
                  </TabsContent>

                  <TabsContent value="settings">
                    <div className="space-y-6">
                      <div className="text-center py-8">
                        <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Settings coming soon</p>
                        <p className="text-sm text-gray-400 mt-2">
                          Account settings and preferences will be available here
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Latest Contribution</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {stats.latestContribution ? formatAmount(parseFloat(stats.latestContribution.amount)) : 'None'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Last Contribution</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {stats.latestContribution ? getTimeAgo(stats.latestContribution.created_at) : 'Never'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Account Status</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-2 border-blue-50 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Target className="h-5 w-5 text-blue-600" />
                  Quick Actions
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your account and contributions
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => router.push(`/${params.locale}/profile/edit`)}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 justify-start px-4"
                >
                  <Edit className="h-4 w-4 mr-3" />
                  Edit Profile
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full h-11 text-gray-700 hover:text-green-600 hover:bg-green-50 border border-gray-200 hover:border-green-200 transition-all duration-200 group justify-start px-4"
                >
                  <Download className="h-4 w-4 mr-3 text-gray-500 group-hover:text-green-600 transition-colors" />
                  <span className="font-medium">Export Data</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full h-11 text-gray-700 hover:text-purple-600 hover:bg-purple-50 border border-gray-200 hover:border-purple-200 transition-all duration-200 group justify-start px-4"
                >
                  <Bell className="h-4 w-4 mr-3 text-gray-500 group-hover:text-purple-600 transition-colors" />
                  <span className="font-medium">Notifications</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 