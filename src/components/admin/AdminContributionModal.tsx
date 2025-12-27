'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import StandardModal, { StandardFormField } from '@/components/ui/standard-modal'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { defaultLogger as logger } from '@/lib/logger'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { AddUserModal } from './AddUserModal'
import { UserPlus, Search, User, Upload, X, FileText } from 'lucide-react'

interface PaymentMethod {
  id: string
  code: string
  name_en?: string
  name_ar?: string
  name?: string
  description?: string
  is_active: boolean
}

interface DonorUser {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  display_name?: string
}

interface AdminContributionModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  caseId: string
  caseTitle?: string
}

export function AdminContributionModal({ 
  open, 
  onClose, 
  onSuccess, 
  caseId,
  caseTitle 
}: AdminContributionModalProps) {
  const [donorId, setDonorId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [proofOfPayment, setProofOfPayment] = useState<string>('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // User selection state
  const [donorSearchTerm, setDonorSearchTerm] = useState('')
  const [donors, setDonors] = useState<DonorUser[]>([])
  const [loadingDonors, setLoadingDonors] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [filteredDonors, setFilteredDonors] = useState<DonorUser[]>([])

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true)

  // Fetch donors with donor role
  const fetchDonors = useCallback(async () => {
    try {
      setLoadingDonors(true)
      // Fetch users with donor role filter
      const response = await safeFetch('/api/admin/users?role=donor&limit=200')
      
      if (response.ok) {
        const users = response.data?.users || []
        // Filter to only users with donor role
        const donorUsers = users.filter((user: DonorUser & { roles?: Array<{ name: string }> }) => {
          if (!user.roles || user.roles.length === 0) return false
          return user.roles.some((role: { name: string }) => role.name === 'donor')
        })
        setDonors(donorUsers)
        setFilteredDonors(donorUsers)
      } else {
        logger.error('Failed to fetch donors:', response.error)
      }
    } catch (error) {
      logger.error('Error fetching donors:', { error })
    } finally {
      setLoadingDonors(false)
    }
  }, [])

  // Fetch payment methods
  const fetchPaymentMethods = useCallback(async () => {
    try {
      setLoadingPaymentMethods(true)
      const response = await safeFetch('/api/payment-methods')
      
      if (response.ok) {
        setPaymentMethods(response.data?.paymentMethods || [])
      } else {
        logger.error('Failed to fetch payment methods:', response.error)
      }
    } catch (error) {
      logger.error('Error fetching payment methods:', { error })
    } finally {
      setLoadingPaymentMethods(false)
    }
  }, [])

  // Filter donors based on search term
  useEffect(() => {
    if (!donorSearchTerm.trim()) {
      setFilteredDonors(donors)
      return
    }

    const searchLower = donorSearchTerm.toLowerCase()
    const filtered = donors.filter(donor => 
      donor.email?.toLowerCase().includes(searchLower) ||
      donor.first_name?.toLowerCase().includes(searchLower) ||
      donor.last_name?.toLowerCase().includes(searchLower) ||
      donor.display_name?.toLowerCase().includes(searchLower)
    )
    setFilteredDonors(filtered)
  }, [donorSearchTerm, donors])

  // Fetch data when modal opens
  useEffect(() => {
    if (open) {
      fetchDonors()
      fetchPaymentMethods()
    }
  }, [open, fetchDonors, fetchPaymentMethods])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setDonorId('')
      setAmount('')
      setPaymentMethod('')
      setNotes('')
      setAnonymous(false)
      setProofOfPayment('')
      setProofFile(null)
      setUploadProgress(0)
      setDonorSearchTerm('')
      setErrors({})
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [open])

  // File upload handlers
  const sanitizeFileName = (name: string): string => {
    const lastDot = name.lastIndexOf('.')
    const ext = lastDot > -1 ? name.slice(lastDot + 1).toLowerCase() : ''
    const base = lastDot > -1 ? name.slice(0, lastDot) : name
    const ascii = base
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/[^a-zA-Z0-9._-]+/g, '-') // non-safe -> dash
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .toLowerCase()
    return ext ? `${ascii}.${ext}` : ascii
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid File Type', { 
          description: 'Please upload a JPEG, PNG, WebP image, or PDF file' 
        })
        return
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File Too Large', { 
          description: 'File size must be less than 5MB' 
        })
        return
      }

      setProofFile(file)
      setProofOfPayment('') // Clear URL if file is selected
    }
  }

  const removeFile = () => {
    setProofFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file: File): Promise<string> => {
    const safeName = sanitizeFileName(file.name)
    const fileName = `payment-proofs/${caseId}-${Date.now()}-${safeName}`
    
    // Create FormData for file upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileName', fileName)
    formData.append('bucket', 'contributions')
    
    // Upload via server-side API
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Failed to upload file: ${errorData.error || 'Upload failed'}`)
    }

    const { url } = await response.json()
    return url
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!donorId) {
      newErrors.donorId = 'Please select a donor'
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    if (!paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required'
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
      let finalProofUrl = proofOfPayment.trim() || undefined

      // Upload file if provided
      if (proofFile) {
        try {
          setUploadingProof(true)
          setUploadProgress(50)
          finalProofUrl = await uploadFile(proofFile)
          setUploadProgress(100)
        } catch (uploadError) {
          logger.error('Error uploading proof file:', { error: uploadError })
          toast.error('Upload Failed', {
            description: uploadError instanceof Error ? uploadError.message : 'Failed to upload proof file'
          })
          return
        } finally {
          setUploadingProof(false)
          setUploadProgress(0)
        }
      }

      const response = await safeFetch('/api/admin/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          caseId,
          donorId,
          amount: parseFloat(amount),
          paymentMethod,
          notes: notes.trim() || undefined,
          anonymous,
          proofOfPayment: finalProofUrl
        })
      })

      if (!response.ok) {
        throw new Error(response.error || 'Failed to create contribution')
      }

      toast.success('Success', {
        description: response.data?.message || 'Contribution created and approved successfully'
      })

      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Error creating contribution:', { error })
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to create contribution'
      })
    } finally {
      setSaving(false)
      setUploadingProof(false)
      setUploadProgress(0)
    }
  }

  const handleUserCreated = () => {
    // Refresh donors list after creating new user
    fetchDonors()
    setShowAddUserModal(false)
    toast.success('User created', { description: 'Please select the newly created user' })
  }

  const getDonorDisplayName = (donor: DonorUser) => {
    if (donor.first_name || donor.last_name) {
      return `${donor.first_name || ''} ${donor.last_name || ''}`.trim()
    }
    return donor.display_name || donor.email
  }

  return (
    <>
      <StandardModal
        open={open}
        onOpenChange={onClose}
        title="Add Contribution"
        description={`Add an already paid contribution${caseTitle ? ` for "${caseTitle}"` : ''}. The contribution will be automatically approved.`}
        sections={[
          {
            title: 'Donor Selection',
            children: (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <StandardFormField 
                    label="Select Donor" 
                    required
                    error={errors.donorId}
                    className="flex-1"
                  >
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by email or name..."
                          value={donorSearchTerm}
                          onChange={(e) => setDonorSearchTerm(e.target.value)}
                          className="pl-10 h-10"
                        />
                      </div>
                      {donorSearchTerm && (
                        <Select value={donorId} onValueChange={setDonorId}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select a donor" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {loadingDonors ? (
                              <SelectItem value="loading" disabled>Loading donors...</SelectItem>
                            ) : filteredDonors.length === 0 ? (
                              <SelectItem value="no-results" disabled>No donors found</SelectItem>
                            ) : (
                              filteredDonors.map(donor => (
                                <SelectItem key={donor.id} value={donor.id}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>{getDonorDisplayName(donor)}</span>
                                    <span className="text-xs text-gray-500">({donor.email})</span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      )}
                      {!donorSearchTerm && (
                        <Select value={donorId} onValueChange={setDonorId}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select a donor" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {loadingDonors ? (
                              <SelectItem value="loading" disabled>Loading donors...</SelectItem>
                            ) : donors.length === 0 ? (
                              <SelectItem value="no-donors" disabled>No donors available</SelectItem>
                            ) : (
                              donors.slice(0, 50).map(donor => (
                                <SelectItem key={donor.id} value={donor.id}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>{getDonorDisplayName(donor)}</span>
                                    <span className="text-xs text-gray-500">({donor.email})</span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </StandardFormField>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddUserModal(true)}
                    className="h-10 whitespace-nowrap"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    New Donor
                  </Button>
                </div>
                {donorId && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900">
                      Selected: <strong>{getDonorDisplayName(donors.find(d => d.id === donorId) || { id: donorId, email: '' })}</strong>
                    </p>
                  </div>
                )}
              </div>
            )
          },
          {
            title: 'Contribution Details',
            children: (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StandardFormField label="Amount (EGP)" required error={errors.amount}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value)
                      if (errors.amount) {
                        setErrors(prev => ({ ...prev, amount: '' }))
                      }
                    }}
                    placeholder="0.00"
                    className="h-10"
                  />
                </StandardFormField>

                <StandardFormField label="Payment Method" required error={errors.paymentMethod}>
                  {loadingPaymentMethods ? (
                    <Input disabled placeholder="Loading..." className="h-10" />
                  ) : (
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map(method => (
                          <SelectItem key={method.id} value={method.code || method.id}>
                            {method.name_en || method.name_ar || method.name || method.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </StandardFormField>

                <StandardFormField 
                  label="Proof of Payment" 
                  description="Optional: Upload a file or provide a URL"
                  className="md:col-span-2"
                >
                  <div className="space-y-3">
                    {/* File Upload */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600">Upload File</Label>
                      {proofFile ? (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="flex-1 text-sm text-blue-900 truncate">{proofFile.name}</span>
                          <span className="text-xs text-blue-600">
                            {(proofFile.size / 1024).toFixed(1)} KB
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removeFile}
                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="proof-upload"
                          />
                          <Label
                            htmlFor="proof-upload"
                            className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                          >
                            <Upload className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Click to upload or drag and drop</span>
                          </Label>
                          <p className="text-xs text-gray-500 mt-1">
                            JPEG, PNG, WebP, or PDF (max 5MB)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* URL Input */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600">Or Enter URL</Label>
                      <Input
                        type="url"
                        value={proofOfPayment}
                        onChange={(e) => {
                          setProofOfPayment(e.target.value)
                          if (proofFile) {
                            removeFile() // Clear file if URL is entered
                          }
                        }}
                        placeholder="https://..."
                        className="h-10"
                        disabled={!!proofFile}
                      />
                    </div>
                  </div>
                </StandardFormField>

                <StandardFormField label="Notes" description="Optional: Additional notes about this contribution">
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes..."
                    className="h-10"
                  />
                </StandardFormField>
              </div>
            )
          },
          {
            title: 'Options',
            children: (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="space-y-0.5">
                  <Label htmlFor="anonymous" className="text-sm font-medium cursor-pointer">
                    Anonymous Contribution
                  </Label>
                  <p className="text-xs text-gray-500">
                    Hide donor name in public contribution list
                  </p>
                </div>
                <Switch
                  id="anonymous"
                  checked={anonymous}
                  onCheckedChange={setAnonymous}
                />
              </div>
            )
          }
        ]}
        primaryAction={{
          label: 'Create Contribution',
          onClick: handleSave,
          loading: saving || uploadingProof,
          disabled: uploadingProof
        }}
        secondaryAction={{
          label: 'Cancel',
          onClick: onClose
        }}
      />

      {/* Add User Modal */}
      <AddUserModal
        open={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSuccess={handleUserCreated}
        availableRoles={[]} // Will default to donor role in API
      />
    </>
  )
}

