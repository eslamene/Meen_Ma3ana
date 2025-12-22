'use client'

import { useTranslations, useLocale } from 'next-intl'
import { MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { defaultLogger as logger } from '@/lib/logger'

interface ContactInfo {
  whatsappNumber: string
  whatsappDefaultMessage: string
  whatsappDefaultMessageAr: string
  email: string
}

export default function WhatsAppChat() {
  const t = useTranslations('landing.whatsapp')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    whatsappNumber: '',
    whatsappDefaultMessage: '',
    whatsappDefaultMessageAr: '',
    email: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchContactInfo() {
      try {
        const response = await fetch('/api/landing/contact-info')
        if (response.ok) {
          const data = await response.json()
          setContactInfo(data)
        }
      } catch (error) {
        logger.error('Error fetching contact info:', { error: error })
        // Keep empty values on error
      } finally {
        setLoading(false)
      }
    }

    fetchContactInfo()
  }, [])

  // Don't render if no WhatsApp number
  if (loading || !contactInfo.whatsappNumber) {
    return null
  }

  // Use Arabic message if locale is Arabic, otherwise use English
  const defaultMessage = isRTL 
    ? (contactInfo.whatsappDefaultMessageAr || t('defaultMessage'))
    : (contactInfo.whatsappDefaultMessage || t('defaultMessage'))

  // Create WhatsApp link
  const whatsappUrl = `https://wa.me/${contactInfo.whatsappNumber}?text=${encodeURIComponent(defaultMessage)}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-16 h-16 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group"
      aria-label={t('ariaLabel')}
    >
      <MessageCircle className="w-8 h-8" />
      {/* Tooltip on hover */}
      <span className="absolute right-20 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
        {t('tooltip')}
      </span>
    </a>
  )
}

