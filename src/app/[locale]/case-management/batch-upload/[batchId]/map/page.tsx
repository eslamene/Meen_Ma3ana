'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Play, Search, User } from 'lucide-react'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
}

interface BatchItem {
  id: string
  contributor_nickname: string
  user_id: string | null
  status: string
}

interface BatchUpload {
  id: string
  name: string
  status: string
  total_items: number
  processed_items: number
  successful_items: number
  failed_items: number
}

export default function BatchMappingPage() {
  const router = useRouter()
  const params = useParams()
  const { containerVariant } = useLayout()
  const batchId = params.batchId as string
  const locale = params.locale as string

  const [batchData, setBatchData] = useState<BatchUpload | null>(null)
  const [uniqueNicknames, setUniqueNicknames] = useState<string[]>([])
  const [nicknameMappings, setNicknameMappings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [savingNickname, setSavingNickname] = useState<string | null>(null)
  
  // User search state per nickname
  const [userSearchQueries, setUserSearchQueries] = useState<Record<string, string>>({})
  const [userSearchResults, setUserSearchResults] = useState<Record<string, User[]>>({})
  const [searchingUsers, setSearchingUsers] = useState<Record<string, boolean>>({})
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({})
  const [mappedUsers, setMappedUsers] = useState<Record<string, User>>({})

  // Fetch batch data
  useEffect(() => {
    if (batchId) {
      loadBatchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId])

  const fetchUserDetails = async (userIds: string[]) => {
    if (userIds.length === 0) return
    
    try {
      // Fetch all users in parallel for better performance
      const userPromises = userIds.map(async (userId) => {
        try {
          const response = await fetch(`/api/admin/users/${userId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.user) {
              return { userId, user: data.user }
            }
          }
        } catch (error) {
          // Silently fail for individual users
        }
        return null
      })

      // Wait for all requests to complete (with timeout)
      const results = await Promise.allSettled(userPromises)
      const usersMap: Record<string, User> = {}
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          usersMap[result.value.userId] = result.value.user
        }
      })

      setMappedUsers(prev => ({ ...prev, ...usersMap }))
    } catch (error) {
      // Silently fail - user details are optional
    }
  }

  const loadBatchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/cases/batch-upload/${batchId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setBatchData(data.data.batch)
          setUniqueNicknames(data.data.unique_nicknames || [])
          
          // Initialize mappings from existing user_ids
          const mappings: Record<string, string> = {}
          const userIds = new Set<string>()
          data.data.items?.forEach((item: BatchItem) => {
            if (item.user_id && item.contributor_nickname) {
              mappings[item.contributor_nickname] = item.user_id
              userIds.add(item.user_id)
            }
          })
          setNicknameMappings(mappings)
          
          // Fetch user details for mapped users in background (non-blocking)
          // Don't await - let the page load immediately
          if (userIds.size > 0) {
            fetchUserDetails(Array.from(userIds)).catch(() => {
              // Silently fail - user details are optional
            })
          }
        }
      } else {
        toast.error('Failed to load batch data')
      }
    } catch (error) {
      toast.error('Failed to load batch data')
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = useCallback(async (nickname: string, query: string) => {
    if (query.trim().length < 2) {
      setUserSearchResults(prev => ({ ...prev, [nickname]: [] }))
      return
    }

    setSearchingUsers(prev => ({ ...prev, [nickname]: true }))
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=20`)
      const data = await response.json()
      if (data.success && data.users) {
        setUserSearchResults(prev => ({ ...prev, [nickname]: data.users }))
      }
    } catch (error) {
      // Error handled silently - user can retry
    } finally {
      setSearchingUsers(prev => ({ ...prev, [nickname]: false }))
    }
  }, [])

  const handleUserSearch = (nickname: string, query: string) => {
    setUserSearchQueries(prev => ({ ...prev, [nickname]: query }))
    searchUsers(nickname, query)
  }

  const handleMapNickname = async (nickname: string, userId: string) => {
    try {
      setSavingNickname(nickname)
      
      // Find the user in search results to cache it
      const user = userSearchResults[nickname]?.find(u => u.id === userId)
      if (user) {
        setMappedUsers(prev => ({ ...prev, [userId]: user }))
      }
      
      // Optimistically update UI
      setNicknameMappings(prev => ({ ...prev, [nickname]: userId }))
      setOpenPopovers(prev => ({ ...prev, [nickname]: false }))
      setUserSearchQueries(prev => ({ ...prev, [nickname]: '' }))
      setUserSearchResults(prev => ({ ...prev, [nickname]: [] }))

      // Save to backend
      const response = await fetch(`/api/admin/cases/batch-upload/${batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'map-nicknames', 
          mappings: [{ nickname, user_id: userId }]
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save mapping')
      }

      toast.success(`Mapped "${nickname}" successfully`)
    } catch (error) {
      // Revert optimistic update on error
      setNicknameMappings(prev => {
        const updated = { ...prev }
        delete updated[nickname]
        return updated
      })
      toast.error(error instanceof Error ? error.message : 'Failed to save mapping')
    } finally {
      setSavingNickname(null)
    }
  }

  const handleClearMapping = async (nickname: string) => {
    try {
      setSavingNickname(nickname)
      
      // Optimistically update UI
      setNicknameMappings(prev => {
        const updated = { ...prev }
        delete updated[nickname]
        return updated
      })

      // Clear from backend
      const response = await fetch(`/api/admin/cases/batch-upload/${batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'map-nicknames', 
          mappings: [{ nickname, user_id: null }]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to clear mapping')
      }

      toast.success(`Cleared mapping for "${nickname}"`)
    } catch (error) {
      toast.error('Failed to clear mapping')
    } finally {
      setSavingNickname(null)
    }
  }

  const handleProcess = async () => {
    if (!batchId) return

    setProcessing(true)
    
    try {
      const response = await fetch(`/api/admin/cases/batch-upload/${batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process' })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process batch')
      }

      toast.success(`Processed ${data.successful_items} items successfully`)
      
      // Navigate back to batch upload page
      router.push(`/${locale}/case-management/batch-upload`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process batch')
      setProcessing(false)
    }
  }

  const mappedCount = useMemo(() => {
    return uniqueNicknames.filter(n => nicknameMappings[n]).length
  }, [uniqueNicknames, nicknameMappings])

  const unmappedCount = useMemo(() => {
    return uniqueNicknames.filter(n => !nicknameMappings[n]).length
  }, [uniqueNicknames, nicknameMappings])

  const getMappedUser = (nickname: string): User | null => {
    const userId = nicknameMappings[nickname]
    if (!userId) return null
    
    // First check mapped users cache
    if (mappedUsers[userId]) {
      return mappedUsers[userId]
    }
    
    // Then check search results
    for (const results of Object.values(userSearchResults)) {
      const user = results.find(u => u.id === userId)
      if (user) {
        // Cache it
        setMappedUsers(prev => ({ ...prev, [userId]: user }))
        return user
      }
    }
    return null
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <PermissionGuard permission="cases:batch_upload">
          <Container variant={containerVariant}>
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading batch data...</span>
            </div>
          </Container>
        </PermissionGuard>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <PermissionGuard permission="cases:batch_upload">
        <Container variant={containerVariant}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/${locale}/case-management/batch-upload`)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Map Contributors</h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
                    {batchData?.name || 'Batch Upload'}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleProcess}
                disabled={processing || unmappedCount > 0}
                className="text-white"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Process Batch
                  </>
                )}
              </Button>
            </div>

            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Mapping Summary</CardTitle>
                <CardDescription>
                  Map each contributor nickname to an existing user. Changes are saved automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm mb-4">
                  <div>
                    <span className="text-gray-600">Mapped:</span>
                    <span className="ml-2 font-semibold text-green-600">{mappedCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Unmapped:</span>
                    <span className="ml-2 font-semibold text-red-600">{unmappedCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="ml-2 font-semibold">{uniqueNicknames.length}</span>
                  </div>
                </div>
                {unmappedCount > 0 ? (
                  <Alert className="mt-4">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please map all {unmappedCount} unmapped contributor(s) before processing.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="mt-4 border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      All contributors are mapped! You can now process the batch.
                    </AlertDescription>
                  </Alert>
                )}
                {unmappedCount === 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleProcess}
                      disabled={processing}
                      size="lg"
                      className="text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing Batch...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5" />
                          Process Batch Now
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mapping Table */}
            <Card>
              <CardHeader>
                <CardTitle>Contributor Mappings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Contributor Nickname</TableHead>
                        <TableHead>Mapped User</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uniqueNicknames.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                            No contributors found
                          </TableCell>
                        </TableRow>
                      ) : (
                        uniqueNicknames.map((nickname) => {
                          const mappedUserId = nicknameMappings[nickname]
                          const mappedUser = getMappedUser(nickname)
                          const searchQuery = userSearchQueries[nickname] || ''
                          const searchResults = userSearchResults[nickname] || []
                          const isSearching = searchingUsers[nickname] || false
                          const isOpen = openPopovers[nickname] || false
                          const isSaving = savingNickname === nickname

                          return (
                            <TableRow key={nickname}>
                              <TableCell className="font-medium">{nickname}</TableCell>
                              <TableCell>
                                {mappedUserId ? (
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span>
                                      {mappedUser
                                        ? `${mappedUser.first_name || ''} ${mappedUser.last_name || ''}`.trim() || mappedUser.email
                                        : 'Loading...'}
                                    </span>
                                    {mappedUser && (
                                      <span className="text-xs text-gray-500">({mappedUser.email})</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">Not mapped</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {mappedUserId ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Mapped
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-red-600 border-red-300">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Unmapped
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Popover
                                    open={isOpen}
                                    onOpenChange={(open) => setOpenPopovers(prev => ({ ...prev, [nickname]: open }))}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isSaving}
                                        className="w-full"
                                      >
                                        {isSaving ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : mappedUserId ? (
                                          'Change'
                                        ) : (
                                          'Select User'
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-0" align="start">
                                      <div className="p-3 border-b">
                                        <div className="relative">
                                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                          <Input
                                            placeholder="Search users by name or email..."
                                            value={searchQuery}
                                            onChange={(e) => handleUserSearch(nickname, e.target.value)}
                                            className="pl-9"
                                          />
                                        </div>
                                      </div>
                                      <div className="max-h-60 overflow-y-auto">
                                        {isSearching ? (
                                          <div className="p-4 text-center text-gray-500">
                                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                            Searching...
                                          </div>
                                        ) : searchResults.length > 0 ? (
                                          searchResults.map((user) => (
                                            <button
                                              key={user.id}
                                              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 border-b last:border-b-0"
                                              onClick={() => handleMapNickname(nickname, user.id)}
                                            >
                                              <User className="h-4 w-4 text-gray-400" />
                                              <div className="flex-1">
                                                <div className="font-medium">
                                                  {user.first_name || user.last_name
                                                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                                    : user.email}
                                                </div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                              </div>
                                              {mappedUserId === user.id && (
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                              )}
                                            </button>
                                          ))
                                        ) : searchQuery.length >= 2 ? (
                                          <div className="p-4 text-center text-gray-500">
                                            No users found
                                          </div>
                                        ) : (
                                          <div className="p-4 text-center text-gray-500">
                                            Type at least 2 characters to search
                                          </div>
                                        )}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  {mappedUserId && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleClearMapping(nickname)}
                                      disabled={isSaving}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      Clear
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {unmappedCount === 0 && (
                  <div className="mt-6 pt-6 border-t flex justify-end">
                    <Button
                      onClick={handleProcess}
                      disabled={processing}
                      size="lg"
                      className="text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing Batch...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5" />
                          Process Batch Now
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Container>
      </PermissionGuard>
    </ProtectedRoute>
  )
}

