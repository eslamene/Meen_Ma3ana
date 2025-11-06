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
import { useToast } from '@/hooks/use-toast'
import { SimpleFileUpload } from '@/components/cases/SimpleFileUpload'
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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

export interface CaseFile {
  id: string
  name: string
  originalName: string
  url: string
  path?: string // Storage path (may differ from display name)
  size: number
  type: string
  category: FileCategory
  description?: string
  uploadedAt: string
  uploadedBy: string
  uploaderName?: string
  isPublic: boolean
  thumbnail?: string
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
  const { toast } = useToast()
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
  
  const supabase = createClient()

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
        FILE_CATEGORIES[file.category].label.toLowerCase().includes(query)
      )
    }

    setFilteredFiles(filtered)
  }, [files, selectedCategory, searchQuery])

  // Notify parent when files change (but avoid infinite loops)
  const notifyParent = useCallback((updatedFiles: CaseFile[]) => {
    onFilesChange?.(updatedFiles)
  }, [onFilesChange])

  const getFileIcon = (file: CaseFile) => {
    const category = FILE_CATEGORIES[file.category]
    return category.icon
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileUpload = async (filesWithCategories: Array<{ file: File; category: FileCategory }>) => {
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
          filename: f.originalName,
          original_filename: f.originalName,
          file_url: f.url,
          file_path: f.path,
          file_type: f.type,
          file_size: f.size,
          category: f.category,
          description: f.description,
          is_public: f.isPublic || false,
          display_order: files.length + newFiles.indexOf(f)
        }))

        const { error: insertError } = await supabase
          .from('case_files')
          .insert(filesToInsert)

        if (insertError) {
          console.error('Error inserting files into database:', insertError)
          toast({
            type: 'error',
            title: 'Error',
            description: 'Files uploaded but failed to save to database'
          })
        }
      }

      // Update files state
      const updatedFiles = [...files, ...newFiles]
      setFiles(updatedFiles)
      
      // Notify parent component
      notifyParent(updatedFiles)

      console.log(`Successfully uploaded ${newFiles.length} file(s)`)
      
      toast({
        title: 'Success',
        description: `Successfully uploaded ${newFiles.length} file(s)`
      })

      setShowUploadDialog(false)
    } catch (error) {
      console.error('Upload error:', error)
      console.error('An error occurred while uploading files')
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

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      const fileToDelete = files.find(f => f.id === fileId)
      if (!fileToDelete) return

      // Delete from database first (unified case_files table)
      const { error: dbError } = await supabase
        .from('case_files')
        .delete()
        .eq('id', fileId)
        .eq('case_id', caseId)

      if (dbError) {
        console.error('Database delete error:', dbError)
        toast({
          type: 'error',
          title: 'Error',
          description: `Failed to delete file: ${dbError.message}`
        })
        return
      }

      // Delete from Supabase Storage
      if (fileToDelete.path) {
        const { error: storageError } = await supabase.storage
          .from('case-files')
          .remove([fileToDelete.path])

        if (storageError) {
          console.warn('Storage delete warning:', storageError)
          // Continue even if storage delete fails
        }
      }

      // Update local state
      const updatedFiles = files.filter(f => f.id !== fileId)
      setFiles(updatedFiles)
      
      // Notify parent component
      notifyParent(updatedFiles)

      toast({
        title: 'Success',
        description: 'File deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting file:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete file'
      })
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t('caseFiles')}</h3>
          <p className="text-sm text-gray-600">
            {t('fileCount', { count: files.length })} • {formatFileSize(files.reduce((total, file) => total + file.size, 0))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
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

          {/* Upload Button */}
          {canEdit && showUpload && (
            <>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('uploadFiles')}
              </Button>
              <SimpleFileUpload
                open={showUploadDialog}
                onOpenChange={setShowUploadDialog}
                onUpload={handleFileUpload}
                uploading={uploading}
                progress={uploadProgress}
              />
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={t('searchFiles')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Split Layout: Sidebar + Content */}
      <div className="flex gap-6">
        {/* Left Sidebar - Categories */}
        <aside className="w-64 flex-shrink-0">
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
              onDelete={handleDeleteFile}
            />
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {selectedFile && (
        <FilePreviewModal
          file={selectedFile}
          open={showPreview}
          onOpenChange={setShowPreview}
          canEdit={canEdit}
          onFileUpdate={async (updatedFile) => {
            try {
              console.log('Updating file:', updatedFile)
              console.log('Case ID:', caseId)
              console.log('File ID:', updatedFile.id)
              
              const url = `/api/cases/${caseId}/files/${updatedFile.id}`
              const payload = {
                originalName: updatedFile.originalName,
                description: updatedFile.description,
                category: updatedFile.category,
                isPublic: updatedFile.isPublic
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
                f.id === updatedFile.id 
                  ? { ...updatedFile, name: updatedFile.originalName } 
                  : f
              )
              setFiles(updatedFiles)
              notifyParent(updatedFiles)
              
              toast({
                title: "Success",
                description: "File updated successfully"
              })
            } catch (error) {
              console.error('Error updating file:', error)
              console.error('Error message:', (error as Error)?.message)
              console.error('Error details:', error)
              toast({
                type: "error",
                title: "Error",
                description: "Failed to update file"
              })
            }
          }}
          onDelete={handleDeleteFile}
        />
      )}
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
  const category = FILE_CATEGORIES[file.category]
  const IconComponent = category.icon

  return (
    <Card className="group hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer overflow-hidden">
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* File Icon with Category Badge on Top */}
          <div className="flex items-center justify-between">
            <div className={`p-4 rounded-xl ${category.color}`}>
              <IconComponent className="h-8 w-8" />
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
              <a href={file.url} download target="_blank" rel="noopener noreferrer">
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
        </div>
      </CardContent>
    </Card>
  )
}

