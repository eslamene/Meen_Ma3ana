'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import type { BucketMetadata, StorageRule } from '@/lib/storage/types'
import { Loader2, Save, Image as ImageIcon, FileText, Video, Music } from 'lucide-react'

interface BucketDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bucketName: string
  onUpdate?: () => void
}

// File extensions grouped by category
const FILE_EXTENSIONS_BY_CATEGORY = {
  image: [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp'
  ],
  document: [
    'pdf',
    'doc',
    'docx',
    'txt',
    'xls',
    'xlsx'
  ],
  video: [
    'mp4',
    'webm',
    'ogg', // video/ogg
    'avi'
  ],
  audio: [
    'mp3',
    'wav',
    'ogg', // audio/ogg
    'm4a'
  ]
} as const

// Flattened list for backward compatibility
const COMMON_EXTENSIONS = [
  ...FILE_EXTENSIONS_BY_CATEGORY.image,
  ...FILE_EXTENSIONS_BY_CATEGORY.document,
  ...FILE_EXTENSIONS_BY_CATEGORY.video,
  ...FILE_EXTENSIONS_BY_CATEGORY.audio
]

export function BucketDetailsDialog({
  open,
  onOpenChange,
  bucketName,
  onUpdate
}: BucketDetailsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bucket, setBucket] = useState<BucketMetadata | null>(null)
  const [rule, setRule] = useState<StorageRule | null>(null)
  const [maxFileSize, setMaxFileSize] = useState(5)
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([])

  useEffect(() => {
    if (open && bucketName) {
      fetchBucketDetails()
    }
  }, [open, bucketName])

  const fetchBucketDetails = async () => {
    try {
      setLoading(true)
      // Include count for admin details page (this is slower but needed for display)
      const response = await fetch(`/api/storage/buckets/${encodeURIComponent(bucketName)}?includeCount=true`)

      if (!response.ok) {
        throw new Error('Failed to fetch bucket details')
      }

      const data = await response.json()
      setBucket(data.bucket)
      
      if (data.rule) {
        setRule(data.rule)
        setMaxFileSize(data.rule.max_file_size_mb)
        setSelectedExtensions(data.rule.allowed_extensions)
      } else {
        // Default values matching required MIME types
        setMaxFileSize(5)
        setSelectedExtensions([
          // Images
          'jpg', 'jpeg', 'png', 'gif', 'webp',
          // Documents
          'pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx',
          // Videos
          'mp4', 'webm', 'ogg', 'avi',
          // Audio
          'mp3', 'wav', 'm4a'
        ])
      }
    } catch (error) {
      console.error('Error fetching bucket details:', error)
      toast.error('Error', {
        description: 'Failed to load bucket details'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExtensionToggle = (extension: string) => {
    setSelectedExtensions(prev => {
      if (prev.includes(extension)) {
        return prev.filter(ext => ext !== extension)
      } else {
        return [...prev, extension]
      }
    })
  }

  const handleSave = async () => {
    if (selectedExtensions.length === 0) {
      toast.error('Validation Error', {
        description: 'Please select at least one allowed file type'
      })
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/storage/rules/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket_name: bucketName,
          max_file_size_mb: maxFileSize,
          allowed_extensions: selectedExtensions
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update storage rules')
      }

      toast.success('Success', {
        description: 'Storage rules updated successfully'
      })

      // Refresh bucket details
      await fetchBucketDetails()
      
      // Notify parent to refresh
      if (onUpdate) {
        onUpdate()
      }
    } catch (error: any) {
      console.error('Error saving storage rules:', error)
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to update storage rules' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bucket Configuration: {bucketName}</DialogTitle>
          <DialogDescription>
            View and manage storage bucket settings and upload rules
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : bucket ? (
          <div className="space-y-6">
            {/* Bucket Metadata */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Bucket Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Bucket Name</Label>
                  <p className="text-sm font-medium text-gray-900">{bucket.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Visibility</Label>
                  <div className="mt-1">
                    <Badge variant={bucket.public ? 'default' : 'secondary'}>
                      {bucket.public ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                </div>
                {bucket.object_count !== undefined && (
                  <div>
                    <Label className="text-xs text-gray-500">Object Count</Label>
                    <p className="text-sm font-medium text-gray-900">{bucket.object_count}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-gray-500">Created</Label>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(bucket.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Storage Rules */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900">Upload Rules</h3>
              
              {/* Max File Size */}
              <div>
                <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  min="1"
                  value={maxFileSize}
                  onChange={(e) => setMaxFileSize(parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum allowed file size for uploads to this bucket
                </p>
              </div>

              {/* Allowed Extensions */}
              <div>
                <Label>Allowed File Types</Label>
                <p className="text-xs text-gray-500 mb-3">
                  Select the file extensions that are allowed for uploads
                </p>
                
                {/* Grouped by Category */}
                <div className="space-y-4">
                  {/* Images */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Images
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 border rounded-lg p-3 bg-gray-50">
                      {FILE_EXTENSIONS_BY_CATEGORY.image.map(ext => (
                        <div key={ext} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ext-${ext}`}
                            checked={selectedExtensions.includes(ext)}
                            onCheckedChange={() => handleExtensionToggle(ext)}
                          />
                          <Label
                            htmlFor={`ext-${ext}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {ext.toUpperCase()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 border rounded-lg p-3 bg-gray-50">
                      {FILE_EXTENSIONS_BY_CATEGORY.document.map(ext => (
                        <div key={ext} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ext-${ext}`}
                            checked={selectedExtensions.includes(ext)}
                            onCheckedChange={() => handleExtensionToggle(ext)}
                          />
                          <Label
                            htmlFor={`ext-${ext}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {ext.toUpperCase()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Videos */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Videos
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 border rounded-lg p-3 bg-gray-50">
                      {FILE_EXTENSIONS_BY_CATEGORY.video.map(ext => (
                        <div key={ext} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ext-${ext}`}
                            checked={selectedExtensions.includes(ext)}
                            onCheckedChange={() => handleExtensionToggle(ext)}
                          />
                          <Label
                            htmlFor={`ext-${ext}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {ext.toUpperCase()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Audio */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      Audio
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 border rounded-lg p-3 bg-gray-50">
                      {FILE_EXTENSIONS_BY_CATEGORY.audio.map(ext => (
                        <div key={ext} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ext-${ext}`}
                            checked={selectedExtensions.includes(ext)}
                            onCheckedChange={() => handleExtensionToggle(ext)}
                          />
                          <Label
                            htmlFor={`ext-${ext}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {ext.toUpperCase()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedExtensions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">Selected types:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedExtensions.map(ext => (
                        <Badge key={ext} variant="secondary">
                          {ext.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Failed to load bucket details</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Rules
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

