'use client'

import { useState } from 'react'
import { Upload, FileText, Image as ImageIcon, X, Check, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type IDDocumentType = 'national_id' | 'passport' | 'other'

interface UploadedFile {
  file: File
  preview: string | null
}

interface IDDocumentUploadProps {
  onUploadComplete?: (uploads: { type: IDDocumentType; files: UploadedFile[] }) => void
  onBack?: () => void
  onContinue?: () => void
  className?: string
}

const documentTypes: { value: IDDocumentType; label: string; requiresBothSides: boolean }[] = [
  { value: 'national_id', label: 'National ID', requiresBothSides: true },
  { value: 'passport', label: 'Passport', requiresBothSides: false },
  { value: 'other', label: 'Other ID Document', requiresBothSides: false },
]

export default function IDDocumentUpload({
  onUploadComplete,
  onBack,
  onContinue,
  className
}: IDDocumentUploadProps) {
  const [selectedDocumentType, setSelectedDocumentType] = useState<IDDocumentType | ''>('')
  const [frontFile, setFrontFile] = useState<UploadedFile | null>(null)
  const [backFile, setBackFile] = useState<UploadedFile | null>(null)
  const [singleFile, setSingleFile] = useState<UploadedFile | null>(null)

  const selectedType = documentTypes.find(t => t.value === selectedDocumentType)
  const requiresBothSides = selectedType?.requiresBothSides || false

  const handleDocumentTypeChange = (value: string) => {
    setSelectedDocumentType(value as IDDocumentType)
    // Reset files when type changes
    setFrontFile(null)
    setBackFile(null)
    setSingleFile(null)
  }

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    side: 'front' | 'back' | 'single'
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      alert('File type not allowed. Allowed types: JPG, PNG, GIF, WebP, PDF')
      return
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert(`File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      return
    }

    // Create preview for images
    let preview: string | null = null
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        preview = e.target?.result as string
        const uploadedFile: UploadedFile = { file, preview }
        
        if (side === 'front') {
          setFrontFile(uploadedFile)
        } else if (side === 'back') {
          setBackFile(uploadedFile)
        } else {
          setSingleFile(uploadedFile)
        }
      }
      reader.readAsDataURL(file)
    } else {
      const uploadedFile: UploadedFile = { file, preview: null }
      if (side === 'front') {
        setFrontFile(uploadedFile)
      } else if (side === 'back') {
        setBackFile(uploadedFile)
      } else {
        setSingleFile(uploadedFile)
      }
    }
  }

  const removeFile = (side: 'front' | 'back' | 'single') => {
    if (side === 'front') {
      setFrontFile(null)
    } else if (side === 'back') {
      setBackFile(null)
    } else {
      setSingleFile(null)
    }
  }

  const handleContinue = () => {
    if (!selectedDocumentType) {
      alert('Please select a document type')
      return
    }

    if (requiresBothSides) {
      if (!frontFile || !backFile) {
        alert('Please upload both front and back of the document')
        return
      }
      onUploadComplete?.({
        type: selectedDocumentType,
        files: [frontFile, backFile]
      })
    } else {
      if (!singleFile) {
        alert('Please upload the document')
        return
      }
      onUploadComplete?.({
        type: selectedDocumentType,
        files: [singleFile]
      })
    }

    onContinue?.()
  }

  const canContinue = selectedDocumentType && (
    requiresBothSides 
      ? (frontFile && backFile)
      : singleFile
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Instructions */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">ID Document</h2>
        <p className="text-sm text-gray-600">
          Upload a clear photo of your ID document
        </p>
        <p className="text-xs text-gray-500">
          Please select the document type you want to upload
        </p>
      </div>

      {/* Document Type Selection */}
      {!selectedDocumentType && (
        <Card className="border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Select Document Type</Label>
              <Select value={selectedDocumentType} onValueChange={handleDocumentTypeChange}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Choose document type..." />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {type.label}
                        {type.requiresBothSides && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Front & Back
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Section - Only shown after selection */}
      {selectedDocumentType && (
        <div className="space-y-4">
          {requiresBothSides ? (
            // National ID - Front and Back
            <>
              {/* Front Upload */}
              <Card className={cn(
                "border-2 transition-all",
                frontFile ? "border-green-300 bg-green-50/30" : "border-dashed border-gray-300 hover:border-indigo-400"
              )}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <ArrowUp className="h-5 w-5 text-indigo-600" />
                        National ID - Front Side
                      </Label>
                      {frontFile && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          <Check className="h-3 w-3 mr-1" />
                          Uploaded
                        </Badge>
                      )}
                    </div>
                    {frontFile ? (
                      <div className="space-y-3">
                        {frontFile.preview ? (
                          <div className="relative">
                            <img
                              src={frontFile.preview}
                              alt="Front preview"
                              className="w-full max-w-md mx-auto rounded-lg border border-gray-200 shadow-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile('front')}
                              className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{frontFile.file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(frontFile.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile('front')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileSelect(e, 'front')}
                          className="hidden"
                          id="front-upload"
                        />
                        <Label
                          htmlFor="front-upload"
                          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ArrowUp className="h-10 w-10 text-indigo-600 mb-3" />
                            <p className="mb-2 text-sm font-semibold text-gray-700">
                              Tap to upload Front Side
                            </p>
                            <p className="text-xs text-gray-500">
                              JPG, PNG, PDF (Max 5MB)
                            </p>
                          </div>
                        </Label>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Back Upload */}
              <Card className={cn(
                "border-2 transition-all",
                backFile ? "border-green-300 bg-green-50/30" : "border-dashed border-gray-300 hover:border-indigo-400"
              )}>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <ArrowUp className="h-5 w-5 text-indigo-600" />
                        National ID - Back Side
                      </Label>
                      {backFile && (
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                          <Check className="h-3 w-3 mr-1" />
                          Uploaded
                        </Badge>
                      )}
                    </div>
                    {backFile ? (
                      <div className="space-y-3">
                        {backFile.preview ? (
                          <div className="relative">
                            <img
                              src={backFile.preview}
                              alt="Back preview"
                              className="w-full max-w-md mx-auto rounded-lg border border-gray-200 shadow-sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile('back')}
                              className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{backFile.file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(backFile.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile('back')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileSelect(e, 'back')}
                          className="hidden"
                          id="back-upload"
                        />
                        <Label
                          htmlFor="back-upload"
                          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ArrowUp className="h-10 w-10 text-indigo-600 mb-3" />
                            <p className="mb-2 text-sm font-semibold text-gray-700">
                              Tap to upload Back Side
                            </p>
                            <p className="text-xs text-gray-500">
                              JPG, PNG, PDF (Max 5MB)
                            </p>
                          </div>
                        </Label>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            // Passport or Other - Single Upload
            <Card className={cn(
              "border-2 transition-all",
              singleFile ? "border-green-300 bg-green-50/30" : "border-dashed border-gray-300 hover:border-indigo-400"
            )}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <ArrowUp className="h-5 w-5 text-indigo-600" />
                      {selectedType?.label}
                    </Label>
                    {singleFile && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        <Check className="h-3 w-3 mr-1" />
                        Uploaded
                      </Badge>
                    )}
                  </div>
                  {singleFile ? (
                    <div className="space-y-3">
                      {singleFile.preview ? (
                        <div className="relative">
                          <img
                            src={singleFile.preview}
                            alt="Document preview"
                            className="w-full max-w-md mx-auto rounded-lg border border-gray-200 shadow-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile('single')}
                            className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
                          <FileText className="h-5 w-5 text-gray-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{singleFile.file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(singleFile.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile('single')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileSelect(e, 'single')}
                        className="hidden"
                        id="single-upload"
                      />
                      <Label
                        htmlFor="single-upload"
                        className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-indigo-400 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ArrowUp className="h-10 w-10 text-indigo-600 mb-3" />
                          <p className="mb-2 text-sm font-semibold text-gray-700">
                            Tap to upload {selectedType?.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            JPG, PNG, PDF (Max 5MB)
                          </p>
                        </div>
                      </Label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Change Document Type Button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedDocumentType('')
                setFrontFile(null)
                setBackFile(null)
                setSingleFile(null)
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Change Document Type
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1"
          >
            Previous
          </Button>
        )}
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className={cn(
            "flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800",
            !canContinue && "opacity-50 cursor-not-allowed"
          )}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}



