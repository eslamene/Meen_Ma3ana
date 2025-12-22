'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import type { BucketMetadata, StorageRule } from '@/lib/storage/types'
import { Loader2, Save, Image as ImageIcon, FileText, Video, Music, Database } from 'lucide-react'
import StandardModal, { StandardModalPreview, StandardFormField } from '@/components/ui/standard-modal'

import { defaultLogger as logger } from '@/lib/logger'

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

  const fetchBucketDetails = useCallback(async () => {
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
      logger.error('Error fetching bucket details:', { error: error })
      toast.error('Error', {
        description: 'Failed to load bucket details'
      })
    } finally {
      setLoading(false)
    }
  }, [bucketName])

  useEffect(() => {
    if (open && bucketName) {
      fetchBucketDetails()
    }
  }, [open, bucketName, fetchBucketDetails])

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
      logger.error('Error saving storage rules:', { error: error })
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to update storage rules' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <StandardModal
        open={open}
        onOpenChange={onOpenChange}
        title={`Bucket Configuration: ${bucketName}`}
        description="View and manage storage bucket settings and upload rules"
        sections={[]}
        primaryAction={{
          label: 'Loading...',
          onClick: () => {},
          disabled: true
        }}
        secondaryAction={{
          label: 'Close',
          onClick: () => onOpenChange(false)
        }}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </StandardModal>
    )
  }

  if (!bucket) {
    return (
      <StandardModal
        open={open}
        onOpenChange={onOpenChange}
        title={`Bucket Configuration: ${bucketName}`}
        description="View and manage storage bucket settings and upload rules"
        sections={[]}
        primaryAction={{
          label: 'Close',
          onClick: () => onOpenChange(false)
        }}
      >
        <div className="text-center py-12">
          <p className="text-gray-500">Failed to load bucket details</p>
        </div>
      </StandardModal>
    )
  }

  return (
    <StandardModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Bucket Configuration: ${bucketName}`}
      description="View and manage storage bucket settings and upload rules"
      preview={
        <StandardModalPreview>
          <div className="flex items-center gap-4">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: bucket.public ? '#10b98120' : '#6b728020' }}
            >
              <Database className="h-6 w-6" style={{ color: bucket.public ? '#10b981' : '#6b7280' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">{bucket.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={bucket.public ? 'default' : 'secondary'}>
                  {bucket.public ? 'Public' : 'Private'}
                </Badge>
                {bucket.object_count !== undefined && (
                  <span className="text-sm text-gray-500">
                    {bucket.object_count} {bucket.object_count === 1 ? 'object' : 'objects'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </StandardModalPreview>
      }
      sections={[
        {
          title: 'Bucket Information',
          children: (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Bucket Name</Label>
                <p className="text-sm font-medium text-gray-900">{bucket.name}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Visibility</Label>
                <div>
                  <Badge variant={bucket.public ? 'default' : 'secondary'}>
                    {bucket.public ? 'Public' : 'Private'}
                  </Badge>
                </div>
              </div>
              {bucket.object_count !== undefined && (
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Object Count</Label>
                  <p className="text-sm font-medium text-gray-900">{bucket.object_count}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Created</Label>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(bucket.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )
        },
        {
          title: 'Upload Rules',
          children: (
            <div className="space-y-6">
              <StandardFormField
                label="Maximum File Size (MB)"
                description="Maximum allowed file size for uploads to this bucket"
              >
                <Input
                  type="number"
                  min="1"
                  value={maxFileSize}
                  onChange={(e) => setMaxFileSize(parseInt(e.target.value) || 1)}
                  className="h-10"
                />
              </StandardFormField>

              <div>
                <Label className="text-sm font-medium text-gray-900 mb-1 block">
                  Allowed File Types
                </Label>
                <p className="text-xs text-gray-500 mb-4">
                  Select the file extensions that are allowed for uploads
                </p>
                
                <div className="space-y-4">
                  {/* Images */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-indigo-600" />
                      Images
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                      {FILE_EXTENSIONS_BY_CATEGORY.image.map(ext => (
                        <div key={ext} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ext-${ext}`}
                            checked={selectedExtensions.includes(ext)}
                            onCheckedChange={() => handleExtensionToggle(ext)}
                          />
                          <Label
                            htmlFor={`ext-${ext}`}
                            className="text-sm font-normal cursor-pointer text-gray-700"
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
                      <FileText className="h-4 w-4 text-indigo-600" />
                      Documents
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                      {FILE_EXTENSIONS_BY_CATEGORY.document.map(ext => (
                        <div key={ext} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ext-${ext}`}
                            checked={selectedExtensions.includes(ext)}
                            onCheckedChange={() => handleExtensionToggle(ext)}
                          />
                          <Label
                            htmlFor={`ext-${ext}`}
                            className="text-sm font-normal cursor-pointer text-gray-700"
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
                      <Video className="h-4 w-4 text-indigo-600" />
                      Videos
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                      {FILE_EXTENSIONS_BY_CATEGORY.video.map(ext => (
                        <div key={ext} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ext-${ext}`}
                            checked={selectedExtensions.includes(ext)}
                            onCheckedChange={() => handleExtensionToggle(ext)}
                          />
                          <Label
                            htmlFor={`ext-${ext}`}
                            className="text-sm font-normal cursor-pointer text-gray-700"
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
                      <Music className="h-4 w-4 text-indigo-600" />
                      Audio
                    </Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                      {FILE_EXTENSIONS_BY_CATEGORY.audio.map(ext => (
                        <div key={ext} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ext-${ext}`}
                            checked={selectedExtensions.includes(ext)}
                            onCheckedChange={() => handleExtensionToggle(ext)}
                          />
                          <Label
                            htmlFor={`ext-${ext}`}
                            className="text-sm font-normal cursor-pointer text-gray-700"
                          >
                            {ext.toUpperCase()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedExtensions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">Selected types:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedExtensions.map(ext => (
                        <Badge key={ext} variant="secondary" className="text-xs">
                          {ext.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        }
      ]}
      primaryAction={{
        label: 'Save Rules',
        onClick: handleSave,
        loading: saving,
        disabled: loading || selectedExtensions.length === 0
      }}
      secondaryAction={{
        label: 'Close',
        onClick: () => onOpenChange(false)
      }}
      maxWidth="2xl"
    />
  )
}

