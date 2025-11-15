'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { GenericFileUploader, GenericFilePreviewModal, type FileCategoryConfig, type GenericFile } from './index'
import { usePrefetchStorageRules } from '@/hooks/use-prefetch-storage-rules'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { 
  FolderOpen, 
  Grid,
  List,
  Plus,
  Search,
  Eye,
  Download,
  Trash2,
  Upload,
  Edit,
  Save,
  X
} from 'lucide-react'

// Helper function to format file size (used by child components)
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export interface GenericFileManagerProps<T extends GenericFile = GenericFile> {
  files: T[]
  onFilesChange?: (files: T[]) => void
  canEdit?: boolean
  viewMode?: 'grid' | 'list'
  showUpload?: boolean
  categories: Record<string, FileCategoryConfig>
  onUpload: (files: Array<{ file: File; category: string }>) => Promise<void>
  onFileUpdate?: (file: T) => Promise<void> | void
  onFileDelete: (fileId: string) => Promise<void> | void
  onFilePreview?: (file: T) => void
  translationNamespace?: string
  title?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
  showCategories?: boolean
  showSearch?: boolean
  showViewToggle?: boolean
  defaultCategory?: string
  accept?: string
  maxFileSize?: number
  bucketName?: string // Bucket name to fetch storage rules from
  getCategoryFromFile?: (file: T) => string
  getFileUrl?: (file: T) => string
}

