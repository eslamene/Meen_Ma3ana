'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Upload, FileSpreadsheet, Download, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
// Progress component - using simple div for now
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import StandardModal, { StandardModalSection, StandardFormField } from '@/components/ui/standard-modal'

interface ValidationError {
  row: number
  field: string
  message: string
}

interface UploadResult {
  success: boolean
  total: number
  created: number
  skipped: number
  errors: ValidationError[]
  message?: string
}

interface BulkUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function BulkUploadModal({ open, onOpenChange, onSuccess }: BulkUploadModalProps) {
  const t = useTranslations('beneficiaries')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    
    const isValidType = validTypes.includes(selectedFile.type) || 
      selectedFile.name.match(/\.(xlsx|xls|csv)$/i)

    if (!isValidType) {
      toast.error('Invalid file type. Please upload an Excel file (.xlsx, .xls) or CSV file')
      return
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setFile(selectedFile)
    setResult(null)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/beneficiaries/bulk-upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setResult(data as UploadResult)

      if (data.success && data.created > 0) {
        toast.success(`Successfully imported ${data.created} beneficiaries`)
        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast.warning(data.message || 'Upload completed with errors')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      // Create Excel template with example data
      const templateData = [
        {
          name: 'Ahmed Mohamed',
          name_ar: 'أحمد محمد',
          age: 35,
          gender: 'male',
          mobile_number: '01001234567',
          additional_mobile_number: '',
          email: 'ahmed@example.com',
          alternative_contact: '',
          national_id: '12345678901234',
          id_type: 'national_id',
          address: '123 Main Street',
          city: 'Cairo',
          governorate: 'Cairo',
          country: 'Egypt',
          medical_condition: 'Chronic illness',
          social_situation: 'Low income',
          family_size: 5,
          dependents: 2,
          notes: 'Additional notes here',
          tags: 'chronic_illness,low_income',
          risk_level: 'medium'
        }
      ]

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(templateData)
      
      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 20 }, // name
        { wch: 20 }, // name_ar
        { wch: 5 },  // age
        { wch: 10 }, // gender
        { wch: 15 }, // mobile_number
        { wch: 15 }, // additional_mobile_number
        { wch: 25 }, // email
        { wch: 20 }, // alternative_contact
        { wch: 15 }, // national_id
        { wch: 15 }, // id_type
        { wch: 30 }, // address
        { wch: 15 }, // city
        { wch: 15 }, // governorate
        { wch: 10 }, // country
        { wch: 25 }, // medical_condition
        { wch: 20 }, // social_situation
        { wch: 10 }, // family_size
        { wch: 10 }, // dependents
        { wch: 30 }, // notes
        { wch: 30 }, // tags
        { wch: 12 }, // risk_level
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Beneficiaries')
      
      // Generate and download Excel file
      XLSX.writeFile(wb, 'beneficiaries_template.xlsx')
      
      toast.success('Template downloaded successfully')
    } catch (error) {
      toast.error('Failed to download template')
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setFile(null)
      setResult(null)
      onOpenChange(false)
    }
  }

  return (
    <StandardModal
      open={open}
      onOpenChange={handleClose}
      title="Bulk Upload Beneficiaries"
      description="Upload an Excel file to import multiple beneficiaries at once"
      sections={[
        {
          title: 'Upload File',
          children: (
            <div className="space-y-4">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-300 hover:border-gray-400'
                } ${file ? 'bg-green-50 border-green-300' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0])
                    }
                  }}
                />

                {file ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFile(null)
                        fileInputRef.current?.value && (fileInputRef.current.value = '')
                      }}
                      disabled={uploading}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-sm text-gray-600">
                        Drag and drop your Excel file here, or
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Browse Files
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Supported formats: .xlsx, .xls, .csv (Max 10MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Download Template Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  disabled={uploading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading and processing...</span>
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
                  </div>
                </div>
              )}

              {/* Results */}
              {result && (
                <div className="space-y-3 mt-4">
                  <Alert variant={result.success ? 'default' : 'destructive'}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>
                      {result.success ? 'Upload Completed' : 'Upload Failed'}
                    </AlertTitle>
                    <AlertDescription>
                      {result.message || `Processed ${result.total} rows`}
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <div className="font-semibold text-blue-900">{result.total}</div>
                      <div className="text-blue-600">Total Rows</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <div className="font-semibold text-green-900">{result.created}</div>
                      <div className="text-green-600">Created</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded">
                      <div className="font-semibold text-yellow-900">{result.skipped}</div>
                      <div className="text-yellow-600">Skipped</div>
                    </div>
                  </div>

                  {/* Error Details */}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Validation Errors:</p>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {result.errors.slice(0, 20).map((error, idx) => (
                          <div key={idx} className="text-xs p-2 bg-red-50 rounded">
                            <span className="font-medium">Row {error.row}:</span> {error.message}
                          </div>
                        ))}
                        {result.errors.length > 20 && (
                          <p className="text-xs text-gray-500 mt-2">
                            ... and {result.errors.length - 20} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        }
      ]}
      primaryAction={{
        label: uploading ? 'Uploading...' : 'Upload File',
        onClick: handleUpload,
        loading: uploading,
        disabled: !file || uploading
      }}
      secondaryAction={{
        label: 'Cancel',
        onClick: handleClose,
        disabled: uploading
      }}
    />
  )
}

