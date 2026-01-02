'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, Users, AlertTriangle, ArrowRight, Trash2, Eye, CheckCircle, Shield, RefreshCw, Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import StandardModal, { 
  StandardModalPreview, 
  StandardFormField 
} from '@/components/ui/standard-modal'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

import { defaultLogger as logger } from '@/lib/logger'

interface User {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  contribution_count?: number
  phone?: string | null
  role?: string | null
  created_at?: string | null
  roles?: Array<{ name: string; display_name: string }>
}

interface AdvancedSearchFilters {
  role: string
  minContributions: string
  maxContributions: string
  sortBy: string
  sortOrder: string
  phone: string
}

interface MergePreview {
  source_user: User
  target_user: User
  records_to_migrate: Record<string, number>
  validation: {
    can_merge: boolean
    warnings: string[]
    errors: string[]
  }
}

interface MergeSummary {
  total_records_to_migrate: number
  tables_affected: string[]
  validation_passed: boolean
  has_warnings: boolean
}

interface AccountMergeModalProps {
  open: boolean
  sourceUserId: string | null
  onClose: () => void
  onSuccess: () => void
}

export function AccountMergeModal({ open, sourceUserId, onClose, onSuccess }: AccountMergeModalProps) {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [sourceUser, setSourceUser] = useState<User | null>(null)
  const [targetUserId, setTargetUserId] = useState('')
  const [targetUser, setTargetUser] = useState<User | null>(null)
  const [deleteSource, setDeleteSource] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<Array<{ id: string; name: string; display_name: string }>>([])
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFilters>({
    role: 'all',
    minContributions: '',
    maxContributions: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    phone: ''
  })
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [previewSummary, setPreviewSummary] = useState<MergeSummary | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [mergeId, setMergeId] = useState<string | null>(null)
  const [backupId, setBackupId] = useState<string | null>(null)

  useEffect(() => {
    if (open && sourceUserId) {
      fetchSourceUser()
    } else {
      resetForm()
    }
  }, [open, sourceUserId])

  const resetForm = () => {
    setSourceUser(null)
    setTargetUserId('')
    setTargetUser(null)
    setDeleteSource(false)
    setSearchTerm('')
    setSearchResults([])
    setPreview(null)
    setPreviewSummary(null)
    setShowPreview(false)
    setMergeId(null)
    setBackupId(null)
    setShowAdvancedSearch(false)
    setAdvancedFilters({
      role: 'all',
      minContributions: '',
      maxContributions: '',
      sortBy: 'created_at',
      sortOrder: 'desc',
      phone: ''
    })
  }

  // Fetch available roles for filter
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await safeFetch('/api/admin/roles')
        if (response.ok && response.data?.roles) {
          setAvailableRoles(response.data.roles || [])
        }
      } catch (error) {
        logger.error('Error fetching roles:', { error })
      }
    }
    if (open) {
      fetchRoles()
    }
  }, [open])

  const fetchSourceUser = async () => {
    if (!sourceUserId) return

    try {
      setFetching(true)
      const response = await safeFetch(`/api/admin/users/${sourceUserId}`)
      
      if (response.ok && response.data?.user) {
        setSourceUser(response.data.user)
      } else {
        // Handle different error scenarios
        let errorMessage = 'Failed to load source user'
        
        if (response.status === 404) {
          errorMessage = 'User not found'
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to view this user'
        } else if (response.status === 401) {
          errorMessage = 'Authentication required. Please log in again.'
        } else if (response.status === 0) {
          // Network error (CORS, offline, etc.)
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (response.error) {
          errorMessage = response.error
        }
        
        // Only log unexpected errors (not 404, 403, 401)
        if (response.status >= 500 || response.status === 0) {
          logger.error('Error fetching source user', {
            status: response.status,
            error: response.error,
            userId: sourceUserId
          })
        }
        
        toast.error('Error', { description: errorMessage })
      }
    } catch (error) {
      // This catch block should rarely be hit since safeFetch handles errors
      const errorMessage = error instanceof Error ? error.message : 'Failed to load source user'
      logger.error('Unexpected error fetching source user:', { error: error })
      toast.error('Error', { description: errorMessage })
    } finally {
      setFetching(false)
    }
  }

  const searchUsers = useCallback(async (query: string, filters: AdvancedSearchFilters) => {
    // Allow search with just filters even if query is empty
    const hasQuery = query.trim().length >= 2
    const hasFilters = filters.role !== 'all' || 
                      filters.minContributions || 
                      filters.maxContributions || 
                      filters.phone ||
                      filters.sortBy !== 'created_at' ||
                      filters.sortOrder !== 'desc'

    if (!hasQuery && !hasFilters) {
      setSearchResults([])
      return
    }

    try {
      setSearching(true)
      
      // Build query parameters
      const params = new URLSearchParams({
        page: '1',
        limit: '20', // Increased limit for better results
        ...(hasQuery && { search: query }),
        ...(filters.role && filters.role !== 'all' && { role: filters.role }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder })
      })

      const response = await safeFetch(`/api/admin/users?${params.toString()}`)
      
      if (response.ok && response.data?.users) {
        let users = (response.data.users || []) as User[]
        
        // Filter out source user
        users = users.filter((user: User) => user.id !== sourceUserId)
        
        // Apply client-side filters that aren't supported by API
        if (filters.minContributions) {
          const minContrib = parseInt(filters.minContributions)
          if (!isNaN(minContrib)) {
            users = users.filter((user: User) => 
              (user.contribution_count || 0) >= minContrib
            )
          }
        }
        
        if (filters.maxContributions) {
          const maxContrib = parseInt(filters.maxContributions)
          if (!isNaN(maxContrib)) {
            users = users.filter((user: User) => 
              (user.contribution_count || 0) <= maxContrib
            )
          }
        }
        
        if (filters.phone) {
          const phoneLower = filters.phone.toLowerCase()
          users = users.filter((user: User) => 
            user.phone?.toLowerCase().includes(phoneLower)
          )
        }
        
        // Limit results
        setSearchResults(users.slice(0, 20))
      } else {
        // Only log unexpected errors (not auth/permission errors)
        if (response.status >= 500 || response.status === 0) {
          logger.error('Error searching users', {
            status: response.status,
            error: response.error
          })
        }
        // Don't show toast for search errors to avoid noise
      }
    } catch (error) {
      // This catch block should rarely be hit since safeFetch handles errors
      logger.error('Unexpected error searching users:', { error: error })
    } finally {
      setSearching(false)
    }
  }, [sourceUserId])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchTerm, advancedFilters)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, advancedFilters, searchUsers])

  const handleSelectTarget = (user: User) => {
    setTargetUserId(user.id)
    setTargetUser(user)
    setSearchTerm(user.email)
    setSearchResults([])
    setPreview(null)
    setPreviewSummary(null)
    setShowPreview(false)
    // Auto-load preview when target is selected
    if (sourceUserId) {
      loadPreview(sourceUserId, user.id)
    }
  }

  const loadPreview = async (fromUserId: string, toUserId: string) => {
    try {
      setLoadingPreview(true)
      const response = await safeFetch(`/api/admin/users/merge/preview?fromUserId=${fromUserId}&toUserId=${toUserId}`)
      
      if (response.ok && response.data) {
        setPreview(response.data.preview)
        setPreviewSummary(response.data.summary)
      } else {
        logger.error('Failed to load preview:', { error: response.error })
        // Don't show error toast for preview failures, just log
      }
    } catch (error) {
      logger.error('Error loading preview:', { error: error })
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleMerge = async () => {
    if (!sourceUserId || !targetUserId) {
      toast.error('Error', { description: 'Please select a target user' })
      return
    }

    if (sourceUserId === targetUserId) {
      toast.error('Error', { description: 'Cannot merge user with itself' })
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/admin/users/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromUserId: sourceUserId,
          toUserId: targetUserId,
          deleteSource
        })
      })

      if (!response.ok) {
        const error = await response.json()
        
        // Log full error details for debugging
        logger.error('Merge error details:', { error: error })
        
        // Provide helpful error message if migration is required
        if (error.migration_required) {
          throw new Error(
            error.error + '\n\n' + 
            'Please run the database migration:\n' +
            'supabase/migrations/078_create_user_merge_backup_system.sql\n\n' +
            'Or contact your database administrator to apply this migration.'
          )
        }
        
        // Show detailed error if available
        const errorMessage = error.error || 'Failed to merge accounts'
        const details = error.details ? `\n\nDetails: ${error.details}` : ''
        const hint = error.hint ? `\n\nHint: ${error.hint}` : ''
        const errorCode = error.error_code ? `\n\nError Code: ${error.error_code}` : ''
        
        throw new Error(errorMessage + details + hint + errorCode)
      }

      const data = await response.json()

      // Store merge_id and backup_id for rollback reference
      if (data.merge_id) {
        setMergeId(data.merge_id)
        setBackupId(data.backup_id)
      }

      toast.success('Success', { 
        description: data.message || 'Accounts merged successfully',
        duration: 10000,
        action: data.merge_id ? {
          label: 'View Details',
          onClick: () => {
            // Show merge details
            logger.info('Merge details', { mergeId: data.merge_id, backupId: data.backup_id })
            toast.info('Merge Details', {
              description: `Merge ID: ${data.merge_id}\nSave this ID for rollback if needed.`,
              duration: 15000
            })
          }
        } : undefined
      })

      onSuccess()
      // Don't close immediately, show success state with merge_id
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      logger.error('Error merging accounts:', { error: error })
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to merge accounts' })
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (firstName: string | null | undefined, lastName: string | null | undefined, email: string) => {
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

  const getUserDisplayName = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user.email?.split('@')[0] || 'User'
  }

  if (fetching) {
    return (
      <StandardModal
        open={open}
        onOpenChange={onClose}
        title="Merge User Accounts"
        description="Loading source user information..."
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

  if (!sourceUser) {
    return null
  }

  return (
    <StandardModal
      open={open}
      onOpenChange={onClose}
      title="Merge User Accounts"
      description="Merge contributions and data from one account into another"
      maxWidth="3xl"
      sections={[
        {
          title: "Warning",
          children: (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 text-sm">
                This action will reassign all contributions, notifications, and related data from the source account to the target account. 
                A backup will be created automatically, and you can rollback if needed. However, this action should be performed carefully.
              </AlertDescription>
            </Alert>
          )
        },
        {
          title: "Accounts",
          children: (
            <div className="space-y-4">
              {/* Source Account */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Source Account (from)</p>
                <Card className="border-2 border-indigo-200 bg-indigo-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-indigo-300">
                        <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                          {getInitials(sourceUser.first_name, sourceUser.last_name, sourceUser.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{sourceUser.email}</p>
                        <p className="text-xs text-gray-600 truncate mt-0.5">
                          {getUserDisplayName(sourceUser)}
                        </p>
                        {sourceUser.contribution_count !== undefined && (
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {sourceUser.contribution_count} {sourceUser.contribution_count === 1 ? 'contribution' : 'contributions'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Arrow */}
              <div className="flex justify-center py-2">
                <div className="p-2 rounded-full bg-indigo-100">
                  <ArrowRight className="h-5 w-5 text-indigo-600" />
                </div>
              </div>

              {/* Target Account Search */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Target Account (to)</p>
                {!targetUser ? (
                  <>
                    <StandardFormField label="Search for target user" description="Search by email, name, phone, or use advanced filters">
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="target-search"
                            placeholder="Search by email, name, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={loading}
                            className="pl-10 h-10"
                          />
                        </div>

                        {/* Advanced Search Toggle */}
                        <Collapsible open={showAdvancedSearch} onOpenChange={setShowAdvancedSearch}>
                          <CollapsibleTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full justify-between h-9 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Filter className="h-3.5 w-3.5" />
                                <span>Advanced Search</span>
                              </div>
                              {showAdvancedSearch ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-3 pt-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              {/* Role Filter */}
                              <div className="space-y-1.5">
                                <Label htmlFor="filter-role" className="text-xs font-medium text-gray-700">
                                  Role
                                </Label>
                                <Select
                                  value={advancedFilters.role}
                                  onValueChange={(value) => 
                                    setAdvancedFilters(prev => ({ ...prev, role: value }))
                                  }
                                >
                                  <SelectTrigger id="filter-role" className="h-9 text-xs">
                                    <SelectValue placeholder="All roles" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All roles</SelectItem>
                                    <SelectItem value="no-roles">No roles</SelectItem>
                                    {availableRoles.map((role) => (
                                      <SelectItem key={role.id} value={role.name}>
                                        {role.display_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Phone Filter */}
                              <div className="space-y-1.5">
                                <Label htmlFor="filter-phone" className="text-xs font-medium text-gray-700">
                                  Phone Number
                                </Label>
                                <Input
                                  id="filter-phone"
                                  placeholder="Search by phone..."
                                  value={advancedFilters.phone}
                                  onChange={(e) => 
                                    setAdvancedFilters(prev => ({ ...prev, phone: e.target.value }))
                                  }
                                  className="h-9 text-xs"
                                />
                              </div>

                              {/* Contribution Count Range */}
                              <div className="space-y-1.5">
                                <Label htmlFor="filter-min-contrib" className="text-xs font-medium text-gray-700">
                                  Min Contributions
                                </Label>
                                <Input
                                  id="filter-min-contrib"
                                  type="number"
                                  placeholder="0"
                                  value={advancedFilters.minContributions}
                                  onChange={(e) => 
                                    setAdvancedFilters(prev => ({ ...prev, minContributions: e.target.value }))
                                  }
                                  className="h-9 text-xs"
                                  min="0"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label htmlFor="filter-max-contrib" className="text-xs font-medium text-gray-700">
                                  Max Contributions
                                </Label>
                                <Input
                                  id="filter-max-contrib"
                                  type="number"
                                  placeholder="No limit"
                                  value={advancedFilters.maxContributions}
                                  onChange={(e) => 
                                    setAdvancedFilters(prev => ({ ...prev, maxContributions: e.target.value }))
                                  }
                                  className="h-9 text-xs"
                                  min="0"
                                />
                              </div>

                              {/* Sort Options */}
                              <div className="space-y-1.5">
                                <Label htmlFor="filter-sort-by" className="text-xs font-medium text-gray-700">
                                  Sort By
                                </Label>
                                <Select
                                  value={advancedFilters.sortBy}
                                  onValueChange={(value) => 
                                    setAdvancedFilters(prev => ({ ...prev, sortBy: value }))
                                  }
                                >
                                  <SelectTrigger id="filter-sort-by" className="h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="created_at">Created Date</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="display_name">Name</SelectItem>
                                    <SelectItem value="last_sign_in_at">Last Sign In</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1.5">
                                <Label htmlFor="filter-sort-order" className="text-xs font-medium text-gray-700">
                                  Order
                                </Label>
                                <Select
                                  value={advancedFilters.sortOrder}
                                  onValueChange={(value) => 
                                    setAdvancedFilters(prev => ({ ...prev, sortOrder: value }))
                                  }
                                >
                                  <SelectTrigger id="filter-sort-order" className="h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="desc">Descending</SelectItem>
                                    <SelectItem value="asc">Ascending</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Clear Filters Button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAdvancedFilters({
                                  role: 'all',
                                  minContributions: '',
                                  maxContributions: '',
                                  sortBy: 'created_at',
                                  sortOrder: 'desc',
                                  phone: ''
                                })
                                setSearchTerm('')
                              }}
                              className="w-full h-8 text-xs"
                            >
                              Clear All Filters
                            </Button>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </StandardFormField>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <Card className="border border-gray-200 max-h-48 overflow-y-auto">
                        <CardContent className="p-0">
                          {searchResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleSelectTarget(user)}
                              className="w-full p-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0 flex items-center gap-3"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                                  {getInitials(user.first_name, user.last_name, user.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 truncate">{user.email}</p>
                                {(user.first_name || user.last_name) && (
                                  <p className="text-xs text-gray-600 truncate">
                                    {getUserDisplayName(user)}
                                  </p>
                                )}
                                {user.contribution_count !== undefined && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {user.contribution_count} {user.contribution_count === 1 ? 'contribution' : 'contributions'}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="border-2 border-green-200 bg-green-50/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-green-300">
                          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-green-500 to-green-600 text-white">
                            {getInitials(targetUser.first_name, targetUser.last_name, targetUser.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{targetUser.email}</p>
                          <p className="text-xs text-gray-600 truncate mt-0.5">
                            {getUserDisplayName(targetUser)}
                          </p>
                          {targetUser.contribution_count !== undefined && (
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {targetUser.contribution_count} {targetUser.contribution_count === 1 ? 'contribution' : 'contributions'}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTargetUserId('')
                            setTargetUser(null)
                            setSearchTerm('')
                            setPreview(null)
                            setPreviewSummary(null)
                            setShowPreview(false)
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )
        },
        {
          title: "Options",
          children: (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Checkbox
                id="delete-source"
                checked={deleteSource}
                onCheckedChange={(checked) => setDeleteSource(checked === true)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <label htmlFor="delete-source" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Delete source account after merge
                </label>
                <p className="text-xs text-gray-500">
                  Permanently delete the source user account after merging. This action cannot be undone.
                </p>
              </div>
            </div>
          )
        },
        ...(targetUser ? [{
          title: "Merge Preview",
          children: (
            <div className="space-y-4">
              {/* Preview Toggle */}
              <Collapsible open={showPreview} onOpenChange={setShowPreview}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between h-10"
                    disabled={loadingPreview || !preview}
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span className="text-sm">Preview Merge Details</span>
                      {previewSummary && (
                        <Badge variant="secondary" className="text-xs">
                          {previewSummary.total_records_to_migrate} records
                        </Badge>
                      )}
                    </div>
                    {loadingPreview && <Loader2 className="h-4 w-4 animate-spin" />}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-4 pt-4">
                  {preview && previewSummary ? (
                    <>
                      {/* Safety Indicators */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Card className="border-green-200 bg-green-50">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="h-4 w-4 text-green-600" />
                              <span className="text-xs font-medium text-green-900">Automatic Backup</span>
                            </div>
                            <p className="text-xs text-green-700">A backup will be created before merge</p>
                          </CardContent>
                        </Card>
                        <Card className="border-blue-200 bg-blue-50">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <RefreshCw className="h-4 w-4 text-blue-600" />
                              <span className="text-xs font-medium text-blue-900">Rollback Available</span>
                            </div>
                            <p className="text-xs text-blue-700">You can rollback if needed</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Validation Status */}
                      {preview.validation.errors.length > 0 && (
                        <Alert className="border-red-200 bg-red-50">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-700 text-sm">
                            <p className="font-medium mb-1">Validation Errors:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                              {preview.validation.errors.map((error, idx) => (
                                <li key={idx}>{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {preview.validation.warnings.length > 0 && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-yellow-700 text-sm">
                            <p className="font-medium mb-1">Warnings:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                              {preview.validation.warnings.map((warning, idx) => (
                                <li key={idx}>{warning}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {preview.validation.can_merge && preview.validation.errors.length === 0 && (
                        <Alert className="border-green-200 bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700 text-sm">
                            Validation passed. Ready to merge.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Detailed Records Preview */}
                      <Card className="border border-gray-200">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium mb-3">Records to be Migrated:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(preview.records_to_migrate)
                              .filter(([_, count]) => count > 0)
                              .map(([table, count]) => (
                                <div key={table} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                  <span className="text-gray-600 capitalize">
                                    {table.replace(/_/g, ' ')}
                                  </span>
                                  <Badge variant="outline" className="text-xs">{count}</Badge>
                                </div>
                              ))}
                          </div>
                          {previewSummary.total_records_to_migrate === 0 && (
                            <p className="text-sm text-gray-500 mt-2 text-center">
                              No records found to migrate.
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Summary Stats */}
                      <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-blue-900 mb-2">Summary:</p>
                          <ul className="text-xs text-blue-800 space-y-1">
                            <li>• Total Records: {previewSummary.total_records_to_migrate}</li>
                            <li>• Tables Affected: {previewSummary.tables_affected.length}</li>
                            <li>• Contributions: {preview.records_to_migrate.contributions || 0} → {targetUser?.email}</li>
                            <li>• Notifications: {preview.records_to_migrate.notifications || 0} → {targetUser?.email}</li>
                            {deleteSource && (
                              <li>• Source account: Will be permanently deleted</li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    </>
                  ) : loadingPreview ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                      <span className="ml-2 text-sm text-gray-600">Loading preview...</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-4">
                      Click &quot;Preview Merge Details&quot; to see what will be merged
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Success State with Merge ID */}
              {mergeId && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 text-sm">
                    <p className="font-medium mb-2">Merge completed successfully!</p>
                    <div className="space-y-1 text-xs">
                      <p><strong>Merge ID:</strong> {mergeId}</p>
                      {backupId && <p><strong>Backup ID:</strong> {backupId}</p>}
                      <p className="text-gray-600 mt-2">
                        Save the Merge ID to rollback this operation if needed.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )
        }] : [])
      ]}
      primaryAction={{
        label: "Merge Accounts",
        onClick: handleMerge,
        loading: loading,
        disabled: loading || 
          !targetUserId || 
          sourceUserId === targetUserId ||
          !!(preview && !preview.validation.can_merge) ||
          !!(preview && preview.validation.errors.length > 0),
        variant: 'destructive'
      }}
      secondaryAction={{
        label: "Cancel",
        onClick: onClose,
        disabled: loading
      }}
    />
  )
}

