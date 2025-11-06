'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { 
  Eye, 
  Download, 
  ExternalLink,
  X,
  FileText,
  Image as ImageIcon,
  File
} from 'lucide-react'

interface PaymentProofModalProps {
  isOpen: boolean
  onClose: () => void
  proofUrl: string
  contributionId: string
  amount: number
  paymentMethod?: string
}

export default function PaymentProofModal({
  isOpen,
  onClose,
  proofUrl,
  contributionId,
  amount,
  paymentMethod
}: PaymentProofModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const formatAmount = (amount: number) => `EGP ${amount.toLocaleString()}`

  const handleDownload = () => {
    // Create a temporary link to download the file
    const link = document.createElement('a')
    link.href = proofUrl
    link.download = `payment-proof-${contributionId}.${getFileExtension(proofUrl)}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getFileExtension = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase()
    return extension || 'pdf'
  }

  const getFileType = (url: string) => {
    const extension = getFileExtension(url)
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return 'image'
    } else if (['pdf'].includes(extension)) {
      return 'pdf'
    } else {
      return 'document'
    }
  }

  const getFileIcon = (url: string) => {
    const fileType = getFileType(url)
    switch (fileType) {
      case 'image':
        return <ImageIcon className="h-5 w-5 text-blue-500" />
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />
      default:
        return <File className="h-5 w-5 text-gray-500" />
    }
  }

  const handleImageLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const renderProofContent = () => {
    const fileType = getFileType(proofUrl)
    
    if (fileType === 'image') {
      return (
        <div className="relative">
          {isLoading && (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
              <div className="text-gray-500">Loading image...</div>
            </div>
          )}
          {hasError ? (
            <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200">
              <div className="text-center">
                <X className="h-12 w-12 text-red-400 mx-auto mb-2" />
                <div className="text-red-600 font-medium">Failed to load image</div>
                <div className="text-red-500 text-sm mt-1">The image may be corrupted or inaccessible</div>
              </div>
            </div>
          ) : (
            <Image
              src={proofUrl}
              alt="Payment proof"
              width={800}
              height={600}
              className={`w-full h-auto rounded-lg ${isLoading ? 'hidden' : 'block'}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              unoptimized
            />
          )}
        </div>
      )
    } else if (fileType === 'pdf') {
      return (
        <div className="w-full h-96">
          <iframe
            src={proofUrl}
            className="w-full h-full rounded-lg border"
            title="Payment proof PDF"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
            }}
          />
        </div>
      )
    } else {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <div className="text-center">
            {getFileIcon(proofUrl)}
            <div className="mt-2 text-gray-600">Preview not available</div>
            <div className="text-sm text-gray-500">Click download to view the file</div>
          </div>
        </div>
      )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-blue-500" />
              Payment Proof
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(proofUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Information */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Amount</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatAmount(amount)}
                  </div>
                </div>
                {paymentMethod && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Payment Method</div>
                    <div className="text-sm text-gray-700 capitalize">
                      {paymentMethod}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-500">File Type</div>
                  <div className="flex items-center gap-2">
                    {getFileIcon(proofUrl)}
                    <span className="text-sm text-gray-700 capitalize">
                      {getFileExtension(proofUrl).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Proof Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Proof Document</h3>
                <Button
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {renderProofContent()}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(proofUrl, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
            <Button
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download File
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
