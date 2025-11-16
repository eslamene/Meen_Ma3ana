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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { GenericFileUploader, GenericFilePreviewModal, type FileCategoryConfig, type GenericFile } from '@/components/files'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  FileAudio, 
  File, 
  Eye, 
  Download, 
  Trash2, 
  User,
  FileCheck,
  Grid,
  List,
  Plus,
  Search,
  FolderOpen,
  Upload,
  Edit,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePrefetchStorageRules } from '@/hooks/use-prefetch-storage-rules'

// Sanitize filename for storage (remove special characters, Arabic, emojis, etc.)
function sanitizeFilename(filename: string): string {
  // Get file extension
  const lastDotIndex = filename.lastIndexOf('.')
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename
  const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : ''
  
  // Replace any non-ASCII characters, spaces, and special chars with dash
  const sanitized = name
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII (Arabic, Chinese, etc.)
    .replace(/[^a-zA-Z0-9]/g, '-') // Replace special chars with dash
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-|-$/g, '') // Remove leading/trailing dashes
    .substring(0, 50) // Limit length
  
  // If nothing left after sanitization, use 'file'
  const finalName = sanitized || 'file'
  
  return finalName + ext.toLowerCase()
}

// File categories for organization
export const FILE_CATEGORIES = {
  medical: {
    label: 'Medical Documents',
    description: 'Medical reports, prescriptions, test results',
    icon: FileCheck,
    color: 'bg-red-100 text-red-800 border-red-200',
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  },
  financial: {
    label: 'Financial Documents',
    description: 'Bills, receipts, financial statements',
    icon: FileText,
    color: 'bg-green-100 text-green-800 border-green-200',
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  },
  identity: {
    label: 'Identity Documents',
    description: 'ID cards, passports, certificates',
    icon: User,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  },
  photos: {
    label: 'Photos & Images',
    description: 'Case photos, before/after images',
    icon: ImageIcon,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']
  },
  videos: {
    label: 'Videos',
    description: 'Case videos, testimonials',
    icon: Video,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    allowedTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi']
  },
  audio: {
    label: 'Audio Files',
    description: 'Voice recordings, audio testimonials',
    icon: FileAudio,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    allowedTypes: ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a']
  },
  other: {
    label: 'Other Documents',
    description: 'Other supporting documents',
    icon: File,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  }
} as const

export type FileCategory = keyof typeof FILE_CATEGORIES

export interface CaseFile extends GenericFile {
  name: string // Alias for originalName (for backward compatibility)
  path?: string // Storage path (may differ from display name)
  uploadedBy: string
  uploaderName?: string
  thumbnail?: string
}

// Helper function to format file size (used by child components)
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

interface CaseFileManagerProps {
  caseId: string
  files: CaseFile[]
  canEdit?: boolean
  onFilesChange?: (files: CaseFile[]) => void
  viewMode?: 'grid' | 'list'
  showUpload?: boolean
}

