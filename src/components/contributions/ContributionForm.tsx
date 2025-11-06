'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon, 
  Heart,
  Building2,
  Smartphone,
  Banknote,
  FileCheck,
  CreditCard,
  TrendingUp,
  Eye
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface ContributionFormProps {
  caseId: string
  caseTitle: string
  targetAmount: number
  currentAmount: number
  onContributionSubmitted?: (contribution: { updatedCase?: { currentAmount: number } }) => void
  onCancel?: () => void
}

interface ContributionData {
  amount: number
  message: string
  anonymous: boolean
  paymentProof: File | null
  paymentMethod: string
}

interface PaymentMethod {
  id: string
  code: string
  name: string
  description?: string
  sort_order: number
}

const PAYMENT_METHOD_ICONS: Record<string, any> = {
  bank_transfer: Building2,
  mobile_wallet: Smartphone,
  cash: Banknote,
  check: FileCheck,
  ipn: CreditCard
}

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500, 1000]

export default function ContributionForm({
  caseId,
  caseTitle,
  targetAmount: _targetAmount, // eslint-disable-line @typescript-eslint/no-unused-vars
  currentAmount: _currentAmount, // eslint-disable-line @typescript-eslint/no-unused-vars
  onContributionSubmitted,
  onCancel
}: ContributionFormProps) {
  const t = useTranslations('cases')
  const { toast } = useToast()
  const [formData, setFormData] = useState<ContributionData>({
    amount: 0,
    message: '',
    anonymous: false,
    paymentProof: null,
    paymentMethod: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch payment methods on component mount
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await fetch('/api/payment-methods')
        if (response.ok) {
          const data = await response.json()
          setPaymentMethods(data.paymentMethods || [])
        } else {
          console.error('Failed to fetch payment methods')
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error)
      } finally {
        setLoadingPaymentMethods(false)
      }
    }

    fetchPaymentMethods()
  }, [])

  const sanitizeFileName = (name: string): string => {
    const lastDot = name.lastIndexOf('.')
    const ext = lastDot > -1 ? name.slice(lastDot + 1).toLowerCase() : ''
    const base = lastDot > -1 ? name.slice(0, lastDot) : name
    const ascii = base
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/[^a-zA-Z0-9._-]+/g, '-') // non-safe -> dash
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .toLowerCase()
    return ext ? `${ascii}.${ext}` : ascii
  }

  const handleAmountChange = (amount: number) => {
    setFormData(prev => ({ ...prev, amount }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast({
          type: 'error',
          title: 'Invalid File Type',
          description: t('invalidFileType'),
          duration: 5000
        })
        return
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          type: 'error',
          title: 'File Too Large',
          description: t('fileTooLarge'),
          duration: 5000
        })
        return
      }

      setFormData(prev => ({ ...prev, paymentProof: file }))
    }
  }

  const removeFile = () => {
    setFormData(prev => ({ ...prev, paymentProof: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file: File): Promise<string> => {
    const safeName = sanitizeFileName(file.name)
    const fileName = `payment-proofs/${caseId}-${Date.now()}-${safeName}`
    
    // Create FormData for file upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileName', fileName)
    formData.append('bucket', 'contributions')
    
    // Upload via server-side API to bypass RLS
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Failed to upload file: ${errorData.error || 'Upload failed'}`)
    }

    const { url } = await response.json()
    return url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.amount <= 0) {
      toast({
        type: 'error',
        title: 'Amount Required',
        description: t('amountRequired'),
        duration: 5000
      })
      return
    }

    if (!formData.paymentMethod) {
      toast({
        type: 'error',
        title: 'Payment Method Required',
        description: t('paymentMethodRequired'),
        duration: 5000
      })
      return
    }

    if (!formData.paymentProof) {
      toast({
        type: 'error',
        title: 'Payment Proof Required',
        description: t('paymentProofRequired'),
        duration: 5000
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Upload payment proof
      setUploadProgress(50)
      const proofUrl = await uploadFile(formData.paymentProof)
      setUploadProgress(100)

      // Submit contribution
      const response = await fetch('/api/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId,
          amount: formData.amount,
          message: formData.message,
          anonymous: formData.anonymous,
          paymentMethod: formData.paymentMethod,
          proofOfPayment: proofUrl,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit contribution')
      }

      const contribution = await response.json()
      onContributionSubmitted?.(contribution)

      // Show success toast
      toast({
        type: 'success',
        title: 'Donation Submitted Successfully!',
        description: t('donationSuccess'),
        duration: 5000
      })

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          amount: 0,
          message: '',
          anonymous: false,
          paymentProof: null,
          paymentMethod: ''
        })
        setUploadProgress(0)
      }, 3000)

    } catch (error) {
      console.error('Error submitting contribution:', error)
      toast({
        type: 'error',
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Failed to submit contribution',
        duration: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  return (
    <Card className="w-full max-w-2xl mx-auto border-0 bg-gradient-to-br from-white to-blue-50 shadow-xl overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600"></div>
      
      <CardHeader className="pb-6 pt-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg shadow-lg">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl lg:text-3xl font-bold text-gray-800">{t('makeDonation')}</CardTitle>
            <p className="text-sm text-gray-500 font-normal">{t('donationDescription')} - {caseTitle}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-8 space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Enhanced Amount Selection */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
              <Label htmlFor="amount" className="text-base font-semibold text-gray-700">{t('donationAmount')}</Label>
            </div>
            
            {/* Enhanced Quick Amount Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {QUICK_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant={formData.amount === amount ? 'default' : 'outline'}
                  onClick={() => handleAmountChange(amount)}
                  className={`h-16 text-base font-semibold transition-all duration-300 ${
                    formData.amount === amount 
                      ? 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg scale-105' 
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border-blue-200 hover:border-blue-300'
                  }`}
                >
                  {formatAmount(amount)}
                </Button>
              ))}
            </div>
            
            {/* Enhanced Custom Amount */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <div className="p-1 bg-gradient-to-r from-green-400 to-blue-500 rounded-md">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </div>
              <Input
                id="amount"
                type="number"
                min="1"
                step="1"
                value={formData.amount || ''}
                onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="pl-14 h-14 text-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                required
              />
            </div>
          </div>

          {/* Enhanced Payment Method */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"></div>
              <Label className="text-base font-semibold text-gray-700">{t('paymentMethod')}</Label>
            </div>
            {loadingPaymentMethods ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {paymentMethods.map((method) => {
                  const IconComponent = PAYMENT_METHOD_ICONS[method.code] || CreditCard
                  return (
                    <Button
                      key={method.id}
                      type="button"
                      variant={formData.paymentMethod === method.code ? 'default' : 'outline'}
                      onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.code }))}
                      className={`h-16 justify-start text-base font-semibold transition-all duration-300 ${
                                              formData.paymentMethod === method.code 
                        ? 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg scale-105' 
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-800 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg mr-3 ${
                        formData.paymentMethod === method.code 
                          ? 'bg-white/20' 
                          : 'bg-white'
                      }`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      {method.name}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Enhanced Payment Proof Upload */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full animate-pulse"></div>
              <Label className="text-base font-semibold text-gray-700">{t('paymentProof')} *</Label>
            </div>
            
            {formData.paymentProof ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                  <div className="p-3 bg-green-100 rounded-lg">
                    {getFileIcon(formData.paymentProof)}
                  </div>
                  <span className="flex-1 text-base font-medium text-gray-900">{formData.paymentProof.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Image Preview */}
                {formData.paymentProof.type.startsWith('image/') && (
                  <div className="relative group">
                    <Image
                      src={URL.createObjectURL(formData.paymentProof)}
                      alt="Payment proof preview"
                      width={800}
                      height={300}
                      className="w-full h-48 object-cover rounded-lg border border-gray-200 shadow-sm"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Badge className="bg-white/90 backdrop-blur-sm text-gray-800">
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-all duration-300 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <Upload className="h-10 w-10 text-white" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-3">{t('uploadPaymentProof')}</p>
                <p className="text-sm text-gray-600 mb-6">{t('imageRequirements')}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 px-8 py-3"
                >
                  {t('selectFile')}
                </Button>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Enhanced Message */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-pulse"></div>
              <Label htmlFor="message" className="text-base font-semibold text-gray-700">{t('donationMessage')}</Label>
            </div>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder={t('donationMessagePlaceholder')}
              rows={4}
              className="border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none bg-white"
            />
          </div>

          {/* Enhanced Anonymous Option */}
          <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl">
            <Checkbox
              id="anonymous"
              checked={formData.anonymous}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, anonymous: checked as boolean }))}
              className="h-5 w-5 rounded-md border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <Label htmlFor="anonymous" className="text-base text-gray-700 cursor-pointer font-medium">
              {t('anonymousDonation')}
            </Label>
          </div>

          {/* Enhanced Progress Bar */}
          {uploadProgress > 0 && (
            <div className="space-y-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
              <div className="flex justify-between text-base font-semibold">
                <span className="text-blue-700">{t('uploading')}</span>
                <span className="text-blue-700">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
                  style={{ width: `${uploadProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Submit Buttons */}
          <div className="flex gap-6 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-14 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-lg"
            >
              {isSubmitting ? t('processing') : t('completeDonation')}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="h-14 border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 font-semibold text-lg px-8"
              >
                {t('cancel')}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 