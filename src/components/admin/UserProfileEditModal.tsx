'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, User, Mail, Phone, MapPin, Globe, Trash2, AlertTriangle, CheckCircle, XCircle, RefreshCw, X, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import StandardModal, { 
  StandardModalPreview, 
  StandardFormField, 
  StandardStatusToggle 
} from '@/components/ui/standard-modal'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import { defaultLogger as logger } from '@/lib/logger'
import { normalizePhoneNumber, extractCountryCode } from '@/lib/utils/phone'

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
  const [showEmailUpdateDialog, setShowEmailUpdateDialog] = useState(false)
  const [proposedEmail, setProposedEmail] = useState('')
  const [notesTagsExpanded, setNotesTagsExpanded] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    language: 'ar',
    is_active: true,
    email_verified: false,
    notes: '',
    tags: [] as string[]
  })
  const [tagInput, setTagInput] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)

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
        email_verified: false,
        notes: '',
        tags: []
      })
      setIsEditingNotes(false)
      setTagInput('')
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
        email_verified: data.user.email_verified ?? false,
        notes: data.user.notes || '',
        tags: Array.isArray(data.user.tags) ? data.user.tags : []
      })
      setTagInput('')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user profile'
      logger.error('Error fetching user:', { 
        error: errorMessage,
        userId 
      })
      toast.error('Error', {
        description: errorMessage,
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
          is_active: formData.is_active,
          notes: formData.notes.trim() || null,
          tags: formData.tags.length > 0 ? formData.tags : null
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user profile'
      logger.error('Error updating user:', { 
        error: errorMessage,
        userId 
      })
      toast.error('Error', {
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  const formatPhoneForEmail = (phone: string): string => {
    if (!phone) return ''
    
    // Remove all spaces first
    const cleanedPhone = phone.trim().replace(/\s/g, '')
    
    // Extract all digits from the phone number
    const digitsOnly = cleanedPhone.replace(/[^\d]/g, '')
    
    // For Egyptian numbers, we expect 12-13 digits total (+20 + 10-11 digit number)
    // Or 11 digits if already in local format (0 + 10 digits)
    let phoneForEmail: string
    
    if (cleanedPhone.startsWith('+20')) {
      // Egyptian number with +20 prefix: +201006332934
      // Extract everything after +20
      const afterCountryCode = cleanedPhone.substring(3) // Gets '1006332934'
      // Ensure it starts with 0
      phoneForEmail = afterCountryCode.startsWith('0') ? afterCountryCode : '0' + afterCountryCode
    } else if (cleanedPhone.startsWith('0020')) {
      // Egyptian number with 0020 prefix
      const afterCountryCode = cleanedPhone.substring(4)
      phoneForEmail = afterCountryCode.startsWith('0') ? afterCountryCode : '0' + afterCountryCode
    } else if (cleanedPhone.startsWith('0') && digitsOnly.length === 11) {
      // Already in local Egyptian format: 01006332934
      phoneForEmail = cleanedPhone
    } else if (digitsOnly.length >= 10) {
      // Extract from digits: for Egyptian, use last 11 digits (0 + 10 digits)
      // Or if we have 12-13 digits (country code + number), use last 11
      if (digitsOnly.length >= 12) {
        // Has country code: use last 11 digits (0 + 10 digit number)
        phoneForEmail = '0' + digitsOnly.slice(-10)
      } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
        // Already 11 digits starting with 0
        phoneForEmail = digitsOnly
      } else if (digitsOnly.length === 10) {
        // 10 digits: add 0 prefix
        phoneForEmail = '0' + digitsOnly
      } else {
        // Use all digits
        phoneForEmail = digitsOnly.startsWith('0') ? digitsOnly : '0' + digitsOnly
      }
    } else {
      // Fallback: use all digits
      phoneForEmail = digitsOnly || cleanedPhone
    }

    // Ensure minimum length
    if (!phoneForEmail || phoneForEmail.length < 4) {
      phoneForEmail = digitsOnly || cleanedPhone
    }

    return `${phoneForEmail}@ma3ana.org`
  }

  const handleUpdateEmailFromPhoneClick = () => {
    if (!formData.phone?.trim()) {
      toast.error('Error', {
        description: 'Phone number is required to update email'
      })
      return
    }

    // Generate proposed email and show confirmation dialog
    const email = formatPhoneForEmail(formData.phone)
    setProposedEmail(email)
    setShowEmailUpdateDialog(true)
  }

  const handleConfirmEmailUpdate = async () => {
    if (!userId || updatingEmail || !proposedEmail.trim()) {
      toast.error('Error', {
        description: 'Email is required'
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(proposedEmail.trim())) {
      toast.error('Error', {
        description: 'Invalid email format'
      })
      return
    }

    try {
      setUpdatingEmail(true)
      const response = await fetch(`/api/admin/users/${userId}/update-email-from-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: proposedEmail.trim()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update email')
      }

      const data = await response.json()
      
      toast.success('Success', {
        description: data.message || 'Email updated successfully'
      })

      // Close dialog and refresh user data
      setShowEmailUpdateDialog(false)
      setProposedEmail('')
      await fetchUser()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update email from phone'
      logger.error('Error updating email from phone:', { 
        error: errorMessage,
        userId,
        phone: formData.phone,
        proposedEmail
      })
      toast.error('Error', {
        description: errorMessage
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
        const errorData = await response.json()
        const errorMessage = errorData.message || errorData.error || 'Failed to delete user'
        
        // Check if it's a validation error (user has activities that cannot be removed)
        if (response.status === 400 && errorMessage.includes('related activities')) {
          // Show a more user-friendly error message
          toast.error('Cannot Delete User', {
            description: errorMessage,
            duration: 6000,
          })
        } else {
          throw new Error(errorMessage)
        }
        
        return
      }

      toast.success('Success', {
        description: 'User deleted successfully. Role assignments were automatically removed if present.'
      })

      setShowDeleteDialog(false)
      onSuccess()
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user'
      logger.error('Error deleting user:', { 
        error: errorMessage,
        userId 
      })
      toast.error('Error', {
        description: errorMessage,
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

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmed] })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) })
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
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
                        onClick={handleUpdateEmailFromPhoneClick}
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

                {/* Notes & Tags - Collapsible section */}
                <Collapsible open={notesTagsExpanded} onOpenChange={setNotesTagsExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between h-10 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        <span>Notes & Tags</span>
                        {formData.notes || formData.tags.length > 0 ? (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {[formData.notes && 'Note', formData.tags.length > 0 && `${formData.tags.length} tag${formData.tags.length > 1 ? 's' : ''}`].filter(Boolean).join(', ')}
                          </Badge>
                        ) : null}
                      </div>
                      {notesTagsExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    <StandardFormField 
                      label="Tags" 
                      description="Add tags to categorize this user (press Enter to add)"
                    >
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagInputKeyDown}
                            placeholder="Type a tag and press Enter"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddTag}
                            disabled={!tagInput.trim()}
                          >
                            <Tag className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                        {formData.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[60px]">
                            {formData.tags.map((tag, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="flex items-center gap-1.5 px-2.5 py-1 text-sm"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)}
                                  className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                                  aria-label={`Remove tag ${tag}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        {formData.tags.length === 0 && (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-500 text-center">
                            No tags added yet
                          </div>
                        )}
                      </div>
                    </StandardFormField>

                    <StandardFormField 
                      label="Notes" 
                      description="Admin notes (click to edit)"
                    >
                      {isEditingNotes ? (
                        <div className="space-y-2">
                          <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Add notes about this user..."
                            className="min-h-[80px] resize-y text-sm"
                            rows={3}
                            autoFocus
                            onBlur={() => setIsEditingNotes(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setIsEditingNotes(false)
                              }
                            }}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsEditingNotes(false)}
                              className="h-7 text-xs"
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => setIsEditingNotes(true)}
                          className="min-h-[40px] p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-text hover:bg-gray-100 transition-colors text-sm"
                        >
                          {formData.notes ? (
                            <p className="text-gray-700 whitespace-pre-wrap">{formData.notes}</p>
                          ) : (
                            <p className="text-gray-400 italic">Click to add notes...</p>
                          )}
                        </div>
                      )}
                    </StandardFormField>
                  </CollapsibleContent>
                </Collapsible>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StandardFormField label="Phone">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          // Remove all spaces from phone number
                          const cleaned = e.target.value.replace(/\s/g, '')
                          setFormData({ ...formData, phone: cleaned })
                        }}
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
                      This user has contributions. Users with any related activities (contributions, cases, role assignments, etc.) cannot be deleted to maintain data integrity.
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
        description={`Are you sure you want to delete ${user?.email}? This action cannot be undone. The user account will be permanently removed from the system. Users can only be deleted if they have no related activities (contributions, cases, role assignments, etc.).`}
        confirmText={deleting ? 'Deleting...' : 'Delete User'}
        cancelText="Cancel"
        variant="destructive"
        icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
        disabled={deleting}
        autoClose={false}
      />

      {/* Email Update Confirmation Dialog */}
      <Dialog open={showEmailUpdateDialog} onOpenChange={setShowEmailUpdateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Update Email from Phone
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <div>
                  Update email address based on phone number. You can edit the email before confirming.
                </div>
                <div className="text-xs text-muted-foreground">
                  Current phone: <strong>{formData.phone}</strong>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="proposed-email">New Email Address</Label>
              <Input
                id="proposed-email"
                type="email"
                value={proposedEmail}
                onChange={(e) => setProposedEmail(e.target.value)}
                placeholder="email@ma3ana.org"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                The email will be updated in both the user profile and authentication system.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailUpdateDialog(false)
                setProposedEmail('')
              }}
              disabled={updatingEmail}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmEmailUpdate}
              disabled={updatingEmail || !proposedEmail.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {updatingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Email'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

