'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Users, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react'
import { safeFetch } from '@/lib/utils/safe-fetch'

interface User {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  contribution_count?: number
}

interface AccountMergeModalProps {
  open: boolean
  sourceUserId: string | null
  onClose: () => void
  onSuccess: () => void
}

export function AccountMergeModal({ open, sourceUserId, onClose, onSuccess }: AccountMergeModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [sourceUser, setSourceUser] = useState<User | null>(null)
  const [targetUserId, setTargetUserId] = useState('')
  const [targetUser, setTargetUser] = useState<User | null>(null)
  const [deleteSource, setDeleteSource] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)

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
  }

  const fetchSourceUser = async () => {
    if (!sourceUserId) return

    try {
      setFetching(true)
      const response = await safeFetch(`/api/admin/users/${sourceUserId}`)
      
      if (response.ok) {
        setSourceUser(response.data.user)
      } else {
        throw new Error('Failed to fetch source user')
      }
    } catch (error) {
      console.error('Error fetching source user:', error)
      toast({
        title: 'Error',
        description: 'Failed to load source user',
        type: 'error'
      })
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
      
      if (response.ok) {
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
      }
    } catch (error) {
      console.error('Error searching users:', error)
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
  }

  const handleMerge = async () => {
    if (!sourceUserId || !targetUserId) {
      toast({
        title: 'Error',
        description: 'Please select a target user',
        type: 'error'
      })
      return
    }

    if (sourceUserId === targetUserId) {
      toast({
        title: 'Error',
        description: 'Cannot merge user with itself',
        type: 'error'
      })
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
        throw new Error(error.error || 'Failed to merge accounts')
      }

      const data = await response.json()

      toast({
        title: 'Success',
        description: data.message || 'Accounts merged successfully'
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error merging accounts:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to merge accounts',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Merge User Accounts</DialogTitle>
          <DialogDescription>
            Merge contributions and data from one account into another
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sourceUser ? (
          <div className="space-y-6">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                This action will reassign all contributions, notifications, and related data from the source account to the target account. This action cannot be undone.
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

            {/* Summary */}
            {targetUser && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">Merge Summary:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Contributions: {sourceUser.contribution_count || 0} → {targetUser.email}</li>
                  <li>• Notifications: Reassigned to {targetUser.email}</li>
                  {deleteSource && (
                    <li>• Source account: Will be deleted</li>
                  )}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleMerge}
                disabled={loading || !targetUserId || sourceUserId === targetUserId}
                variant="destructive"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Users className="mr-2 h-4 w-4" />
                Merge Accounts
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

