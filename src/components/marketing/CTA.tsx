'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface ContactInfo {
  whatsappNumber: string
  whatsappDefaultMessage: string
  email: string
}

export default function CTA() {
  const t = useTranslations('landing.cta')
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    whatsappNumber: '',
    whatsappDefaultMessage: '',
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
        console.error('Error fetching contact info:', error)
        // Keep empty values on error
      } finally {
        setLoading(false)
      }
    }

    fetchContactInfo()
  }, [])

  const email = contactInfo.email || t('email')

  return (
    <section className="bg-gradient-to-br from-[#6B8E7E] to-[#E74C3C] py-20 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('title')}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {t('subtitle')}
          </p>
          {!loading && email && (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-[#6B8E7E] bg-white rounded-lg hover:bg-gray-100 transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
            >
              {t('button')}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

