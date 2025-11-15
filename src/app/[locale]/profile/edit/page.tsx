'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Save, 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Camera,
  CheckCircle,
  AlertCircle,
  Shield,
  Globe,
  Edit
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EditPageHeader, EditPageFooter } from '@/components/crud'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'

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

interface FormData {
  firstName: string
  lastName: string
  phone: string
  address: string
}

export default function EditProfilePage() {
  const t = useTranslations('profile')
  const router = useRouter()
  const params = useParams()
  const { containerVariant } = useLayout()
  const locale = params.locale as string
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
  })
  const [errors, setErrors] = useState<Partial<FormData>>({})

  const supabase = createClient()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        router.push(`/${params.locale}/auth/login`)
        return
      }

      // Fetch profile via API
      const response = await fetch('/api/profile')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push(`/${params.locale}/auth/login`)
          return
        }
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      const profile = data.user

      // Map API response to UserProfile interface
      // We need to fetch full profile from stats API for display purposes
      const statsResponse = await fetch('/api/profile/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setUser(statsData.user)
      } else {
        // Fallback: create minimal user object from profile API
        setUser({
          id: profile.id,
          email: authUser.email || '',
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          address: profile.address,
          profile_image: profile.profile_image,
          role: 'donor', // Default, will be updated if stats API works
          language: profile.language || 'en',
          created_at: new Date().toISOString(),
          is_active: true,
          email_verified: authUser.email_confirmed_at !== null,
        })
      }

      setFormData({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
      })
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('validation.firstNameRequired')
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('validation.lastNameRequired')
    }

    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone)) {
      newErrors.phone = t('validation.phoneInvalid')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!user || !validateForm()) return

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Update profile via API
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const data = await response.json()
      const updatedProfile = data.user

      setSuccess(t('profileUpdatedSuccessfully'))
      
      // Update local user state
      setUser(prev => prev ? {
        ...prev,
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        phone: updatedProfile.phone,
        address: updatedProfile.address,
      } : null)

      // Redirect back to profile after a short delay
      setTimeout(() => {
        router.push(`/${params.locale}/profile`)
      }, 1500)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err instanceof Error ? err.message : t('profileUpdateError'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push(`/${params.locale}/profile`)
  }

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0) || ''
    const last = lastName?.charAt(0) || ''
    return (first + last).toUpperCase() || 'U'
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200'
      case 'sponsor': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getRoleLabel = (role: string) => {
    const roleLabels = {
      donor: 'Donor',
      sponsor: 'Sponsor',
      admin: 'Administrator'
    }
    return roleLabels[role as keyof typeof roleLabels] || role
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-500 mb-4">{error || 'User not found'}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
        {/* Header */}
        <EditPageHeader
          backUrl={`/${locale}/profile`}
          icon={Edit}
          title={t('editProfile') || 'Edit Profile'}
          description="Update your personal information and preferences"
          itemName={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : undefined}
          backLabel={t('back') || 'Back'}
        />

        {/* Success/Error Messages */}
        {success && (
          <Card className="mb-6 bg-green-50 border-green-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium">{success}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mb-6 bg-red-50 border-red-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Profile Overview Card */}
            <Card className="border-2 border-blue-50 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                                        <AvatarImage src={user.profile_image || undefined} alt="Profile" />
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                      {getInitials(user.first_name, user.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                                      <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {user.first_name && user.last_name 
                            ? `${user.first_name} ${user.last_name}`
                            : user.first_name || user.last_name
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : 'User'
                          }
                        </h2>
                        <Badge variant="outline" className={`${getRoleColor(user.role)} font-semibold px-3 py-1 text-sm`}>
                          {getRoleLabel(user.role)}
                        </Badge>
                        {user.email_verified && (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 px-3 py-1 text-sm">
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
                      </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Edit Form */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg overflow-hidden">
              <CardHeader className="pb-4 border-b border-gray-100">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <User className="h-5 w-5 text-blue-600" />
                  Personal Information
                </CardTitle>
                <CardDescription className="text-gray-600 font-medium mt-2">
                  Update your personal details and contact information
                </CardDescription>
                {(!user.first_name || !user.last_name) && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800">
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Please add your first and last name to complete your profile
                      </span>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      {t('firstName')} *
                    </label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder={t('firstNamePlaceholder')}
                      className={`border-2 border-gray-200 focus:border-blue-500 h-11 ${
                        errors.firstName ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      {t('lastName')} *
                    </label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder={t('lastNamePlaceholder')}
                      className={`border-2 border-gray-200 focus:border-blue-500 h-11 ${
                        errors.lastName ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.lastName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-blue-600" />
                      {t('phone')}
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder={t('phonePlaceholder')}
                      className={`border-2 border-gray-200 focus:border-blue-500 h-11 ${
                        errors.phone ? 'border-red-500' : ''
                      }`}
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      {t('email')}
                    </label>
                    <Input
                      type="email"
                      value={user.email}
                      disabled
                      className="bg-gray-100 border-2 border-gray-200 cursor-not-allowed h-11"
                    />
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {t('emailCannotBeChanged')}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      {t('address')}
                    </label>
                    <Textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder={t('addressPlaceholder')}
                      rows={3}
                      className="border-2 border-gray-200 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 lg:flex-shrink-0 space-y-6">
            {/* Account Info */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">Account Info</CardTitle>
                </div>
                <CardDescription className="text-gray-600 font-medium mt-2">
                  Your account details and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Email</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{user.email}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Role</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{getRoleLabel(user.role)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Language</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800 capitalize">{user.language}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Footer */}
        <EditPageFooter
          primaryAction={{
            label: saving ? (t('saving') || 'Saving...') : (t('saveChanges') || 'Save Changes'),
            onClick: handleSave,
            disabled: saving,
            loading: saving,
            icon: <Save className="h-4 w-4 mr-2" />
          }}
          secondaryActions={[
            {
              label: t('cancel') || 'Cancel',
              onClick: handleCancel,
              variant: 'outline',
              icon: <X className="h-4 w-4 mr-2" />
            }
          ]}
        />
      </Container>
    </div>
  )
} 