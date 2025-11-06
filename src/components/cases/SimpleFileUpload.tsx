'use client'

import React, { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, X, FileText, Image as ImageIcon, File} from 'lucide-react'
import { FILE_CATEGORIES, FileCategory } from '@/components/cases/CaseFileManager'

interface PendingFile {
  file: File
  category: FileCategory
  preview?: string
}

interface SimpleFileUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (files: Array<{ file: File; category: FileCategory }>) => Promise<void>
  uploading?: boolean
  progress?: number
}

export function SimpleFileUpload({
  open,
  onOpenChange,
  onUpload,
  uploading = false,
  progress = 0
}: SimpleFileUploadProps) {
  const t = useTranslations('cases.files')
  const tCases = useTranslations('cases')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [dragActive, setDragActive] = useState(false)

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

  const autoDetectCategory = (file: File): FileCategory => {
    if (file.type.startsWith('image/')) return 'photos'
    if (file.type.startsWith('video/')) return 'videos'
    if (file.type.startsWith('audio/')) return 'audio'
    if (file.type === 'application/pdf') return 'medical'
    return 'other'
  }

  const handleFiles = useCallback((files: FileList) => {
    const newFiles: PendingFile[] = []
    
    Array.from(files).forEach(file => {
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
    
    setPendingFiles(prev => [...prev, ...newFiles])
  }, [])

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

  const handleCategoryChange = (index: number, newCategory: FileCategory) => {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('uploadFiles')}</DialogTitle>
          <DialogDescription>
            {t('uploadFilesDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Drop Zone */}
          {!uploading && (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                onChange={handleChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mp3,.wav,.xlsx,.xls"
              />
              
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">{t('dropFilesHere')} {t('clickToBrowse')}</p>
              <p className="text-sm text-gray-500 mt-1">{t('supportedFormats')}</p>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-4 p-6 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-lg font-medium text-gray-900">{t('uploading')}</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-600">{t('uploadingProgress', { percent: Math.round(progress) })}</p>
            </div>
          )}

          {/* Pending Files List */}
          {pendingFiles.length > 0 && !uploading && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">{t('filesSelected', { count: pendingFiles.length })}</h4>
              {pendingFiles.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {/* File Icon/Preview */}
                  <div className="flex-shrink-0">
                    {item.preview ? (
                      <img src={item.preview} alt={item.file.name} className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-16 flex items-center justify-center bg-white rounded border">
                        {getFileIcon(item.file.type)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(item.file.size)}</p>
                    
                    {/* Category Selector */}
                    <div className="mt-2">
                      <Select 
                        value={item.category} 
                        onValueChange={(value) => handleCategoryChange(index, value as FileCategory)}
                      >
                        <SelectTrigger className="w-full max-w-xs h-9 text-sm">
                          <SelectValue placeholder={t('selectCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FILE_CATEGORIES).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${config.color.split(' ')[0]}`}></div>
                                <span>{t(key as FileCategory)}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!uploading && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              {tCases('cancel')}
            </Button>
            <Button 
              onClick={handleUploadClick}
              disabled={pendingFiles.length === 0}
              className="min-w-[120px]"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('upload')} {pendingFiles.length > 0 && `(${pendingFiles.length})`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

