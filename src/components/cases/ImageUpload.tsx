'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Upload, X, Image as ImageIcon, Trash2, Star, StarOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface UploadedImage {
  id: string
  file: File
  preview: string
  isPrimary: boolean
  uploaded: boolean
  uploadProgress: number
  error?: string
}

interface ImageUploadProps {
  onImagesChange: (images: UploadedImage[]) => void
  maxImages?: number
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
}

export default function ImageUpload({
  onImagesChange,
  maxImages = 5,
  maxFileSize = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
}: ImageUploadProps) {
  const t = useTranslations('cases')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  const supabase = createClient()

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return t('validation.imageTypeNotSupported')
    }
    
    if (file.size > maxFileSize * 1024 * 1024) {
      return t('validation.imageTooLarge', { maxSize: maxFileSize })
    }
    
    return null
  }

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        resolve(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    })
  }

  const addImages = useCallback(async (files: FileList) => {
    const newImages: UploadedImage[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file
      const error = validateFile(file)
      if (error) {
        console.error(`File ${file.name}: ${error}`)
        continue
      }
      
      // Check if we've reached the maximum number of images
      if (images.length + newImages.length >= maxImages) {
        break
      }
      
      // Create preview
      const preview = await createImagePreview(file)
      
      const image: UploadedImage = {
        id: `${Date.now()}-${i}`,
        file,
        preview,
        isPrimary: images.length + newImages.length === 0, // First image is primary
        uploaded: false,
        uploadProgress: 0
      }
      
      newImages.push(image)
    }
    
    const updatedImages = [...images, ...newImages]
    setImages(updatedImages)
    onImagesChange(updatedImages)
  }, [images, maxImages, onImagesChange, t])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      addImages(files)
    }
  }, [addImages])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = event.dataTransfer.files
    if (files) {
      addImages(files)
    }
  }, [addImages])

  const removeImage = useCallback((imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId)
    
    // If we removed the primary image, make the first remaining image primary
    const removedImage = images.find(img => img.id === imageId)
    if (removedImage?.isPrimary && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true
    }
    
    setImages(updatedImages)
    onImagesChange(updatedImages)
  }, [images, onImagesChange])

  const setPrimaryImage = useCallback((imageId: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId
    }))
    
    setImages(updatedImages)
    onImagesChange(updatedImages)
  }, [images, onImagesChange])

  const uploadImages = useCallback(async () => {
    if (images.length === 0) return
    
    setUploading(true)
    
    try {
      const uploadedImages: UploadedImage[] = []
      
      for (const image of images) {
        if (image.uploaded) {
          uploadedImages.push(image)
          continue
        }
        
        try {
          // Upload to Supabase Storage
          const fileExt = image.file.name.split('.').pop()
          const fileName = `case-images/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
          
          const { data, error } = await supabase.storage
            .from('case-images')
            .upload(fileName, image.file, {
              cacheControl: '3600',
              upsert: false
            })
          
          if (error) throw error
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('case-images')
            .getPublicUrl(fileName)
          
          uploadedImages.push({
            ...image,
            uploaded: true,
            uploadProgress: 100,
            preview: urlData.publicUrl
          })
        } catch (error) {
          console.error('Error uploading image:', error)
          uploadedImages.push({
            ...image,
            error: t('uploadError')
          })
        }
      }
      
      setImages(uploadedImages)
      onImagesChange(uploadedImages)
    } finally {
      setUploading(false)
    }
  }, [images, supabase, onImagesChange, t])

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card className={`border-2 border-dashed transition-colors ${
        isDragOver 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}>
        <CardContent className="p-6">
          <div
            className="flex flex-col items-center justify-center space-y-4"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400" />
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900">
                {t('uploadImages')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {t('dragDropImages')}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {t('imageRequirements', { 
                  maxSize: maxFileSize, 
                  maxCount: maxImages,
                  types: acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')
                })}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={images.length >= maxImages}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                {t('selectImages')}
              </Button>
              {images.length > 0 && (
                <Button
                  onClick={uploadImages}
                  disabled={uploading}
                >
                  {uploading ? t('uploading') : t('uploadImages')}
                </Button>
              )}
            </div>
            <input
              id="image-upload"
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <Card key={image.id} className="relative group">
              <CardContent className="p-2">
                <div className="relative aspect-square">
                  <img
                    src={image.preview}
                    alt={image.file.name}
                    className="w-full h-full object-cover rounded-md"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-md">
                    <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPrimaryImage(image.id)}
                        disabled={image.isPrimary}
                        className="h-6 w-6 p-0"
                      >
                        {image.isPrimary ? (
                          <Star className="h-3 w-3 text-yellow-500" />
                        ) : (
                          <StarOff className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeImage(image.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Status Badges */}
                  <div className="absolute bottom-2 left-2">
                    {image.isPrimary && (
                      <Badge variant="secondary" className="text-xs">
                        {t('primaryImage')}
                      </Badge>
                    )}
                    {image.error && (
                      <Badge variant="destructive" className="text-xs">
                        {t('uploadFailed')}
                      </Badge>
                    )}
                    {image.uploaded && !image.error && (
                      <Badge variant="default" className="text-xs">
                        {t('uploaded')}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="mt-2">
                  <p className="text-xs text-gray-600 truncate" title={image.file.name}>
                    {image.file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(image.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 