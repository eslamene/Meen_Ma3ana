'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, X, FileText, Image as ImageIcon, File } from 'lucide-react'
import { fetchStorageRules, validateFileClient, type StorageRule } from '@/lib/storage/clientValidation'
import { toast } from 'sonner'

export interface FileCategoryConfig {
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  allowedTypes?: string[]
}

export interface PendingFile {
  file: File
  category: string
  preview?: string
}

export interface GenericFileUploaderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (files: Array<{ file: File; category: string }>) => Promise<void>
  uploading?: boolean
  progress?: number
  categories: Record<string, FileCategoryConfig>
  defaultCategory?: string
  translationNamespace?: string
  accept?: string
  maxFileSize?: number // in MB (deprecated - will use storage rules if bucketName provided)
  bucketName?: string // Bucket name to fetch storage rules from
}

export function GenericFileUploader({
  open,
  onOpenChange,
  onUpload,
  uploading = false,
  progress = 0,
  categories,
  defaultCategory,
  translationNamespace = 'files',
  accept,
  maxFileSize = 50, // Default 50MB (fallback if no bucketName)
  bucketName // Bucket name to fetch storage rules
}: GenericFileUploaderProps) {
  const t = useTranslations(translationNamespace)
  const tCommon = useTranslations('common')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [storageRule, setStorageRule] = useState<StorageRule | null>(null)
  const [loadingRules, setLoadingRules] = useState(false)

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-8 w-8 text-purple-600" />
    if (fileType.startsWith('application/pdf')) return <FileText className="h-8 w-8 text-red-600" />
    return <File className="h-8 w-8 text-gray-600" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const autoDetectCategory = useCallback((file: File): string => {
    if (file.type.startsWith('image/')) {
      return categories.photos ? 'photos' : Object.keys(categories)[0]
    }
    if (file.type.startsWith('video/')) {
      return categories.videos ? 'videos' : Object.keys(categories)[0]
    }
    if (file.type.startsWith('audio/')) {
      return categories.audio ? 'audio' : Object.keys(categories)[0]
    }
    if (file.type === 'application/pdf') {
      return categories.medical ? 'medical' : Object.keys(categories)[0]
    }
    return defaultCategory || Object.keys(categories)[0]
  }, [categories, defaultCategory])

  // Fetch storage rules when dialog opens and bucketName is provided
  useEffect(() => {
    if (open && bucketName) {
      // Defer state update to avoid setState in effect
      Promise.resolve().then(() => {
        setLoadingRules(true)
      })
      fetchStorageRules(bucketName)
        .then(rule => {
          setStorageRule(rule)
        })
        .catch(error => {
          console.warn('Error loading storage rules:', error)
          setStorageRule(null)
        })
        .finally(() => {
          setLoadingRules(false)
        })
    } else if (!open) {
      // Reset when dialog closes - defer state update to avoid setState in effect
      Promise.resolve().then(() => {
        setStorageRule(null)
      })
    }
  }, [open, bucketName])

  const validateFile = useCallback((file: File): string | null => {
    // If bucketName is provided, use storage rules validation
    if (bucketName) {
      const validation = validateFileClient(file, storageRule, bucketName)
      if (!validation.valid) {
        return validation.error || 'File validation failed'
      }
      return null
    }
    
    // Fallback to maxFileSize if no bucketName provided
    if (maxFileSize && file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`
    }
    return null
  }, [bucketName, storageRule, maxFileSize])

  const handleFiles = useCallback((files: FileList) => {
    const newFiles: PendingFile[] = []
    const errors: string[] = []
    
    Array.from(files).forEach(file => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
        return
      }

      const category = autoDetectCategory(file)
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setPendingFiles(prev => prev.map(pf => 
            pf.file === file ? { ...pf, preview: e.target?.result as string } : pf
          ))
        }
        reader.readAsDataURL(file)
      }
      
      newFiles.push({ file, category })
    })
    
    // Show errors to user
    if (errors.length > 0) {
      toast.error('Validation Error', {
        description: errors.length === 1 
          ? errors[0] 
          : `${errors.length} file(s) failed validation. ${errors.slice(0, 2).join('; ')}${errors.length > 2 ? '...' : ''}`
      })
    }
    
    if (newFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...newFiles])
    }
  }, [autoDetectCategory, validateFile, toast])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const handleCategoryChange = (index: number, newCategory: string) => {
    setPendingFiles(prev => prev.map((item, idx) => 
      idx === index ? { ...item, category: newCategory } : item
    ))
  }

  const handleRemoveFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleUploadClick = async () => {
    if (pendingFiles.length === 0) return
    
    await onUpload(pendingFiles)
    setPendingFiles([])
  }

  const handleClose = () => {
    if (!uploading) {
      setPendingFiles([])
      onOpenChange(false)
    }
  }

  // Generate accept attribute from storage rules if available, otherwise use provided accept or default
  // Use useMemo to recalculate when storageRule changes
  const defaultAccept = useMemo(() => {
    if (storageRule && storageRule.allowed_extensions.length > 0) {
      // Convert extensions to accept format (e.g., .pdf,.jpg,.mp4)
      return storageRule.allowed_extensions.map(ext => `.${ext}`).join(',')
    }
    return accept || '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mp3,.wav,.xlsx,.xls'
  }, [storageRule, accept])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-3 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl">{t('uploadFiles') || 'Upload Files'}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t('uploadFilesDescription') || 'Select files to upload. You can drag and drop files here.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
          {/* Drop Zone */}
          {!uploading && (
            <div
              className={`relative border-2 border-dashed rounded-lg p-4 sm:p-8 text-center transition-colors touch-manipulation ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 active:bg-blue-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                key={`file-input-${defaultAccept}`} // Force re-render when accept changes
                type="file"
                multiple
                onChange={handleChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-manipulation"
                accept={defaultAccept}
              />
              
              <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-2 sm:mb-4" />
              <p className="text-sm sm:text-lg font-medium text-gray-900">
                <span className="block sm:inline">{t('dropFilesHere') || 'Drop files here'}</span>
                <span className="hidden sm:inline"> </span>
                <span className="block sm:inline">{t('clickToBrowse') || 'or click to browse'}</span>
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 px-2">
                {loadingRules ? (
                  <span>Loading upload rules...</span>
                ) : storageRule ? (
                  <>
                    <span className="font-medium">Supported formats:</span>{' '}
                    <span className="text-gray-700 break-words">
                      {storageRule.allowed_extensions.map(e => e.toUpperCase()).join(', ')}
                    </span>
                    <span className="hidden sm:inline">{' • '}</span>
                    <span className="block sm:inline mt-1 sm:mt-0">
                    <span className="font-medium">Max size:</span>{' '}
                    <span className="text-gray-700">{storageRule.max_file_size_mb}MB</span>
                    </span>
                  </>
                ) : (
                  <>
                    {t('supportedFormats') || `Supported formats: PDF, Images, Videos, Audio, Documents`}
                    {maxFileSize && (
                      <>
                        <span className="hidden sm:inline"> • </span>
                        <span className="block sm:inline mt-1 sm:mt-0">Max size: {maxFileSize}MB</span>
                      </>
                    )}
                  </>
                )}
              </p>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-3 sm:space-y-4 p-4 sm:p-6 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
                <p className="text-base sm:text-lg font-medium text-gray-900">{t('uploading') || 'Uploading...'}</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                <div 
                  className="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-center text-xs sm:text-sm text-gray-600">
                {t('uploadingProgress', { percent: Math.round(progress) }) || `${Math.round(progress)}% complete`}
              </p>
            </div>
          )}

          {/* Pending Files List */}
          {pendingFiles.length > 0 && !uploading && (
            <div className="space-y-2 sm:space-y-3">
              <h4 className="font-medium text-sm sm:text-base text-gray-900">
                {t('filesSelected', { count: pendingFiles.length }) || `${pendingFiles.length} file(s) selected`}
              </h4>
              {pendingFiles.map((item, index) => {
                const categoryConfig = categories[item.category] || Object.values(categories)[0]
                const CategoryIcon = categoryConfig.icon
                
                return (
                  <div key={index} className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {/* File Icon/Preview and Info */}
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto">
                    <div className="flex-shrink-0">
                      {item.preview ? (
                          <img src={item.preview} alt={item.file.name} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded" />
                      ) : (
                          <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-white rounded border">
                          {getFileIcon(item.file.type)}
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{item.file.name}</p>
                        <p className="text-xs sm:text-sm text-gray-500">{formatFileSize(item.file.size)}</p>
                      
                      {/* Category Selector */}
                      {Object.keys(categories).length > 1 && (
                          <div className="mt-1.5 sm:mt-2">
                          <Select 
                            value={item.category} 
                            onValueChange={(value) => handleCategoryChange(index, value)}
                          >
                              <SelectTrigger className="w-full sm:max-w-xs h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue placeholder={t('selectCategory') || 'Select Category'} />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(categories).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                      <CategoryIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                                      <span className="text-xs sm:text-sm">{config.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      className="flex-shrink-0 self-end sm:self-auto w-full sm:w-auto justify-center sm:justify-start"
                    >
                      <X className="h-4 w-4 mr-1 sm:mr-0" />
                      <span className="sm:hidden">Remove</span>
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!uploading && (
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-3 sm:pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {tCommon('cancel') || t('cancel') || 'Cancel'}
            </Button>
            <Button 
              onClick={handleUploadClick}
              disabled={pendingFiles.length === 0}
              className="w-full sm:w-auto min-w-[120px] order-1 sm:order-2"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('upload') || 'Upload'} {pendingFiles.length > 0 && `(${pendingFiles.length})`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

