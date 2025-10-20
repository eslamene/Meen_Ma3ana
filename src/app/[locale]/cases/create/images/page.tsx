'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Upload, X, Star, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CaseImages {
  primary?: File
  additional: File[]
}

export default function CaseImagesPage() {
  const t = useTranslations('cases')
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || 'one-time'
  
  const [images, setImages] = useState<CaseImages>({ additional: [] })
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files)
      handleFileSelect(files)
    }
  }, [])

  const handleFileSelect = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
      const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB
      
      if (!isValidType) {
        setErrors(prev => [...prev, `${file.name}: Invalid file type`])
      }
      if (!isValidSize) {
        setErrors(prev => [...prev, `${file.name}: File too large (max 5MB)`])
      }
      
      return isValidType && isValidSize
    })

    if (validFiles.length > 0) {
      if (!images.primary && validFiles.length > 0) {
        setImages(prev => ({ ...prev, primary: validFiles[0] }))
        validFiles.shift()
      }
      
      if (validFiles.length > 0) {
        setImages(prev => ({
          ...prev,
          additional: [...prev.additional, ...validFiles].slice(0, 9) // Max 10 total images
        }))
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleFileSelect(files)
    }
  }

  const removeImage = (index: number, isPrimary: boolean = false) => {
    if (isPrimary) {
      setImages(prev => ({ ...prev, primary: undefined }))
    } else {
      setImages(prev => ({
        ...prev,
        additional: prev.additional.filter((_, i) => i !== index)
      }))
    }
  }

  const setPrimaryImage = (index: number) => {
    const file = images.additional[index]
    if (file) {
      setImages(prev => ({
        primary: file,
        additional: prev.additional.filter((_, i) => i !== index)
      }))
    }
  }

  const uploadImages = async (): Promise<string[]> => {
    const supabase = createClient()
    const uploadedUrls: string[] = []
    
    const allImages = [images.primary, ...images.additional].filter(Boolean) as File[]
    
    for (const image of allImages) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${image.name}`
      const { data, error } = await supabase.storage
        .from('case-images')
        .upload(fileName, image)
      
      if (error) {
        if (error.message.includes('Bucket not found')) {
          throw new Error(`Storage bucket 'case-images' not found. Please create it in your Supabase dashboard under Storage.`)
        }
        throw new Error(`Failed to upload ${image.name}: ${error.message}`)
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('case-images')
        .getPublicUrl(fileName)
      
      uploadedUrls.push(publicUrl)
    }
    
    return uploadedUrls
  }

  const handleSubmit = async () => {
    try {
      setUploading(true)
      setErrors([])
      
      if (!images.primary && images.additional.length === 0) {
        setErrors(['Please upload at least one image'])
        return
      }
      
      const imageUrls = await uploadImages()
      
      // Store image URLs in session storage for the next step
      sessionStorage.setItem('caseImages', JSON.stringify(imageUrls))
      
      // Navigate to the next step (review page)
      router.push(`/${params.locale}/cases/create/review?type=${type}`)
      
    } catch (error) {
      console.error('Error uploading images:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload images. Please try again.'
      setErrors([errorMessage])
    } finally {
      setUploading(false)
    }
  }

  const handleBack = () => {
    router.push(`/${params.locale}/cases/create/details?type=${type}`)
  }

  const clearErrors = () => {
    setErrors([])
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              3
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('images')}</h1>
              <p className="text-gray-600">{t('uploadImagesDescription')}</p>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  {errors.map((error, index) => (
                    <p key={index} className="text-red-700 text-sm">
                      {error}
                    </p>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearErrors}
                  className="text-red-700 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">{t('uploadImages')}</CardTitle>
              <CardDescription className="text-gray-700">
                {t('dragDropImages')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">{t('dragDropImages')}</p>
                <p className="text-sm text-gray-500 mb-4">
                  {t('imageRequirements', {
                    maxSize: 5,
                    maxCount: 10,
                    types: 'JPG, PNG, WebP'
                  })}
                </p>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  {t('selectImages')}
                </Button>
                <Input
                  id="file-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* Image Requirements */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Image Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Maximum 5MB per image</li>
                  <li>• Supported formats: JPG, PNG, WebP</li>
                  <li>• Maximum 10 images total</li>
                  <li>• First image will be set as primary</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">Image Preview</CardTitle>
              <CardDescription className="text-gray-700">
                Review and manage your uploaded images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Primary Image */}
                {images.primary && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 mb-2 block">
                      {t('primaryImage')}
                    </Label>
                    <div className="relative group">
                      <img
                        src={URL.createObjectURL(images.primary)}
                        alt="Primary"
                        className="w-full h-48 object-cover rounded-lg border-2 border-blue-500"
                      />
                      <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
                        {t('primaryImage')}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(0, true)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Additional Images */}
                {images.additional.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 mb-2 block">
                      Additional Images ({images.additional.length})
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {images.additional.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Additional ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-300"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPrimaryImage(index)}
                                className="bg-white text-gray-800 hover:bg-gray-100"
                              >
                                <Star className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeImage(index)}
                                className="bg-white text-red-600 hover:bg-red-50"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!images.primary && images.additional.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No images uploaded yet</p>
                    <p className="text-sm">Upload images to continue</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handleBack}>
            {t('back')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || (!images.primary && images.additional.length === 0)}
            className="min-w-32"
          >
            {uploading ? t('uploading') : t('continue')}
          </Button>
        </div>
      </div>
    </div>
  )
} 