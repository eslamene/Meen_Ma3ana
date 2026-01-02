'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2, User, Search, Plus, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { StandardModalSection } from '@/components/ui/standard-modal'
import { parseCSV, generateSummary, type BatchUploadSummary } from '@/lib/cases/batch-upload'

interface BatchCaseUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
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

interface BatchItem {
  id: string
  contributor_nickname: string
  user_id?: string
  status: string
}

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

type Step = 'upload' | 'mapping' | 'processing' | 'complete'

export default function BatchCaseUploadModal({ open, onOpenChange, onSuccess }: BatchCaseUploadModalProps) {
  const router = useRouter()
  const params = useParams()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [batchData, setBatchData] = useState<BatchUpload | null>(null)
  const [items, setItems] = useState<BatchItem[]>([])
  const [uniqueNicknames, setUniqueNicknames] = useState<string[]>([])
  const [nicknameMappings, setNicknameMappings] = useState<Record<string, string>>({})
  const [summary, setSummary] = useState<BatchUploadSummary | null>(null)
  const [uploading, setUploading] = useState(false)
  const [mapping, setMapping] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userSearchQueries, setUserSearchQueries] = useState<Record<string, string>>({})
  const [userSearchResults, setUserSearchResults] = useState<Record<string, User[]>>({})
  const [searchingUsers, setSearchingUsers] = useState<Record<string, boolean>>({})

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('upload')
      setFile(null)
      setBatchId(null)
      setBatchData(null)
      setItems([])
      setUniqueNicknames([])
      setNicknameMappings({})
      setSummary(null)
      setUserSearchQueries({})
      setUserSearchResults({})
    }
  }, [open])

  // Poll for batch status updates
  useEffect(() => {
    if (!batchId || step !== 'processing') return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/cases/batch-upload/${batchId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setBatchData(data.data.batch)
            setItems(data.data.items || [])
            
            if (data.data.batch.status === 'completed' || data.data.batch.status === 'failed') {
              setStep('complete')
              clearInterval(interval)
            }
          }
        }
      } catch (error) {
        console.error('Error polling batch status:', error)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(interval)
  }, [batchId, step])

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain']
    
    const isValidType = validTypes.includes(selectedFile.type) || selectedFile.name.match(/\.csv$/i)

    if (!isValidType) {
      toast.error('Invalid file type. Please upload a CSV file')
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setFile(selectedFile)
    
    // Preview CSV to generate summary
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const rows = parseCSV(content)
        const summaryData = generateSummary(rows)
        setSummary(summaryData)
      } catch (error) {
        console.error('Error parsing CSV:', error)
      }
    }
    reader.readAsText(selectedFile, 'utf-8')
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', `Batch Upload - ${new Date().toLocaleString()}`)

      const response = await fetch('/api/admin/cases/batch-upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      if (data.success && data.batch_id) {
        setBatchId(data.batch_id)
        toast.success(`Successfully uploaded ${data.total_items} items`)
        // Navigate to mapping page
        const locale = params.locale as string
        router.push(`/${locale}/case-management/batch-upload/${data.batch_id}/map`)
        onOpenChange(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const loadBatchData = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/cases/batch-upload/${id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setBatchData(data.data.batch)
          setItems(data.data.items || [])
          setUniqueNicknames(data.data.unique_nicknames || [])
          
          // Initialize mappings from existing user_ids
          const mappings: Record<string, string> = {}
          data.data.items?.forEach((item: BatchItem) => {
            if (item.user_id && item.contributor_nickname) {
              mappings[item.contributor_nickname] = item.user_id
            }
          })
          setNicknameMappings(mappings)
        }
      }
    } catch (error) {
      console.error('Error loading batch data:', error)
    }
  }

  const searchUsers = useCallback(async (nickname: string, query: string) => {
    if (query.trim().length < 2) {
      setUserSearchResults(prev => ({ ...prev, [nickname]: [] }))
      return
    }

    setSearchingUsers(prev => ({ ...prev, [nickname]: true }))
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=10`)
      const data = await response.json()
      if (data.success && data.users) {
        setUserSearchResults(prev => ({ ...prev, [nickname]: data.users }))
      }
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setSearchingUsers(prev => ({ ...prev, [nickname]: false }))
    }
  }, [])

  const handleUserSearch = (nickname: string, query: string) => {
    setUserSearchQueries(prev => ({ ...prev, [nickname]: query }))
    searchUsers(nickname, query)
  }

  const handleMapNickname = (nickname: string, userId: string) => {
    setNicknameMappings(prev => ({ ...prev, [nickname]: userId }))
    setUserSearchQueries(prev => ({ ...prev, [nickname]: '' }))
    setUserSearchResults(prev => ({ ...prev, [nickname]: [] }))
  }

  const handleSaveMappings = async () => {
    if (!batchId) return

    setMapping(true)
    try {
      const mappings = Object.entries(nicknameMappings).map(([nickname, user_id]) => ({
        nickname,
        user_id
      }))

      const response = await fetch(`/api/admin/cases/batch-upload/${batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'map-nicknames', mappings })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save mappings')
      }

      toast.success('Mappings saved successfully')
      await loadBatchData(batchId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save mappings')
    } finally {
      setMapping(false)
    }
  }

  const handleProcess = async () => {
    if (!batchId) return

    setProcessing(true)
    setStep('processing')
    
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
      await loadBatchData(batchId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process batch')
      setProcessing(false)
    }
  }

  const unmappedCount = uniqueNicknames.filter(n => !nicknameMappings[n]).length
  const mappedCount = uniqueNicknames.filter(n => nicknameMappings[n]).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Case Upload</DialogTitle>
          <DialogDescription>
            Upload a CSV file with cases and contributions, map contributors to users, and process the batch
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <StandardModalSection title="Upload CSV File">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  Select File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e.target.files[0])
                    }
                  }}
                />
              </div>

              {file && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {summary && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Upload Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Items:</span>
                      <span className="ml-2 font-medium">{summary.total_items}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Distinct Cases:</span>
                      <span className="ml-2 font-medium">{summary.distinct_cases || summary.unique_cases}</span>
                      <span className="ml-1 text-xs text-gray-500">
                        ({summary.unique_cases} unique case numbers)
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Unique Contributors:</span>
                      <span className="ml-2 font-medium">{summary.unique_contributors}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="ml-2 font-medium">{summary.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                  {summary.cases_by_month && Object.keys(summary.cases_by_month).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="text-xs font-medium text-gray-700 mb-1">Cases by Month:</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(summary.cases_by_month).map(([month, count]) => (
                          <span key={month} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Month {month}: {count} cases
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </StandardModalSection>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload & Continue'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && batchId && (
          <div className="space-y-4">
            <StandardModalSection title="Map Contributor Nicknames to Users">
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Map each contributor nickname to an existing user. Unmapped contributors will be skipped during processing.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {uniqueNicknames.map((nickname) => {
                  const mappedUserId = nicknameMappings[nickname]
                  const searchQuery = userSearchQueries[nickname] || ''
                  const searchResults = userSearchResults[nickname] || []
                  const isSearching = searchingUsers[nickname] || false

                  return (
                    <div key={nickname} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium">{nickname}</Label>
                        {mappedUserId && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Mapped
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Search users by name or email..."
                            value={searchQuery}
                            onChange={(e) => handleUserSearch(nickname, e.target.value)}
                            className="h-9"
                          />
                          {searchQuery && searchResults.length > 0 && (
                            <div className="mt-1 border rounded-md bg-white shadow-lg z-10">
                              {searchResults.map((user) => (
                                <button
                                  key={user.id}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                                  onClick={() => handleMapNickname(nickname, user.id)}
                                >
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span>
                                    {user.first_name || user.last_name
                                      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                      : user.email}
                                  </span>
                                  <span className="text-xs text-gray-500 ml-auto">{user.email}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Mapped: <strong>{mappedCount}</strong></span>
                  <span>Unmapped: <strong>{unmappedCount}</strong></span>
                  <span>Total: <strong>{uniqueNicknames.length}</strong></span>
                </div>
              </div>
            </StandardModalSection>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleSaveMappings} disabled={mapping}>
                {mapping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Mappings'
                )}
              </Button>
              <Button 
                onClick={handleProcess} 
                disabled={processing || unmappedCount > 0}
                title={unmappedCount > 0 ? `Cannot process: ${unmappedCount} contributor(s) are not mapped` : undefined}
              >
                <Play className="mr-2 h-4 w-4" />
                {unmappedCount > 0 ? `Cannot Process (${unmappedCount} unmapped)` : 'Process Batch'}
              </Button>
              {unmappedCount > 0 && (
                <p className="text-sm text-red-600 mt-2">
                  Please map all {unmappedCount} unmapped contributor(s) before processing
                </p>
              )}
            </div>
          </div>
        )}

        {step === 'processing' && batchData && (
          <div className="space-y-4">
            <StandardModalSection title="Processing Batch">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Processing items...</span>
                    <span>
                      {batchData.processed_items} / {batchData.total_items}
                    </span>
                  </div>
                  <Progress
                    value={(batchData.processed_items / batchData.total_items) * 100}
                    className="h-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-green-600 font-semibold">{batchData.successful_items}</div>
                    <div className="text-gray-600">Successful</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-red-600 font-semibold">{batchData.failed_items}</div>
                    <div className="text-gray-600">Failed</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-blue-600 font-semibold">{batchData.processed_items}</div>
                    <div className="text-gray-600">Processed</div>
                  </div>
                </div>
              </div>
            </StandardModalSection>
          </div>
        )}

        {step === 'complete' && batchData && (
          <div className="space-y-4">
            <StandardModalSection title="Batch Processing Complete">
              <Alert className={batchData.status === 'completed' ? 'bg-green-50' : 'bg-red-50'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {batchData.status === 'completed'
                    ? `Successfully processed ${batchData.successful_items} items`
                    : `Processing completed with ${batchData.failed_items} errors`}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-green-600 font-semibold">{batchData.successful_items}</div>
                  <div className="text-gray-600">Successful</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-red-600 font-semibold">{batchData.failed_items}</div>
                  <div className="text-gray-600">Failed</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-blue-600 font-semibold">{batchData.total_items}</div>
                  <div className="text-gray-600">Total</div>
                </div>
              </div>
            </StandardModalSection>

            <div className="flex justify-end gap-2">
              <Button onClick={() => {
                onOpenChange(false)
                if (onSuccess) onSuccess()
              }}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

