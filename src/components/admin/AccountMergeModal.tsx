'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, Users, AlertTriangle, ArrowRight, Trash2, Eye, CheckCircle, Shield, RefreshCw } from 'lucide-react'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface User {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  contribution_count?: number
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
  }

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
          console.error('Error fetching source user:', {
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
      console.error('Unexpected error fetching source user:', error)
      toast.error('Error', { description: errorMessage })
    } finally {
      setFetching(false)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      setSearching(true)
      const response = await safeFetch('/api/admin/users')
      
      if (response.ok && response.data?.users) {
        const users = response.data.users || []
        const filtered = users.filter((user: User) => 
          user.id !== sourceUserId &&
          (
            user.email.toLowerCase().includes(query.toLowerCase()) ||
            (user.first_name && user.first_name.toLowerCase().includes(query.toLowerCase())) ||
            (user.last_name && user.last_name.toLowerCase().includes(query.toLowerCase()))
          )
        ).slice(0, 10) // Limit to 10 results
        
        setSearchResults(filtered)
      } else {
        // Only log unexpected errors (not auth/permission errors)
        if (response.status >= 500 || response.status === 0) {
          console.error('Error searching users:', {
            status: response.status,
            error: response.error
          })
        }
        // Don't show toast for search errors to avoid noise
      }
    } catch (error) {
      // This catch block should rarely be hit since safeFetch handles errors
      console.error('Unexpected error searching users:', error)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchUsers(searchTerm)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

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
        console.error('Failed to load preview:', response.error)
        // Don't show error toast for preview failures, just log
      }
    } catch (error) {
      console.error('Error loading preview:', error)
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
        console.error('Merge error details:', error)
        
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
            console.log('Merge ID:', data.merge_id)
            console.log('Backup ID:', data.backup_id)
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
      console.error('Error merging accounts:', error)
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to merge accounts' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>Merge User Accounts</DialogTitle>
          <DialogDescription>
            Merge contributions and data from one account into another
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sourceUser ? (
            <div className="space-y-6">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                This action will reassign all contributions, notifications, and related data from the source account to the target account. 
                A backup will be created automatically, and you can rollback if needed. However, this action should be performed carefully.
              </AlertDescription>
            </Alert>

            {/* Source User */}
            <div className="space-y-2">
              <Label>Source Account (from)</Label>
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{sourceUser.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {sourceUser.first_name} {sourceUser.last_name}
                    </p>
                    {sourceUser.contribution_count !== undefined && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {sourceUser.contribution_count} contributions
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            {/* Target User Search */}
            <div className="space-y-2">
              <Label htmlFor="target-search">Target Account (to)</Label>
              <Input
                id="target-search"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectTarget(user)}
                      className="w-full p-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
                    >
                      <p className="font-medium">{user.email}</p>
                      {(user.first_name || user.last_name) && (
                        <p className="text-sm text-muted-foreground">
                          {user.first_name} {user.last_name}
                        </p>
                      )}
                      {user.contribution_count !== undefined && (
                        <p className="text-sm text-muted-foreground">
                          {user.contribution_count} contributions
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Target User */}
              {targetUser && (
                <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{targetUser.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {targetUser.first_name} {targetUser.last_name}
                      </p>
                      {targetUser.contribution_count !== undefined && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {targetUser.contribution_count} contributions
                        </p>
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
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Delete Source Option */}
            <div className="flex items-start space-x-3 pt-4 border-t">
              <Checkbox
                id="delete-source"
                checked={deleteSource}
                onCheckedChange={(checked) => setDeleteSource(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="delete-source" className="cursor-pointer">
                  Delete source account after merge
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete the source user account after merging. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Preview Section */}
            {targetUser && (
              <div className="space-y-4">
                {/* Preview Toggle */}
                <Collapsible open={showPreview} onOpenChange={setShowPreview}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                      disabled={loadingPreview || !preview}
                    >
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span>Preview Merge Details</span>
                        {previewSummary && (
                          <Badge variant="secondary">
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
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-900">Automatic Backup</span>
                            </div>
                            <p className="text-xs text-green-700">A backup will be created before merge</p>
                          </div>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <RefreshCw className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">Rollback Available</span>
                            </div>
                            <p className="text-xs text-blue-700">You can rollback if needed</p>
                          </div>
                        </div>

                        {/* Validation Status */}
                        {preview.validation.errors.length > 0 && (
                          <Alert className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-red-700">
                              <p className="font-medium mb-1">Validation Errors:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {preview.validation.errors.map((error, idx) => (
                                  <li key={idx} className="text-sm">{error}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {preview.validation.warnings.length > 0 && (
                          <Alert className="border-yellow-200 bg-yellow-50">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-700">
                              <p className="font-medium mb-1">Warnings:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {preview.validation.warnings.map((warning, idx) => (
                                  <li key={idx} className="text-sm">{warning}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {preview.validation.can_merge && preview.validation.errors.length === 0 && (
                          <Alert className="border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700">
                              Validation passed. Ready to merge.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Detailed Records Preview */}
                        <div className="p-4 bg-muted/50 border rounded-lg">
                          <p className="text-sm font-medium mb-3">Records to be Migrated:</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {Object.entries(preview.records_to_migrate)
                              .filter(([_, count]) => count > 0)
                              .map(([table, count]) => (
                                <div key={table} className="flex items-center justify-between p-2 bg-background rounded">
                                  <span className="text-muted-foreground capitalize">
                                    {table.replace(/_/g, ' ')}
                                  </span>
                                  <Badge variant="outline">{count}</Badge>
                                </div>
                              ))}
                          </div>
                          {previewSummary.total_records_to_migrate === 0 && (
                            <p className="text-sm text-muted-foreground mt-2">
                              No records found to migrate.
                            </p>
                          )}
                        </div>

                        {/* Summary Stats */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 mb-2">Summary:</p>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Total Records: {previewSummary.total_records_to_migrate}</li>
                            <li>• Tables Affected: {previewSummary.tables_affected.length}</li>
                            <li>• Contributions: {preview.records_to_migrate.contributions || 0} → {targetUser.email}</li>
                            <li>• Notifications: {preview.records_to_migrate.notifications || 0} → {targetUser.email}</li>
                            {deleteSource && (
                              <li>• Source account: Will be permanently deleted</li>
                            )}
                          </ul>
                        </div>
                      </>
                    ) : loadingPreview ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading preview...</span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        Click &quot;Preview Merge Details&quot; to see what will be merged
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Success State with Merge ID */}
                {mergeId && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      <p className="font-medium mb-2">Merge completed successfully!</p>
                      <div className="space-y-1 text-xs">
                        <p><strong>Merge ID:</strong> {mergeId}</p>
                        {backupId && <p><strong>Backup ID:</strong> {backupId}</p>}
                        <p className="text-muted-foreground mt-2">
                          Save the Merge ID to rollback this operation if needed.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        ) : null}
        </div>

        {/* Footer - Fixed at bottom */}
        {sourceUser && !fetching && (
          <DialogFooter className="px-6 py-4 border-t flex-shrink-0 bg-background">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={
                loading || 
                !targetUserId || 
                sourceUserId === targetUserId ||
                !!(preview && !preview.validation.can_merge) ||
                !!(preview && preview.validation.errors.length > 0)
              }
              variant="destructive"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Users className="mr-2 h-4 w-4" />
              Merge Accounts
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

