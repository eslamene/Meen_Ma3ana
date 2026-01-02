'use client'

import React, { useState, useEffect } from 'react'
import StandardModal, { StandardFormField } from '@/components/ui/standard-modal'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { defaultLogger as logger } from '@/lib/logger'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { normalizePhoneNumber } from '@/lib/utils/phone'
import { Sparkles, Loader2, Tag, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AddUserModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  availableRoles?: Array<{ id: string; name: string; display_name: string; description: string; is_system: boolean }>
}

export function AddUserModal({ open, onClose, onSuccess, availableRoles = [] }: AddUserModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [notesTagsExpanded, setNotesTagsExpanded] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generatingEmail, setGeneratingEmail] = useState(false)

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setEmail('')
      setPassword('')
      setFirstName('')
      setLastName('')
      setPhone('')
      setNotes('')
      setTags([])
      setTagInput('')
      setNotesTagsExpanded(false)
      setIsEditingNotes(false)
      setSelectedRoleIds([])
      setErrors({})
    }
  }, [open])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Invalid email format'
    }

    // Password is optional - if not provided, user will get password reset email
    if (password && password.trim() && password.trim().length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)

      // Normalize phone number if provided
      let normalizedPhone: string | null = null
      if (phone && phone.trim()) {
        normalizedPhone = normalizePhoneNumber(phone.trim(), '+20')
      }

      const response = await safeFetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim() || undefined, // Only send if provided
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          phone: normalizedPhone || undefined,
          notes: notes.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
          role_ids: selectedRoleIds.length > 0 ? selectedRoleIds : undefined
        })
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to create user')
      }

      toast.success('Success', {
        description: response.data?.message || 'User created successfully'
      })

      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Error creating user:', { error })
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to create user'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId)
      } else {
        return [...prev, roleId]
      }
    })
  }

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleGenerateEmail = async () => {
    try {
      setGeneratingEmail(true)
      
      // Build URL with phone parameter if phone is provided
      let url = '/api/admin/users/next-contributor-email'
      if (phone && phone.trim()) {
        url += `?phone=${encodeURIComponent(phone.trim())}`
      }

      const response = await safeFetch(url, {
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to generate email')
      }

      if (response.data?.email) {
        setEmail(response.data.email)
        // Clear any email errors
        if (errors.email) {
          setErrors(prev => ({ ...prev, email: '' }))
        }
        
        const emailType = response.data.type === 'phone' ? 'phone-based' : 'contributor'
        toast.success('Email generated', {
          description: `Generated ${emailType} email: ${response.data.email}`
        })
      }
    } catch (error) {
      logger.error('Error generating email:', { error })
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to generate email'
      })
    } finally {
      setGeneratingEmail(false)
    }
  }

  return (
    <StandardModal
      open={open}
      onOpenChange={onClose}
      title="Add New User"
      description="Create a new user account. If no password is provided, a password reset email will be sent."
      sections={[
        {
          title: 'Basic Information',
          children: (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StandardFormField label="Email" required error={errors.email}>
                  <div className="relative">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (errors.email) {
                          setErrors(prev => ({ ...prev, email: '' }))
                        }
                      }}
                      placeholder="user@example.com"
                      className="h-10 pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateEmail}
                      disabled={generatingEmail}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-indigo-50"
                      title={phone && phone.trim() 
                        ? "Generate email from phone number (phone@ma3ana.org)" 
                        : "Generate contributor email (contributor####@ma3ana.org)"}
                    >
                      {generatingEmail ? (
                        <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                      )}
                    </Button>
                  </div>
                </StandardFormField>

                <StandardFormField 
                  label="Password" 
                  description="Optional. If left empty, a password reset email will be sent."
                  error={errors.password}
                >
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) {
                        setErrors(prev => ({ ...prev, password: '' }))
                      }
                    }}
                    placeholder="Leave empty to send reset email"
                    className="h-10"
                  />
                </StandardFormField>

                <StandardFormField label="First Name">
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="h-10"
                  />
                </StandardFormField>

                <StandardFormField label="Last Name">
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="h-10"
                  />
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
                    {notes || tags.length > 0 ? (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {[notes && 'Note', tags.length > 0 && `${tags.length} tag${tags.length > 1 ? 's' : ''}`].filter(Boolean).join(', ')}
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
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[60px]">
                        {tags.map((tag, index) => (
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
                    {tags.length === 0 && (
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
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
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
                      {notes ? (
                        <p className="text-gray-700 whitespace-pre-wrap">{notes}</p>
                      ) : (
                        <p className="text-gray-400 italic">Click to add notes...</p>
                      )}
                    </div>
                  )}
                </StandardFormField>
              </CollapsibleContent>
            </Collapsible>

              <StandardFormField label="Phone" description="Egyptian phone number (e.g., 01012345678)">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    // Remove all spaces from phone number
                    const cleaned = e.target.value.replace(/\s/g, '')
                    setPhone(cleaned)
                  }}
                  placeholder="01012345678"
                  className="h-10"
                />
              </StandardFormField>
            </>
          )
        },
        ...(availableRoles.length > 0 ? [{
          title: 'Initial Roles',
          children: (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Select roles to assign to this user. You can modify roles later.
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {availableRoles.map(role => (
                  <div
                    key={role.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRoleToggle(role.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{role.display_name}</div>
                      {role.description && (
                        <div className="text-xs text-gray-500">{role.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }] : [])
      ]}
      primaryAction={{
        label: 'Create User',
        onClick: handleSave,
        loading: saving
      }}
      secondaryAction={{
        label: 'Cancel',
        onClick: onClose
      }}
    />
  )
}

