'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, User, Mail, Phone, MapPin, Globe, Trash2, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import StandardModal, { 
  StandardModalPreview, 
  StandardFormField, 
  StandardStatusToggle 
} from '@/components/ui/standard-modal'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import { defaultLogger as logger } from '@/lib/logger'

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  address: string | null
  language: string
  is_active: boolean
  email_verified: boolean
  contribution_count?: number
}

interface UserProfileEditModalProps {
  open: boolean
  userId: string | null
  onClose: () => void
  onSuccess: () => void
}

export function UserProfileEditModal({ open, userId, onClose, onSuccess }: UserProfileEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatingEmail, setUpdatingEmail] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    language: 'ar',
    is_active: true,
    email_verified: false
  })

  useEffect(() => {
    if (open && userId) {
      fetchUser()
    } else {
      setUser(null)
      setFormData({
        first_name: '',
        last_name: '',
        phone: '',
        address: '',
        language: 'ar',
        is_active: true,
        email_verified: false
      })
    }
  }, [open, userId])

  const fetchUser = async () => {
    if (!userId) return

    try {
      setFetching(true)
      const response = await fetch(`/api/admin/users/${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch user')
      }

      const data = await response.json()
      setUser(data.user)
      setFormData({
        first_name: data.user.first_name || '',
        last_name: data.user.last_name || '',
        phone: data.user.phone || '',
        address: data.user.address || '',
        language: data.user.language || 'ar',
        is_active: data.user.is_active ?? true,
        email_verified: data.user.email_verified ?? false
      })
    } catch (error) {
      logger.error('Error fetching user:', { error: error })
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to load user profile',
      })
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      setLoading(true)

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: formData.first_name.trim() || null,
          last_name: formData.last_name.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          language: formData.language,
          is_active: formData.is_active
          // email_verified is read-only and synced from auth.users.email_confirmed_at
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }

      toast.success('Success', {
        description: 'User profile updated successfully'
      })

      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Error updating user:', { error: error })
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to update user profile',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatPhoneForEmail = (phone: string): string => {
    if (!phone) return ''
    let phoneForEmail = phone.trim().replace(/[\s\-\(\)]/g, '')
    
    // Remove country code if present (+20, 0020, 20)
    if (phoneForEmail.startsWith('+20')) {
      phoneForEmail = phoneForEmail.substring(3)
    } else if (phoneForEmail.startsWith('0020')) {
      phoneForEmail = phoneForEmail.substring(4)
    } else if (phoneForEmail.startsWith('20') && phoneForEmail.length > 10) {
      phoneForEmail = phoneForEmail.substring(2)
    }

    // Ensure it starts with 0 if it's a 10-digit number starting with 1
    if (phoneForEmail.length === 10 && phoneForEmail.startsWith('1')) {
      phoneForEmail = '0' + phoneForEmail
    }

    return `${phoneForEmail}@ma3ana.org`
  }

  const handleUpdateEmailFromPhone = async () => {
    if (!userId || updatingEmail || !formData.phone?.trim()) {
      toast.error('Error', {
        description: 'Phone number is required to update email'
      })
      return
    }

    try {
      setUpdatingEmail(true)
      const response = await fetch(`/api/admin/users/${userId}/update-email-from-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update email')
      }

      const data = await response.json()
      
      toast.success('Success', {
        description: data.message || 'Email updated successfully'
      })

      // Refresh user data to show updated email
      await fetchUser()
    } catch (error) {
      logger.error('Error updating email from phone:', { error: error })
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to update email from phone'
      })
    } finally {
      setUpdatingEmail(false)
    }
  }

  const handleDelete = async () => {
    if (!userId || deleting) return

    try {
      setDeleting(true)

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || error.error || 'Failed to delete user')
      }

      toast.success('Success', {
        description: 'User deleted successfully'
      })

      setShowDeleteDialog(false)
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Error deleting user:', { error: error })
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to delete user',
      })
    } finally {
      setDeleting(false)
    }
  }

  const getInitials = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase()
    }
    if (lastName) {
      return lastName.charAt(0).toUpperCase()
    }
    return email.charAt(0).toUpperCase()
  }

  const getUserDisplayName = () => {
    if (user?.first_name || user?.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user?.email?.split('@')[0] || 'User'
  }

  if (fetching) {
    return (
      <StandardModal
        open={open}
        onOpenChange={onClose}
        title="Edit User Profile"
        description="Loading user information..."
        primaryAction={{
          label: "Close",
          onClick: onClose,
        }}
        sections={[
          {
            title: "Loading",
            children: (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            )
          }
        ]}
      />
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <StandardModal
        open={open}
        onOpenChange={onClose}
        title="Edit User Profile"
        description={user.email ? `Update profile for ${user.email}` : 'Update user profile information'}
        preview={
          <StandardModalPreview>
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-indigo-200">
                <AvatarFallback className="text-base sm:text-lg font-bold bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                  {getInitials(user.first_name, user.last_name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                  {getUserDisplayName()}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 truncate mt-0.5">
                  {user.email}
                </div>
                {user.phone && (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {user.phone}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 items-end">
                <Badge 
                  variant={formData.is_active ? 'default' : 'secondary'}
                  className={formData.is_active 
                    ? 'bg-green-100 text-green-700 border-green-200' 
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                  }
                >
                  {formData.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Badge 
                  variant={formData.email_verified ? 'default' : 'secondary'}
                  className={formData.email_verified 
                    ? 'bg-blue-100 text-blue-700 border-blue-200' 
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                  }
                >
                  {formData.email_verified ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Unverified
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </StandardModalPreview>
        }
        sections={[
          {
            title: "Basic Information",
            children: (
              <div className="space-y-4">
                <StandardFormField 
                  label="Email" 
                  description={formData.phone?.trim() 
                    ? "User email address. Click 'Update from Phone' to set email based on phone number."
                    : "User email address. Add a phone number to enable email update."
                  }
                >
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={user.email}
                        disabled
                        className="pl-10 h-10 bg-gray-50"
                      />
                    </div>
                    {formData.phone?.trim() && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleUpdateEmailFromPhone}
                        disabled={updatingEmail}
                        className="whitespace-nowrap"
                        title={`Update email to ${formatPhoneForEmail(formData.phone)}`}
                      >
                        {updatingEmail ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Update from Phone
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </StandardFormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StandardFormField label="First Name">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="pl-10 h-10"
                        placeholder="First name"
                      />
                    </div>
                  </StandardFormField>

                  <StandardFormField label="Last Name">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="pl-10 h-10"
                        placeholder="Last name"
                      />
                    </div>
                  </StandardFormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StandardFormField label="Phone">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-10 h-10"
                        placeholder="Phone number"
                      />
                    </div>
                  </StandardFormField>

                  <StandardFormField label="Language">
                    <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                      <SelectTrigger className="h-10">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية (Arabic)</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </StandardFormField>
                </div>

                <StandardFormField label="Address">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="pl-10 h-10"
                      placeholder="Address"
                    />
                  </div>
                </StandardFormField>
              </div>
            )
          },
          {
            title: "Account Status",
            children: (
              <div className="space-y-4">
                <StandardStatusToggle
                  label="Active"
                  description={formData.is_active 
                    ? 'User account is active and can access the system' 
                    : 'User account is inactive and cannot access the system'}
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  id="is_active"
                />

                <StandardStatusToggle
                  label="Email Verified"
                  description={formData.email_verified 
                    ? 'User email has been verified' 
                    : 'User email has not been verified'}
                  checked={formData.email_verified}
                  onCheckedChange={() => {}} // Read-only
                  id="email_verified"
                  disabled={true}
                />
              </div>
            )
          },
          ...(user.contribution_count !== undefined ? [{
            title: "Account Statistics",
            children: (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Total Contributions</p>
                    <p className="text-xs text-gray-500 mt-0.5">Number of contributions made by this user</p>
                  </div>
                  <Badge variant="secondary" className="text-base font-semibold px-3 py-1">
                    {user.contribution_count}
                  </Badge>
                </div>
                {user.contribution_count > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      This user has contributions and cannot be deleted.
                    </p>
                  </div>
                )}
              </div>
            )
          }] : [])
        ]}
        primaryAction={{
          label: "Save Changes",
          onClick: () => {
            const fakeEvent = { preventDefault: () => {} } as React.FormEvent
            handleSubmit(fakeEvent)
          },
          loading: loading,
          disabled: loading || deleting
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: onClose,
          disabled: loading || deleting
        }}
        footer={
          <div className="px-4 sm:px-6 py-4 border-t bg-gray-50/50">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between items-center">
              <div>
                {(!user.contribution_count || user.contribution_count === 0) && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={loading || deleting}
                    className="w-full sm:w-auto"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  disabled={loading || deleting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={() => {
                    const fakeEvent = { preventDefault: () => {} } as React.FormEvent
                    handleSubmit(fakeEvent)
                  }} 
                  disabled={loading || deleting}
                  className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </div>
        }
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete User"
        description={`Are you sure you want to delete ${user?.email}? This action cannot be undone. The user account will be permanently removed from the system.${user && (!user.contribution_count || user.contribution_count === 0) ? ' This user has no contributions and can be safely deleted.' : ''}`}
        confirmText={deleting ? 'Deleting...' : 'Delete User'}
        cancelText="Cancel"
        variant="destructive"
        icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
        disabled={deleting}
        autoClose={false}
      />
    </>
  )
}