export default function CaseFileManager({ 
  caseId, 
  files: initialFiles, 
  canEdit = false, 
  onFilesChange,
  viewMode: initialViewMode = 'grid',
  showUpload = true
}: CaseFileManagerProps) {
  const t = useTranslations('cases.files')
  const [files, setFiles] = useState<CaseFile[]>(initialFiles)
  const [filteredFiles, setFilteredFiles] = useState<CaseFile[]>(initialFiles)
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode)
  const [selectedFile, setSelectedFile] = useState<CaseFile | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; fileId: string | null }>({ open: false, fileId: null })
  
  const supabase = createClient()

  // Prefetch storage rules using centralized hook
  const { prefetch } = usePrefetchStorageRules('case-files')

  // Filter files based on category and search
  useEffect(() => {
    let filtered = files

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(file => file.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(query) ||
        file.originalName.toLowerCase().includes(query) ||
        file.description?.toLowerCase().includes(query) ||
        (FILE_CATEGORIES as unknown as Record<string, FileCategoryConfig>)[file.category]?.label.toLowerCase().includes(query)
      )
    }

    setFilteredFiles(filtered)
  }, [files, selectedCategory, searchQuery])

  // Notify parent when files change (but avoid infinite loops)
  const notifyParent = useCallback((updatedFiles: CaseFile[]) => {
    onFilesChange?.(updatedFiles)
  }, [onFilesChange])

  const getFileIcon = (file: CaseFile) => {
    const category = (FILE_CATEGORIES as unknown as Record<string, FileCategoryConfig>)[file.category]
    return category?.icon
  }

  const handleFileUpload = async (filesWithCategories: Array<{ file: File; category: string }>) => {
    if (!filesWithCategories.length) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const newFiles: CaseFile[] = []
      
      for (let i = 0; i < filesWithCategories.length; i++) {
        const { file, category} = filesWithCategories[i]
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // Sanitize filename for storage (remove Arabic chars, special chars, etc.)
        const sanitizedName = sanitizeFilename(file.name)
        
        // Upload to Supabase Storage with sanitized filename
        const storagePath = `${caseId}/${category}/${fileId}-${sanitizedName}`
        const { data, error } = await supabase.storage
          .from('case-files')
          .upload(storagePath, file)

        if (error) {
          console.error('Upload error:', error)
          console.error(`Failed to upload ${file.name}: ${error.message}`)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('case-files')
          .getPublicUrl(storagePath)

        const newFile: CaseFile = {
          id: fileId,
          name: file.name, // Keep original name for display
          originalName: file.name,
          url: publicUrl,
          path: storagePath, // Store the storage path
          size: file.size,
          type: file.type,
          category,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'current-user', // TODO: Get from auth
          isPublic: false
        }

        newFiles.push(newFile)
        setUploadProgress(((i + 1) / filesWithCategories.length) * 100)
      }

      // Insert files into case_files table
      if (newFiles.length > 0) {
        const filesToInsert = newFiles.map(f => ({
          case_id: caseId,
          filename: f.originalName || f.name || 'unnamed-file',
          original_filename: f.originalName || f.name || 'unnamed-file',
          file_url: f.url,
          file_path: f.path,
          file_type: f.type || 'application/octet-stream',
          file_size: f.size || 0,
          category: f.category || 'other',
          description: f.description || null,
          is_public: f.isPublic || false,
          display_order: files.length + newFiles.indexOf(f)
        }))

        // Log what we're trying to insert (for debugging)
        console.log('Attempting to insert files:', {
          count: filesToInsert.length,
          caseId,
          sample: filesToInsert[0] ? {
            case_id: filesToInsert[0].case_id,
            filename: filesToInsert[0].filename,
            file_url: filesToInsert[0].file_url ? 'present' : 'missing',
            file_type: filesToInsert[0].file_type
          } : null
        })

        // Verify case still exists before inserting (prevents 409 on deleted draft cases)
        const { data: caseCheck, error: caseCheckError } = await supabase
          .from('cases')
          .select('id')
          .eq('id', caseId)
          .single()

        if (caseCheckError || !caseCheck) {
          console.error('Case not found before file insert:', {
            caseId,
            error: caseCheckError
          })
          toast.error('Case Not Found', {
            description: 'The case was deleted or does not exist. Files were uploaded to storage but could not be saved to the database.'
          })
          // Clean up uploaded files from storage since we can't save them
          for (const file of newFiles) {
            if (file.path) {
              await supabase.storage
                .from('case-files')
                .remove([file.path])
                .catch(err => console.warn('Failed to cleanup storage file:', err))
            }
          }
          return
        }

        const { data: insertData, error: insertError } = await supabase
          .from('case_files')
          .insert(filesToInsert)
          .select()

        if (insertError) {
          // Better error serialization
          const errorInfo = {
            code: insertError.code || 'UNKNOWN',
            message: insertError.message || 'No error message',
            details: insertError.details || null,
            hint: insertError.hint || null,
            // Try to stringify the full error
            errorString: JSON.stringify(insertError, Object.getOwnPropertyNames(insertError)),
            // Log the data we tried to insert
            attemptedInsert: {
              count: filesToInsert.length,
              firstFile: filesToInsert[0] ? {
                case_id: filesToInsert[0].case_id,
                filename: filesToInsert[0].filename,
                has_url: !!filesToInsert[0].file_url,
                file_type: filesToInsert[0].file_type
              } : null
            }
          }
          
          console.error('Error inserting files into database:', errorInfo)
          console.error('Full error object:', insertError)
          
          // More user-friendly error message based on error type
          let userMessage = 'Files uploaded but failed to save to database.'
          
          // Handle HTTP 409 Conflict (from PostgREST)
          if (insertError.code === 'PGRST409' || insertError.message?.includes('409') || insertError.message?.includes('conflict')) {
            userMessage = 'Failed to save files: Conflict detected. The case may have been deleted or the files already exist. Please refresh and try again.'
            // Clean up uploaded files from storage
            for (const file of newFiles) {
              if (file.path) {
                await supabase.storage
                  .from('case-files')
                  .remove([file.path])
                  .catch(err => console.warn('Failed to cleanup storage file:', err))
              }
            }
          } else if (insertError.code === '23503') {
            userMessage = 'Failed to save files: Case not found. Please refresh the page and try again.'
          } else if (insertError.code === '23505') {
            userMessage = 'Failed to save files: Duplicate file detected. This file may already exist for this case.'
          } else if (insertError.code === '42501') {
            userMessage = 'Failed to save files: Permission denied. You may not have permission to add files to this case.'
          } else if (insertError.message) {
            userMessage = `Failed to save files: ${insertError.message}`
          }
          
          toast.error('Database Error', { description: userMessage })
        } else {
          console.log('Successfully inserted files:', insertData?.length || 0)
        }
      }

      // Update files state
      const updatedFiles = [...files, ...newFiles]
      setFiles(updatedFiles)
      
      // Notify parent component
      notifyParent(updatedFiles)

      console.log(`Successfully uploaded ${newFiles.length} file(s)`)
      
      toast.success('Files Uploaded', {
        description: `Successfully uploaded ${newFiles.length} file(s)`
      })

      setShowUploadDialog(false)
    } catch (error) {
      // Log detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Upload error:', {
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      })
      toast.error('Upload Failed', {
        description: `An error occurred while uploading files: ${errorMessage}`
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const updateCaseSupportingDocuments = async (updatedFiles: CaseFile[]) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ 
          supporting_documents: JSON.stringify(updatedFiles.map(f => ({
            id: f.id,
            name: f.name,
            originalName: f.originalName,
            url: f.url,
            size: f.size,
            type: f.type,
            category: f.category,
            description: f.description,
            uploadedAt: f.uploadedAt,
            uploadedBy: f.uploadedBy,
            isPublic: f.isPublic
          })))
        })
        .eq('id', caseId)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error updating case documents:', error)
      throw error
    }
  }

  const handleDeleteClick = (fileId: string) => {
    setDeleteDialog({ open: true, fileId })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.fileId) return

    try {
      const fileToDelete = files.find(f => f.id === deleteDialog.fileId)
      if (!fileToDelete) {
        setDeleteDialog({ open: false, fileId: null })
        return
      }

      // Delete from database first (unified case_files table)
      const { error: dbError } = await supabase
        .from('case_files')
        .delete()
        .eq('id', deleteDialog.fileId)
        .eq('case_id', caseId)

      if (dbError) {
        // Properly serialize error for logging
        const errorDetails = {
          message: dbError.message || 'Unknown error',
          code: dbError.code || 'unknown',
          details: dbError.details || null,
          hint: dbError.hint || null,
          error: dbError
        }
        console.error('Database delete error:', JSON.stringify(errorDetails, null, 2))
        console.error('Full error object:', dbError)
        toast.error('Delete Failed', {
          description: `Failed to delete file: ${errorDetails.message}`
        })
        setDeleteDialog({ open: false, fileId: null })
        return
      }

      // Delete from Supabase Storage
      if (fileToDelete.path) {
        const { error: storageError } = await supabase.storage
          .from('case-files')
          .remove([fileToDelete.path])

        if (storageError) {
          // Properly serialize error for logging
          const errorDetails = {
            message: storageError.message || 'Unknown error',
            statusCode: (storageError as any).statusCode || null,
            error: storageError
          }
          console.warn('Storage delete warning:', JSON.stringify(errorDetails, null, 2))
          console.warn('Full storage error object:', storageError)
          // Continue even if storage delete fails
        }
      }

      // Update local state
      const updatedFiles = files.filter(f => f.id !== deleteDialog.fileId)
      setFiles(updatedFiles)
      
      // Notify parent component
      notifyParent(updatedFiles)

      setDeleteDialog({ open: false, fileId: null })

      toast.success('File Deleted', { description: 'File deleted successfully' })
    } catch (error) {
      // Properly serialize error for logging
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        error: error
      }
      console.error('Error deleting file:', JSON.stringify(errorDetails, null, 2))
      console.error('Full error object:', error)
      toast.error('Delete Failed', { description: `Failed to delete file: ${errorDetails.message}` })
      setDeleteDialog({ open: false, fileId: null })
    }
  }

  const handlePreviewFile = (file: CaseFile) => {
    setSelectedFile(file)
    setShowPreview(true)
  }

  const getCategoryStats = () => {
    const stats: Record<FileCategory | 'all', number> = { 
      all: files.length,
      medical: 0,
      financial: 0,
      identity: 0,
      photos: 0,
      videos: 0,
      audio: 0,
      other: 0
    }
    
    Object.keys(FILE_CATEGORIES).forEach(category => {
      stats[category as FileCategory] = files.filter(f => f.category === category).length
    })

    return stats
  }

  const categoryStats = getCategoryStats()

  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="w-full sm:w-auto">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('caseFiles')}</h3>
          <p className="text-xs sm:text-sm text-gray-600">
            {t('fileCount', { count: files.length })} • {formatFileSize(files.reduce((total, file) => total + file.size, 0))}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 sm:h-9"
            >
              <Grid className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 sm:h-9"
            >
              <List className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>

          {/* Upload Button */}
          {canEdit && showUpload && (
            <>
              <Button 
                onClick={() => setShowUploadDialog(true)}
                onMouseEnter={prefetch}
                className="flex-1 sm:flex-initial h-8 sm:h-9 text-xs sm:text-sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t('uploadFiles')}</span>
                <span className="sm:hidden">Upload</span>
              </Button>
              <GenericFileUploader
                open={showUploadDialog}
                onOpenChange={setShowUploadDialog}
                onUpload={handleFileUpload}
                uploading={uploading}
                progress={uploadProgress}
                categories={FILE_CATEGORIES as unknown as Record<string, FileCategoryConfig>}
                defaultCategory="other"
                translationNamespace="cases.files"
                bucketName="case-files"
              />
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
        <Input
          placeholder={t('searchFiles')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 sm:pl-10 h-9 sm:h-10 text-sm"
        />
      </div>

      {/* Mobile Category Filter Button */}
      <div className="sm:hidden">
        <Button
          variant="outline"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full justify-between"
        >
          <span>Categories ({categoryStats[selectedCategory] || 0})</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {/* Split Layout: Sidebar + Content */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {/* Left Sidebar - Categories */}
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} sm:block w-full sm:w-64 flex-shrink-0`}>
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">{t('categories')}</CardTitle>
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
                  <p className="text-sm font-medium">{t('allCategories')}</p>
                </div>
                <Badge variant={selectedCategory === 'all' ? 'secondary' : 'outline'} className={selectedCategory === 'all' ? 'bg-blue-600 text-white' : ''}>
                  {categoryStats.all}
                </Badge>
              </button>

              {/* Category Buttons */}
              {Object.entries(FILE_CATEGORIES).map(([key, category]) => {
                const IconComponent = category.icon
                const count = categoryStats[key as FileCategory] || 0
                const isSelected = selectedCategory === key
                
                // Extract color for selected state
                const baseColor = category.color.split('-')[1] // e.g., 'purple' from 'border-purple-200'
                const selectedBg = `bg-${baseColor}-500`
                const selectedIconBg = `bg-${baseColor}-600`
                
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key as FileCategory)}
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
                      <p className="text-sm font-medium">{t(key as FileCategory)}</p>
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

        {/* Right Content - Files */}
        <div className="flex-1 min-w-0">
          {filteredFiles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noFiles')}</h3>
                <p className="text-gray-600 text-center mb-4">
                  {t('noFilesDescription')}
                </p>
                {canEdit && showUpload && !searchQuery && selectedCategory === 'all' && (
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('addFiles')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <FileGrid 
              files={filteredFiles} 
              viewMode={viewMode}
              canEdit={canEdit}
              onPreview={handlePreviewFile}
              onDelete={handleDeleteClick}
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
            try {
              const caseFile = updatedFile as CaseFile
              console.log('Updating file:', caseFile)
              console.log('Case ID:', caseId)
              console.log('File ID:', caseFile.id)
              
              const url = `/api/cases/${caseId}/files/${caseFile.id}`
              const payload = {
                originalName: caseFile.originalName,
                description: caseFile.description,
                category: caseFile.category,
                isPublic: caseFile.isPublic
              }
              
              console.log('Request URL:', url)
              console.log('Request payload:', payload)
              
              // Update in database
              const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              })

              console.log('API response status:', response.status)
              console.log('API response headers:', Object.fromEntries(response.headers.entries()))
              
              if (!response.ok) {
                let errorText = ''
                try {
                  errorText = await response.text()
                  console.log('Error response text:', errorText)
                  const errorData = JSON.parse(errorText)
                  console.error('Server error response:', errorData)
                  throw new Error(
                    errorData.details || 
                    errorData.message || 
                    errorData.error || 
                    `Failed to update file (${response.status})`
                  )
                } catch (parseError) {
                  console.error('Failed to parse error response:', parseError)
                  console.error('Raw error text:', errorText)
                  throw new Error(`Failed to update file (${response.status}): ${errorText || 'Unknown error'}`)
                }
              }

              const responseData = await response.json()
              console.log('API response data:', responseData)

              // Update local state with the updated file
              const updatedFiles = files.map(f => 
                f.id === caseFile.id 
                  ? { ...caseFile, name: caseFile.originalName } as CaseFile
                  : f
              )
              setFiles(updatedFiles)
              notifyParent(updatedFiles)
              
              toast.success("File Updated", { description: "File updated successfully" })
            } catch (error) {
              console.error('Error updating file:', error)
              console.error('Error message:', (error as Error)?.message)
              console.error('Error details:', error)
              toast.error("Update Failed", { description: "Failed to update file" })
            }
          }}
          onDelete={async (fileId: string) => {
            handleDeleteClick(fileId)
          }}
          categories={FILE_CATEGORIES as unknown as Record<string, FileCategoryConfig>}
          translationNamespace="cases.files"
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
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  )
}


// File Grid Component
interface FileGridProps {
  files: CaseFile[]
  viewMode: 'grid' | 'list'
  canEdit: boolean
  onPreview: (file: CaseFile) => void
  onDelete: (fileId: string) => void
}

function FileGrid({ files, viewMode, canEdit, onPreview, onDelete }: FileGridProps) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {files.map((file) => (
          <FileListItem 
            key={file.id} 
            file={file} 
            canEdit={canEdit}
            onPreview={onPreview}
            onDelete={onDelete}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
      {files.map((file) => (
        <FileGridItem 
          key={file.id} 
          file={file} 
          canEdit={canEdit}
          onPreview={onPreview}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

// File Grid Item Component
interface FileItemProps {
  file: CaseFile
  canEdit: boolean
  onPreview: (file: CaseFile) => void
  onDelete: (fileId: string) => void
}

function FileGridItem({ file, canEdit, onPreview, onDelete }: FileItemProps) {
  const category = (FILE_CATEGORIES as unknown as Record<string, FileCategoryConfig>)[file.category]
  const IconComponent = category?.icon

  return (
    <Card className="group hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer overflow-hidden">
      <CardContent className="p-3 sm:p-5">
        <div className="space-y-3 sm:space-y-4">
          {/* File Icon with Category Badge on Top */}
          <div className="flex items-center justify-between">
            <div className={`p-2 sm:p-4 rounded-lg sm:rounded-xl ${category.color}`}>
              <IconComponent className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
          </div>

          {/* Category Badge Below Icon */}
          <div>
            <Badge variant="secondary" className={`text-xs ${category.color.replace('border', 'bg').replace('-200', '-100')}`}>
              {category.label}
            </Badge>
          </div>

          {/* File Info - More Prominent */}
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 line-clamp-2" title={file.originalName}>
              {file.originalName}
            </h4>
            <p className="text-xs sm:text-sm text-gray-500">
              {formatFileSize(file.size)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(file.uploadedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Description */}
          {file.description && (
            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
              {file.description}
            </p>
          )}

          {/* Actions - Fixed Width Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            <Button size="sm" variant="outline" onClick={() => onPreview(file)} className="h-8 sm:h-9 text-xs">
              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline text-xs">View</span>
            </Button>
            <Button size="sm" variant="outline" asChild className="h-8 sm:h-9 text-xs">
              <a href={file.url} download target="_blank" rel="noopener noreferrer">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline text-xs">Download</span>
              </a>
            </Button>
            {canEdit && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onDelete(file.id)}
                className="col-span-2 h-8 sm:h-9 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="text-xs">Delete</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// File List Item Component
function FileListItem({ file, canEdit, onPreview, onDelete }: FileItemProps) {
  const category = (FILE_CATEGORIES as unknown as Record<string, FileCategoryConfig>)[file.category]
  const IconComponent = category?.icon

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
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{category.label}</span>
                <span>•</span>
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => onPreview(file)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={file.url} download target="_blank" rel="noopener noreferrer">
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

