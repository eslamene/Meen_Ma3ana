'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Mail, User, MessageSquare, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface ErrorResponse {
  error?: string
  message?: string
  retryAfter?: number
  errorCode?: string
}

export default function ContactForm() {
  const t = useTranslations('landing.contact')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  /**
   * Get translated error message based on error type and response data
   */
  const getErrorMessage = (response: Response, data: ErrorResponse): string => {
    // Rate limit error (429)
    if (response.status === 429) {
      const retryAfter = data.retryAfter || 0
      const minutes = Math.ceil(retryAfter / 60)
      const seconds = retryAfter % 60
      
      if (minutes > 0) {
        return t('errors.rateLimit', { minutes })
      } else if (seconds > 0) {
        return t('errors.rateLimitSeconds', { seconds })
      }
      return t('errors.rateLimit', { minutes: 1 })
    }

    // Validation errors (400) - check errorCode first for better mapping
    if (response.status === 400) {
      const errorCode = data.errorCode
      const errorMsg = data.error || data.message || ''
      
      // Map error codes to translations
      switch (errorCode) {
        case 'MISSING_FIELDS':
          return t('errors.missingFields')
        case 'INVALID_EMAIL':
          return t('errors.invalidEmail')
        case 'MESSAGE_TOO_SHORT':
          return t('errors.messageTooShort')
        case 'MESSAGE_TOO_LONG':
          return t('errors.messageTooLong')
        case 'NAME_TOO_SHORT':
          return t('errors.nameTooShort')
        case 'NAME_TOO_LONG':
          return t('errors.nameTooLong')
        case 'EMAIL_TOO_LONG':
          return t('errors.emailTooLong')
        case 'INVALID_REQUEST':
          return t('errors.invalidRequest')
      }
      
      // Fallback to message-based detection if no errorCode
      if (errorMsg.toLowerCase().includes('missing') || errorMsg.toLowerCase().includes('required')) {
        return t('errors.missingFields')
      }
      // Enhanced email format detection - catch various error message formats
      if (errorMsg.toLowerCase().includes('email')) {
        if (errorMsg.toLowerCase().includes('format') || 
            errorMsg.toLowerCase().includes('invalid') ||
            errorMsg.toLowerCase().includes('not valid') ||
            errorMsg.toLowerCase().includes('incorrect') ||
            errorMsg.toLowerCase().includes('malformed')) {
          return t('errors.invalidEmail')
        }
        if (errorMsg.toLowerCase().includes('exceed') || errorMsg.toLowerCase().includes('too long')) {
          return t('errors.emailTooLong')
        }
      }
      // Also catch generic "invalid email" patterns
      if (errorMsg.toLowerCase().includes('invalid email') || 
          errorMsg.toLowerCase().includes('email is not valid') ||
          errorMsg.toLowerCase().includes('email format is invalid')) {
        return t('errors.invalidEmail')
      }
      if (errorMsg.toLowerCase().includes('name') && errorMsg.toLowerCase().includes('at least')) {
        return t('errors.nameTooShort')
      }
      if (errorMsg.toLowerCase().includes('name') && errorMsg.toLowerCase().includes('exceed')) {
        return t('errors.nameTooLong')
      }
      // Handle "between X and Y" format
      if (errorMsg.toLowerCase().includes('between') && errorMsg.toLowerCase().includes('characters')) {
        // Extract numbers from the error message
        const numbers = errorMsg.match(/\d+/g)
        if (numbers && numbers.length >= 2) {
          const min = parseInt(numbers[0], 10)
          const max = parseInt(numbers[1], 10)
          return t('errors.messageLengthRange', { min, max })
        }
      }
      // Handle "at least X" format for message
      if ((errorMsg.toLowerCase().includes('at least') || errorMsg.toLowerCase().includes('minimum')) && 
          (errorMsg.toLowerCase().includes('message') || errorMsg.toLowerCase().includes('character'))) {
        return t('errors.messageTooShort')
      }
      // Handle "exceed" or "maximum" format for message
      if ((errorMsg.toLowerCase().includes('exceed') || errorMsg.toLowerCase().includes('maximum')) && 
          (errorMsg.toLowerCase().includes('message') || errorMsg.toLowerCase().includes('character'))) {
        return t('errors.messageTooLong')
      }
      // Handle specific number mentions
      if (errorMsg.toLowerCase().includes('message') && errorMsg.toLowerCase().includes('3')) {
        return t('errors.messageTooShort')
      }
      if (errorMsg.toLowerCase().includes('message') && (errorMsg.toLowerCase().includes('5000') || errorMsg.toLowerCase().includes('10000'))) {
        return t('errors.messageTooLong')
      }
      if (errorMsg.toLowerCase().includes('message') && errorMsg.toLowerCase().includes('10')) {
        // Handle old "10 characters" minimum
        return t('errors.messageTooShort')
      }
      if (errorMsg.toLowerCase().includes('format') || errorMsg.toLowerCase().includes('invalid request')) {
        return t('errors.invalidRequest')
      }
      
      // Return the API error message if it's a known validation error
      return errorMsg || t('errors.generic')
    }

    // Server error (500)
    if (response.status >= 500) {
      return t('errors.serverError')
    }

    // Default to generic error
    return data.error || data.message || t('errors.generic')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      let data: ErrorResponse = {}
      try {
        data = await response.json()
      } catch {
        // If response is not JSON, determine error from status code
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10)
          const minutes = Math.ceil(retryAfter / 60)
          setSubmitStatus('error')
          setErrorMessage(minutes > 0 
            ? t('errors.rateLimit', { minutes })
            : t('errors.rateLimitSeconds', { seconds: retryAfter }))
        } else if (response.status >= 500) {
          setSubmitStatus('error')
          setErrorMessage(t('errors.serverError'))
        } else {
          setSubmitStatus('error')
          setErrorMessage(t('errors.generic'))
        }
        setTimeout(() => {
          setSubmitStatus('idle')
          setErrorMessage('')
        }, 5000)
        return
      }

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', email: '', message: '' })
        setTimeout(() => setSubmitStatus('idle'), 5000)
      } else {
        setSubmitStatus('error')
        // Get translated error message based on error type
        setErrorMessage(getErrorMessage(response, data))
        setTimeout(() => {
          setSubmitStatus('idle')
          setErrorMessage('')
        }, 5000)
      }
    } catch {
      // Network error or other fetch errors
      setSubmitStatus('error')
      setErrorMessage(t('errors.networkError'))
      setTimeout(() => {
        setSubmitStatus('idle')
        setErrorMessage('')
      }, 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <section id="contact" className="relative bg-gradient-to-b from-gray-50 to-white py-20 md:py-24 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%236B8E7E' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
            backgroundPosition: '0 0',
          }}
        />
      </div>
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#6B8E7E]/5 via-transparent to-[#E74C3C]/5 pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#6B8E7E]/10 rounded-full mb-6">
            <Mail className="h-8 w-8 text-[#6B8E7E]" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <User className="h-4 w-4 text-[#6B8E7E]" />
                  {t('name')}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t('namePlaceholder')}
                    className="w-full px-4 py-3.5 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6B8E7E] focus:border-[#6B8E7E] transition-all duration-200 bg-gray-50 focus:bg-white placeholder:text-gray-400 text-gray-900"
                  />
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Mail className="h-4 w-4 text-[#6B8E7E]" />
                  {t('email')}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t('emailPlaceholder')}
                    className="w-full px-4 py-3.5 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6B8E7E] focus:border-[#6B8E7E] transition-all duration-200 bg-gray-50 focus:bg-white placeholder:text-gray-400 text-gray-900"
                  />
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Message Field */}
              <div className="space-y-2">
                <label htmlFor="message" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <MessageSquare className="h-4 w-4 text-[#6B8E7E]" />
                  {t('message')}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder={t('messagePlaceholder')}
                    className="w-full px-4 py-3.5 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6B8E7E] focus:border-[#6B8E7E] transition-all duration-200 resize-none bg-gray-50 focus:bg-white placeholder:text-gray-400 text-gray-900"
                  />
                  <MessageSquare className="absolute left-4 top-4 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Success Message */}
              {submitStatus === 'success' && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl text-green-800 flex items-center gap-3 animate-[fadeInUp_0.4s_ease-out]">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <p className="font-medium">{t('success')}</p>
                </div>
              )}

              {/* Error Message */}
              {submitStatus === 'error' && (
                <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl text-red-800 flex items-start gap-3 animate-[fadeInUp_0.4s_ease-out]">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="font-medium flex-1">{errorMessage || t('error')}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#E74C3C] to-[#d63a2a] hover:from-[#d63a2a] hover:to-[#c5301f] text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{t('submitting')}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>{t('submit')}</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

