'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

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
    <section id="contact" className="bg-white py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                {t('name')}
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder={t('namePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6B8E7E] focus:border-[#6B8E7E] transition-colors"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder={t('emailPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6B8E7E] focus:border-[#6B8E7E] transition-colors"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                {t('message')}
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                value={formData.message}
                onChange={handleChange}
                placeholder={t('messagePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6B8E7E] focus:border-[#6B8E7E] transition-colors resize-none"
              />
            </div>
            {submitStatus === 'success' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                {t('success')}
              </div>
            )}
            {submitStatus === 'error' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {errorMessage || t('error')}
              </div>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#E74C3C] hover:bg-[#d63a2a] text-white py-3 text-lg font-semibold"
            >
              {isSubmitting ? t('submitting') : t('submit')}
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}

