'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Download, Edit, Trash2, ExternalLink } from 'lucide-react'
import type { FileCategoryConfig } from './GenericFileUploader'

export interface GenericFile {
  id: string
  name: string
  originalName: string
  url: string
  size: number
  type: string
  category: string
  description?: string
  uploadedAt: string
  uploadedBy?: string
  uploaderName?: string
  isPublic?: boolean
  thumbnail?: string
}

export interface GenericFilePreviewModalProps {
  file: GenericFile
  open: boolean
  onOpenChange: (open: boolean) => void
  canEdit: boolean
  onFileUpdate: (file: GenericFile) => Promise<void> | void
  onDelete: (fileId: string) => Promise<void> | void
  categories: Record<string, FileCategoryConfig>
  translationNamespace?: string
  editableFields?: {
    name?: boolean
    category?: boolean
    description?: boolean
    isPublic?: boolean
  }
}

export function GenericFilePreviewModal({
  file,
  open,
  onOpenChange,
  canEdit,
  onFileUpdate,
  onDelete,
  categories,
  translationNamespace = 'files',
  editableFields = {
    name: true,
    category: true,
    description: true,
    isPublic: true
  }
}: GenericFilePreviewModalProps) {
  const t = useTranslations(translationNamespace)
  const tCommon = useTranslations('common')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    originalName: file.originalName,
    description: file.description || '',
    category: file.category,
    isPublic: file.isPublic ?? false
  })

  // Reset edit data when file changes
  useEffect(() => {
    setEditData({
      originalName: file.originalName,
      description: file.description || '',
      category: file.category,
      isPublic: file.isPublic ?? false
    })
    setEditMode(false)
  }, [file.id, file.originalName, file.description, file.category, file.isPublic])

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = () => {
    onDelete(file.id)
    onOpenChange(false)
    setShowDeleteDialog(false)
  }

  const categoryConfig = categories[file.category] || Object.values(categories)[0]
  const CategoryIcon = categoryConfig.icon

  const handleSave = async () => {
    const updatedFile = {
      ...file,
      originalName: editData.originalName,
      description: editData.description,
      category: editData.category,
      isPublic: editData.isPublic
    }
    await onFileUpdate(updatedFile)
    setEditMode(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  const isAudio = file.type.startsWith('audio/')
  const isPDF = file.type === 'application/pdf'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/80 backdrop-blur-2xl border border-white/20 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${categoryConfig.color}`}>
                <CategoryIcon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-left text-gray-900 font-semibold">{file.originalName}</DialogTitle>
                <DialogDescription className="text-left text-gray-600">
                  {categoryConfig.label} • {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                </DialogDescription>
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {editMode ? (tCommon('cancel') || 'Cancel') : (t('edit') || 'Edit')}
                </Button>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteClick}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            {isImage && (
              <img 
                src={file.url} 
                alt={file.originalName}
                className="max-w-full h-auto max-h-96 mx-auto rounded-lg"
              />
            )}
            {isVideo && (
              <video 
                controls 
                className="max-w-full h-auto max-h-96 mx-auto rounded-lg"
              >
                <source src={file.url} type={file.type} />
                Your browser does not support the video tag.
              </video>
            )}
            {isAudio && (
              <div className="flex items-center justify-center py-12">
                <audio controls className="w-full max-w-md">
                  <source src={file.url} type={file.type} />
                  Your browser does not support the audio tag.
                </audio>
              </div>
            )}
            {isPDF && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('openInNewTab') || 'Open in New Tab'}
                    </a>
                  </Button>
                </div>
                <div className="relative w-full" style={{ height: '600px' }}>
                  <iframe
                    src={`${file.url}#toolbar=1&navpanes=1&scrollbar=1`}
                    className="w-full h-full rounded-lg border-2 border-gray-200"
                    title={file.originalName}
                  />
                </div>
              </div>
            )}
            {!isImage && !isVideo && !isAudio && !isPDF && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CategoryIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">{t('previewNotAvailable') || 'Preview not available'}</p>
                  <Button asChild>
                    <a href={file.url} download>
                      <Download className="h-4 w-4 mr-2" />
                      {t('download') || 'Download File'}
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* File Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t('fileName') || 'File Name'}</Label>
                <p className="text-sm text-gray-600">{file.originalName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('fileSize') || 'File Size'}</Label>
                <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('fileType') || 'File Type'}</Label>
                <p className="text-sm text-gray-600">{file.type}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('uploaded') || 'Uploaded'}</Label>
                <p className="text-sm text-gray-600">
                  {new Date(file.uploadedAt).toLocaleString()}
                  {file.uploaderName && ` by ${file.uploaderName}`}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {editMode ? (
                <>
                  {editableFields.name && (
                    <div>
                      <Label htmlFor="filename" className="text-sm font-semibold text-gray-900">
                        {t('fileName') || 'File Name'}
                      </Label>
                      <Input
                        type="text"
                        id="filename"
                        value={editData.originalName}
                        onChange={(e) => setEditData(prev => ({ ...prev, originalName: e.target.value }))}
                        className="mt-1"
                        placeholder={t('enterFileName') || 'Enter file name...'}
                      />
                    </div>
                  )}
                  {editableFields.category && Object.keys(categories).length > 1 && (
                    <div>
                      <Label htmlFor="category" className="text-sm font-semibold text-gray-900">
                        {t('category') || 'Category'}
                      </Label>
                      <Select 
                        value={editData.category} 
                        onValueChange={(value) => setEditData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categories).map(([key, cat]) => {
                            const CatIcon = cat.icon
                            return (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <CatIcon className="h-4 w-4" />
                                  <span>{cat.label}</span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {editableFields.description && (
                    <div>
                      <Label htmlFor="description" className="text-sm font-semibold text-gray-900">
                        {t('description') || 'Description'}
                      </Label>
                      <Textarea
                        id="description"
                        value={editData.description}
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1"
                        rows={3}
                        placeholder={t('enterDescription') || 'Enter description...'}
                      />
                    </div>
                  )}
                  {editableFields.isPublic && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isPublic"
                        checked={editData.isPublic}
                        onCheckedChange={(checked) => setEditData(prev => ({ ...prev, isPublic: checked as boolean }))}
                      />
                      <Label htmlFor="isPublic" className="text-sm font-medium cursor-pointer">
                        {t('isPublic') || 'Public File'}
                      </Label>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} size="sm">
                      {t('save') || 'Save'}
                    </Button>
                    <Button onClick={() => setEditMode(false)} variant="outline" size="sm">
                      {tCommon('cancel') || 'Cancel'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {file.description && (
                    <div>
                      <Label className="text-sm font-medium">{t('description') || 'Description'}</Label>
                      <p className="text-sm text-gray-600">{file.description}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">{t('category') || 'Category'}</Label>
                    <p className="text-sm text-gray-600">{categoryConfig.label}</p>
                  </div>
                  {editableFields.isPublic !== false && (
                    <div>
                      <Label className="text-sm font-medium">{t('visibility') || 'Visibility'}</Label>
                      <p className="text-sm text-gray-600">
                        {file.isPublic ? (t('public') || 'Public') : (t('private') || 'Private')}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={file.url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        {t('download') || 'Download'}
                      </a>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteConfirm}
        title={t('delete') || 'Delete File'}
        description={t('confirmDelete') || 'Are you sure you want to delete this file? This action cannot be undone.'}
        confirmText={t('delete') || 'Delete'}
        cancelText={tCommon('cancel') || 'Cancel'}
        variant="destructive"
      />
    </Dialog>
  )
}