// File List Item Component
function FileListItem({ file, canEdit, onPreview, onDelete }: FileItemProps) {
  const category = FILE_CATEGORIES[file.category]
  const IconComponent = category.icon

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

// File Preview Modal Component
interface FilePreviewModalProps {
  file: CaseFile
  open: boolean
  onOpenChange: (open: boolean) => void
  canEdit: boolean
  onFileUpdate: (file: CaseFile) => void
  onDelete: (fileId: string) => void
}

function FilePreviewModal({ file, open, onOpenChange, canEdit, onFileUpdate, onDelete }: FilePreviewModalProps) {
  const t = useTranslations('cases.files')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    originalName: file.originalName,
    description: file.description || '',
    category: file.category,
    isPublic: file.isPublic
  })

  // Reset edit data when file changes
  useEffect(() => {
    setEditData({
      originalName: file.originalName,
      description: file.description || '',
      category: file.category,
      isPublic: file.isPublic
    })
    setEditMode(false) // Also exit edit mode
  }, [file.id, file.originalName, file.description, file.category, file.isPublic]) // Reset when file data changes

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this file?')) {
      onDelete(file.id)
      onOpenChange(false)
    }
  }

  const category = FILE_CATEGORIES[file.category]
  const IconComponent = category.icon

  const handleSave = () => {
    const updatedFile = {
      ...file,
      originalName: editData.originalName,
      description: editData.description,
      category: editData.category,
      isPublic: editData.isPublic
    }
    onFileUpdate(updatedFile)
    setEditMode(false)
  }

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  const isAudio = file.type.startsWith('audio/')
  const isPDF = file.type === 'application/pdf'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border-2 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${category.color}`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-left text-gray-900 font-semibold">{file.originalName}</DialogTitle>
                <DialogDescription className="text-left text-gray-600">
                  {category.label} • {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                </DialogDescription>
              </div>
            </div>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {editMode ? 'Cancel' : 'Edit'}
              </Button>
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
                  <IconComponent className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Preview not available</p>
                  <Button asChild>
                    <a href={file.url} download>
                      <Download className="h-4 w-4 mr-2" />
                      Download File
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
                <Label className="text-sm font-medium">File Name</Label>
                <p className="text-sm text-gray-600">{file.originalName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">File Size</Label>
                <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">File Type</Label>
                <p className="text-sm text-gray-600">{file.type}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Uploaded</Label>
                <p className="text-sm text-gray-600">
                  {new Date(file.uploadedAt).toLocaleString()}
                  {file.uploaderName && ` by ${file.uploaderName}`}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {editMode ? (
                <>
                  <div>
                    <Label htmlFor="filename" className="text-sm font-semibold text-gray-900">File Name</Label>
                    <input
                      type="text"
                      id="filename"
                      value={editData.originalName}
                      onChange={(e) => setEditData(prev => ({ ...prev, originalName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      placeholder="Enter file name..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-sm font-semibold text-gray-900">Category</Label>
                    <Select 
                      value={editData.category} 
                      onValueChange={(value) => setEditData(prev => ({ ...prev, category: value as FileCategory }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FILE_CATEGORIES).map(([key, cat]) => (
                          <SelectItem key={key} value={key}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-900">Description</Label>
                    <Textarea
                      id="description"
                      value={editData.description}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Add a description for this file..."
                      rows={3}
                      className="bg-white"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={editData.isPublic}
                      onChange={(e) => setEditData(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="isPublic" className="text-sm font-medium text-gray-900">Make this file publicly visible</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save Changes</Button>
                    <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-sm font-semibold text-gray-900">File Name</Label>
                    <p className="text-sm text-gray-700 mt-1 font-medium">
                      {file.originalName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-900">Category</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={category.color}>
                        <IconComponent className="h-3 w-3 mr-1" />
                        {category.label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-900">Description</Label>
                    <p className="text-sm text-gray-700 mt-1 font-medium">
                      {file.description || 'No description provided'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-900">Visibility</Label>
                    <p className="text-sm text-gray-700 mt-1 font-medium">
                      {file.isPublic ? 'Public' : 'Private'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a href={file.url} download>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
              {canEdit && (
                <Button 
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