export function GenericFileManager<T extends GenericFile = GenericFile>({
  files: initialFiles,
  onFilesChange,
  canEdit = false,
  viewMode: initialViewMode = 'grid',
  showUpload = true,
  categories,
  onUpload,
  onFileUpdate,
  onFileDelete,
  onFilePreview,
  translationNamespace = 'files',
  title,
  emptyStateTitle,
  emptyStateDescription,
  showCategories = true,
  showSearch = true,
  showViewToggle = true,
  defaultCategory,
  accept,
  maxFileSize = 50,
  bucketName,
  getCategoryFromFile,
  getFileUrl
}: GenericFileManagerProps<T>) {
  const t = useTranslations(translationNamespace)
  const [files, setFiles] = useState<T[]>(initialFiles)
  const [filteredFiles, setFilteredFiles] = useState<T[]>(initialFiles)
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode)
  const [selectedFile, setSelectedFile] = useState<T | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; fileId: string | null }>({ open: false, fileId: null })

  // Prefetch storage rules using centralized hook
  const { prefetch } = usePrefetchStorageRules(bucketName)

  // Sync files with initialFiles
  useEffect(() => {
    setFiles(initialFiles)
  }, [initialFiles])

  // Filter files based on category and search
  useEffect(() => {
    let filtered = files

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(file => {
        const fileCategory = getCategoryFromFile ? getCategoryFromFile(file) : file.category
        return fileCategory === selectedCategory
      })
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(file => {
        const categoryLabel = categories[file.category]?.label || file.category
        return (
          file.name.toLowerCase().includes(query) ||
          file.originalName.toLowerCase().includes(query) ||
          file.description?.toLowerCase().includes(query) ||
          categoryLabel.toLowerCase().includes(query)
        )
      })
    }

    setFilteredFiles(filtered)
  }, [files, selectedCategory, searchQuery, categories, getCategoryFromFile])

  // Notify parent when files change
  const notifyParent = useCallback((updatedFiles: T[]) => {
    onFilesChange?.(updatedFiles)
  }, [onFilesChange])

  const handleFileUpload = async (filesWithCategories: Array<{ file: File; category: string }>) => {
    if (!filesWithCategories.length) return

    setUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < filesWithCategories.length; i++) {
        setUploadProgress(((i + 1) / filesWithCategories.length) * 100)
      }

      await onUpload(filesWithCategories)
      
      setShowUploadDialog(false)
      toast.success('Upload Successful', { description: `Successfully uploaded ${filesWithCategories.length} file(s)` })
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload files. Please try again.'
      toast.error('Upload Error', { description: errorMessage })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteClick = (fileId: string) => {
    setDeleteDialog({ open: true, fileId })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.fileId) return

    try {
      await onFileDelete(deleteDialog.fileId)
      
      const updatedFiles = files.filter(f => f.id !== deleteDialog.fileId)
      setFiles(updatedFiles)
      notifyParent(updatedFiles)
      
      toast.success('File Deleted', { description: t('deleteSuccess') || 'File deleted successfully' })
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error('Delete Failed', { description: t('deleteError') || 'Failed to delete file' })
    } finally {
      setDeleteDialog({ open: false, fileId: null })
    }
  }

  const handlePreviewFile = (file: T) => {
    if (onFilePreview) {
      onFilePreview(file)
    } else {
      setSelectedFile(file)
      setShowPreview(true)
    }
  }

  const getCategoryStats = () => {
    const stats: Record<string, number> = { 
      all: files.length
    }
    
    Object.keys(categories).forEach(category => {
      stats[category] = files.filter(f => {
        const fileCategory = getCategoryFromFile ? getCategoryFromFile(f) : f.category
        return fileCategory === category
      }).length
    })

    return stats
  }

  const categoryStats = getCategoryStats()
  const categoryKeys = Object.keys(categories)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {title || t('caseFiles') || 'Files'}
          </h3>
          <p className="text-sm text-gray-600">
            {t('fileCount', { count: files.length }) || `${files.length} file(s)`} • {formatFileSize(files.reduce((total, file) => total + file.size, 0))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          {showViewToggle && (
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Upload Button */}
          {canEdit && showUpload && (
            <>
              <Button 
                onClick={() => setShowUploadDialog(true)}
                onMouseEnter={prefetch}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('uploadFiles') || 'Upload Files'}
              </Button>
              <GenericFileUploader
                open={showUploadDialog}
                onOpenChange={setShowUploadDialog}
                onUpload={handleFileUpload}
                uploading={uploading}
                progress={uploadProgress}
                categories={categories}
                defaultCategory={defaultCategory || categoryKeys[0]}
                translationNamespace={translationNamespace}
                accept={accept}
                maxFileSize={maxFileSize}
                bucketName={bucketName}
              />
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('searchFiles') || 'Search files...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Split Layout: Sidebar + Content */}
      <div className="flex gap-6">
        {/* Left Sidebar - Categories */}
        {showCategories && categoryKeys.length > 0 && (
          <aside className="w-64 flex-shrink-0">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  {t('categories') || 'Categories'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2">
                {/* All Categories */}
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className={`p-1.5 rounded-md ${selectedCategory === 'all' ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <FolderOpen className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{t('allCategories') || 'All Categories'}</p>
                  </div>
                  <Badge variant={selectedCategory === 'all' ? 'secondary' : 'outline'} className={selectedCategory === 'all' ? 'bg-blue-600 text-white' : ''}>
                    {categoryStats.all}
                  </Badge>
                </button>

                {/* Category Buttons */}
                {categoryKeys.map((key) => {
                  const category = categories[key]
                  const IconComponent = category.icon
                  const count = categoryStats[key] || 0
                  const isSelected = selectedCategory === key
                  
                  // Extract color for selected state
                  const baseColor = category.color.split('-')[1] || 'blue'
                  const selectedBg = `bg-${baseColor}-500`
                  const selectedIconBg = `bg-${baseColor}-600`
                  
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        isSelected
                          ? `${selectedBg} text-white shadow-md`
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${isSelected ? selectedIconBg : 'bg-gray-200'}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{category.label}</p>
                      </div>
                      <Badge 
                        variant={isSelected ? 'secondary' : 'outline'}
                        className={isSelected ? `${selectedIconBg} text-white` : ''}
                      >
                        {count}
                      </Badge>
                    </button>
                  )
                })}
              </CardContent>
            </Card>
          </aside>
        )}

        {/* Right Content - Files */}
        <div className="flex-1 min-w-0">
          {filteredFiles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {emptyStateTitle || t('noFiles') || 'No files uploaded yet'}
                </h3>
                <p className="text-gray-600 text-center mb-4">
                  {emptyStateDescription || t('noFilesDescription') || 'Upload supporting documents'}
                </p>
                {canEdit && showUpload && !searchQuery && selectedCategory === 'all' && (
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('addFiles') || 'Add Files'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <GenericFileGrid 
              files={filteredFiles} 
              viewMode={viewMode}
              canEdit={canEdit}
              onPreview={handlePreviewFile}
              onDelete={handleDeleteClick}
              onUpdate={onFileUpdate ? async (file: GenericFile) => {
                if (onFileUpdate) {
                  await onFileUpdate(file as T)
                  // Update local state
                  const updatedFiles = files.map(f => 
                    f.id === file.id ? file as T : f
                  )
                  setFiles(updatedFiles)
                  notifyParent(updatedFiles)
                }
              } : undefined}
              categories={categories}
              getCategoryFromFile={getCategoryFromFile}
              getFileUrl={getFileUrl}
              translationNamespace={translationNamespace}
            />
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {selectedFile && (
        <GenericFilePreviewModal
          file={selectedFile}
          open={showPreview}
          onOpenChange={setShowPreview}
          canEdit={canEdit}
          onFileUpdate={async (updatedFile: GenericFile) => {
            if (onFileUpdate) {
              await onFileUpdate(updatedFile as T)
              // Reload files or update state
              const updatedFiles = files.map(f => 
                f.id === updatedFile.id ? updatedFile as T : f
              )
              setFiles(updatedFiles)
              notifyParent(updatedFiles)
            }
          }}
          onDelete={handleDeleteClick}
          categories={categories}
          translationNamespace={translationNamespace}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, fileId: deleteDialog.fileId })}
        onConfirm={handleDeleteConfirm}
        title={t('delete') || 'Delete File'}
        description={t('confirmDelete') || 'Are you sure you want to delete this file? This action cannot be undone.'}
        confirmText={t('delete') || 'Delete'}
        cancelText={t('cancel') || 'Cancel'}
        variant="destructive"
      />
    </div>
  )
}

// Generic File Grid Component
interface GenericFileGridProps<T extends GenericFile = GenericFile> {
  files: T[]
  viewMode: 'grid' | 'list'
  canEdit: boolean
  onPreview: (file: T) => void
  onDelete: (fileId: string) => void
  onUpdate?: (file: GenericFile) => Promise<void> | void
  categories: Record<string, FileCategoryConfig>
  getCategoryFromFile?: (file: T) => string
  getFileUrl?: (file: T) => string
  translationNamespace?: string
}

function GenericFileGrid<T extends GenericFile = GenericFile>({ 
  files, 
  viewMode, 
  canEdit, 
  onPreview, 
  onDelete,
  onUpdate,
  categories,
  getCategoryFromFile,
  getFileUrl,
  translationNamespace = 'files'
}: GenericFileGridProps<T>) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {files.map((file) => (
          <GenericFileListItem 
            key={file.id} 
            file={file} 
            canEdit={canEdit}
            onPreview={onPreview}
            onDelete={onDelete}
            onUpdate={onUpdate}
            categories={categories}
            getCategoryFromFile={getCategoryFromFile}
            getFileUrl={getFileUrl}
            translationNamespace={translationNamespace}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {files.map((file) => (
        <GenericFileGridItem 
          key={file.id} 
          file={file} 
          canEdit={canEdit}
          onPreview={onPreview}
          onDelete={onDelete}
          onUpdate={onUpdate}
          categories={categories}
          getCategoryFromFile={getCategoryFromFile}
          getFileUrl={getFileUrl}
          translationNamespace={translationNamespace}
        />
      ))}
    </div>
  )
}

// Generic File Grid Item Component
interface GenericFileItemProps<T extends GenericFile = GenericFile> {
  file: T
  canEdit: boolean
  onPreview: (file: T) => void
  onDelete: (fileId: string) => void
  onUpdate?: (file: GenericFile) => Promise<void> | void
  categories: Record<string, FileCategoryConfig>
  getCategoryFromFile?: (file: T) => string
  getFileUrl?: (file: T) => string
  translationNamespace?: string
}

function GenericFileGridItem<T extends GenericFile = GenericFile>({ 
  file, 
  canEdit, 
  onPreview, 
  onDelete,
  onUpdate,
  categories,
  getCategoryFromFile,
  getFileUrl,
  translationNamespace = 'files'
}: GenericFileItemProps<T>) {
  const t = useTranslations(translationNamespace)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    originalName: file.originalName,
    description: file.description || '',
    category: getCategoryFromFile ? getCategoryFromFile(file) : file.category,
    isPublic: file.isPublic ?? false
  })
  const [isSaving, setIsSaving] = useState(false)

  // Sync edit data when file changes
  useEffect(() => {
    if (!isEditing) {
      setEditData({
        originalName: file.originalName,
        description: file.description || '',
        category: getCategoryFromFile ? getCategoryFromFile(file) : file.category,
        isPublic: file.isPublic ?? false
      })
    }
  }, [file.id, file.originalName, file.description, file.category, file.isPublic, isEditing, getCategoryFromFile])

  const fileCategory = getCategoryFromFile ? getCategoryFromFile(file) : file.category
  const category = categories[fileCategory] || Object.values(categories)[0]
  const IconComponent = category.icon
  const fileUrl = getFileUrl ? getFileUrl(file) : file.url

  const handleStartEdit = () => {
    setEditData({
      originalName: file.originalName,
      description: file.description || '',
      category: getCategoryFromFile ? getCategoryFromFile(file) : file.category,
      isPublic: file.isPublic ?? false
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditData({
      originalName: file.originalName,
      description: file.description || '',
      category: getCategoryFromFile ? getCategoryFromFile(file) : file.category,
      isPublic: file.isPublic ?? false
    })
  }

  const handleSave = async () => {
    if (!onUpdate) return

    setIsSaving(true)
    try {
      const updatedFile: GenericFile = {
        ...file,
        originalName: editData.originalName,
        description: editData.description,
        category: editData.category,
        isPublic: editData.isPublic
      }
      await onUpdate(updatedFile)
      setIsEditing(false)
      toast.success('File Updated', { description: t('fileUpdated') || 'File updated successfully' })
    } catch (error) {
      console.error('Error updating file:', error)
      toast.error('Update Failed', { description: t('updateError') || 'Failed to update file' })
    } finally {
      setIsSaving(false)
    }
  }

  const currentCategory = categories[editData.category] || category

  return (
    <Card className="group hover:shadow-lg hover:border-gray-300 transition-all overflow-hidden">
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* File Icon with Category Badge on Top */}
          <div className="flex items-center justify-between">
            <div className={`p-4 rounded-xl ${currentCategory.color}`}>
              <IconComponent className="h-8 w-8" />
            </div>
            {canEdit && !isEditing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStartEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-gray-700">
                  {t('fileName') || 'File Name'}
                </Label>
                <Input
                  value={editData.originalName}
                  onChange={(e) => setEditData(prev => ({ ...prev, originalName: e.target.value }))}
                  className="mt-1 text-sm"
                  placeholder={t('enterFileName') || 'Enter file name...'}
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-700">
                  {t('category') || 'Category'}
                </Label>
                <Select
                  value={editData.category}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="mt-1 text-sm">
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

              <div>
                <Label className="text-xs font-medium text-gray-700">
                  {t('description') || 'Description'}
                </Label>
                <Textarea
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1 text-sm min-h-[60px]"
                  placeholder={t('enterDescription') || 'Enter description...'}
                />
              </div>

              {'isPublic' in file && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex flex-col">
                    <Label className="text-xs font-medium text-gray-700">
                      {t('isPublic') || 'Public File'}
                    </Label>
                    <span className="text-xs text-gray-500">
                      {editData.isPublic ? (t('public') || 'Visible to all users') : (t('private') || 'Only visible to authorized users')}
                    </span>
                  </div>
                  <Switch
                    checked={editData.isPublic}
                    onCheckedChange={(checked) => setEditData(prev => ({ ...prev, isPublic: checked }))}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex-1"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('cancel') || 'Cancel'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="flex-1"
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
                </Button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <>
              {/* Category Badge Below Icon */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={`text-xs ${currentCategory.color.replace('border', 'bg').replace('-200', '-100')}`}>
                  {currentCategory.label}
                </Badge>
                {'isPublic' in file && (
                  <Badge 
                    variant="outline" 
                    className={`ml-0 text-xs ${
                      file.isPublic 
                        ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {file.isPublic ? (t('public') || 'Public') : (t('private') || 'Private')}
                  </Badge>
                )}
              </div>

              {/* File Info - More Prominent */}
              <div>
                <h4 className="font-semibold text-base text-gray-900 mb-1 line-clamp-2" title={file.originalName}>
                  {file.originalName}
                </h4>
                <p className="text-sm text-gray-500">
                  {formatFileSize(file.size)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Description */}
              {file.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {file.description}
                </p>
              )}

              {/* Actions - Fixed Width Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                <Button size="sm" variant="outline" onClick={() => onPreview(file)}>
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="text-xs">View</span>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1" />
                    <span className="text-xs">Download</span>
                  </a>
                </Button>
                {canEdit && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onDelete(file.id)}
                    className="col-span-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span className="text-xs">Delete</span>
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Generic File List Item Component
function GenericFileListItem<T extends GenericFile = GenericFile>({ 
  file, 
  canEdit, 
  onPreview, 
  onDelete,
  onUpdate,
  categories,
  getCategoryFromFile,
  getFileUrl,
  translationNamespace = 'files'
}: GenericFileItemProps<T>) {
  const t = useTranslations(translationNamespace)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    originalName: file.originalName,
    description: file.description || '',
    category: getCategoryFromFile ? getCategoryFromFile(file) : file.category,
    isPublic: file.isPublic ?? false
  })
  const [isSaving, setIsSaving] = useState(false)

  // Sync edit data when file changes
  useEffect(() => {
    if (!isEditing) {
      setEditData({
        originalName: file.originalName,
        description: file.description || '',
        category: getCategoryFromFile ? getCategoryFromFile(file) : file.category,
        isPublic: file.isPublic ?? false
      })
    }
  }, [file.id, file.originalName, file.description, file.category, file.isPublic, isEditing, getCategoryFromFile])

  const fileCategory = getCategoryFromFile ? getCategoryFromFile(file) : file.category
  const category = categories[fileCategory] || Object.values(categories)[0]
  const IconComponent = category.icon
  const fileUrl = getFileUrl ? getFileUrl(file) : file.url

  const handleStartEdit = () => {
    setEditData({
      originalName: file.originalName,
      description: file.description || '',
      category: getCategoryFromFile ? getCategoryFromFile(file) : file.category,
      isPublic: file.isPublic ?? false
    })
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditData({
      originalName: file.originalName,
      description: file.description || '',
      category: getCategoryFromFile ? getCategoryFromFile(file) : file.category,
      isPublic: file.isPublic ?? false
    })
  }

  const handleSave = async () => {
    if (!onUpdate) return

    setIsSaving(true)
    try {
      const updatedFile: GenericFile = {
        ...file,
        originalName: editData.originalName,
        description: editData.description,
        category: editData.category,
        isPublic: editData.isPublic
      }
      await onUpdate(updatedFile)
      setIsEditing(false)
      toast.success('File Updated', { description: t('fileUpdated') || 'File updated successfully' })
    } catch (error) {
      console.error('Error updating file:', error)
      toast.error('Update Failed', { description: t('updateError') || 'Failed to update file' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <Card className="border-blue-300">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-700">
                {t('fileName') || 'File Name'}
              </Label>
              <Input
                value={editData.originalName}
                onChange={(e) => setEditData(prev => ({ ...prev, originalName: e.target.value }))}
                className="mt-1 text-sm"
                placeholder={t('enterFileName') || 'Enter file name...'}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium text-gray-700">
                  {t('category') || 'Category'}
                </Label>
                <Select
                  value={editData.category}
                  onValueChange={(value) => setEditData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="mt-1 text-sm">
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

              {'isPublic' in file && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex flex-col">
                    <Label className="text-xs font-medium text-gray-700">
                      {t('isPublic') || 'Public'}
                    </Label>
                  </div>
                  <Switch
                    checked={editData.isPublic}
                    onCheckedChange={(checked) => setEditData(prev => ({ ...prev, isPublic: checked }))}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                className="flex-1"
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                {t('cancel') || 'Cancel'}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="flex-1"
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="group hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${category.color}`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-gray-900 truncate" title={file.originalName}>
                {file.originalName}
              </h4>
              <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                <span>{category.label}</span>
                {'isPublic' in file && (
                  <>
                    <span>•</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        file.isPublic 
                          ? 'bg-green-100 text-green-800 border-green-300' 
                          : 'bg-gray-100 text-gray-700 border-gray-300'
                      }`}
                    >
                      {file.isPublic ? (t('public') || 'Public') : (t('private') || 'Private')}
                    </Badge>
                  </>
                )}
                <span>•</span>
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {canEdit && onUpdate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleStartEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onPreview(file)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
            {canEdit && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => onDelete(file.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

