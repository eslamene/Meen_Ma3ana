'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail } from 'lucide-react'
import Link from 'next/link'
import SystemContentModal from './SystemContentModal'

interface SocialMediaLinks {
  facebook?: string
  twitter?: string
  instagram?: string
  linkedin?: string
  youtube?: string
  email?: string
}

interface FooterProps {
  currentYear: number
}

export default function Footer({ currentYear }: FooterProps) {
  const t = useTranslations('landing.footer')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [socialMedia, setSocialMedia] = useState<SocialMediaLinks>({})
  const [modalContentKey, setModalContentKey] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    // Fetch social media links from API
    const fetchSocialMedia = async () => {
      try {
        const response = await fetch('/api/landing/social-media')
        if (response.ok) {
          const data = await response.json()
          setSocialMedia(data.socialMedia || {})
        }
      } catch (error) {
        console.error('Error fetching social media links:', error)
      }
    }

    fetchSocialMedia()
  }, [])

  const handleContentClick = (contentKey: string) => {
    setModalContentKey(contentKey)
    setIsModalOpen(true)
  }

  // Map platform names to icons and labels
  const socialPlatforms = [
    {
      key: 'facebook',
      icon: Facebook,
      label: 'Facebook',
      url: socialMedia.facebook,
    },
    {
      key: 'twitter',
      icon: Twitter,
      label: 'Twitter',
      url: socialMedia.twitter,
    },
    {
      key: 'instagram',
      icon: Instagram,
      label: 'Instagram',
      url: socialMedia.instagram,
    },
    {
      key: 'linkedin',
      icon: Linkedin,
      label: 'LinkedIn',
      url: socialMedia.linkedin,
    },
    {
      key: 'youtube',
      icon: Youtube,
      label: 'YouTube',
      url: socialMedia.youtube,
    },
    {
      key: 'email',
      icon: Mail,
      label: 'Email',
      url: socialMedia.email ? `mailto:${socialMedia.email}` : undefined,
    },
  ].filter((platform) => platform.url) // Only show platforms with URLs

  return (
    <>
      <footer className="bg-[#6B8E7E] text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6">
            {/* Top Row: Copyright and Social Media */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Copyright */}
              <div className="text-center md:text-left">
                <p className="text-white/90">
                  © {currentYear} {t('copyright')}
                </p>
              </div>

              {/* Social Media Links */}
              {socialPlatforms.length > 0 && (
                <div className="flex items-center justify-center md:justify-end gap-4">
                  {socialPlatforms.map((platform) => {
                    const Icon = platform.icon
                    return (
                      <Link
                        key={platform.key}
                        href={platform.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/80 hover:text-white transition-colors duration-200 p-2 hover:bg-white/10 rounded-full"
                        aria-label={platform.label}
                      >
                        <Icon className="h-5 w-5" />
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bottom Row: Terms and Privacy Policy */}
            <div className="flex items-center justify-center gap-6 pt-4 border-t border-white/20">
              <button
                onClick={() => handleContentClick('terms_of_service')}
                className="text-white/80 hover:text-white transition-colors duration-200 text-sm underline-offset-4 hover:underline"
              >
                {isRTL ? 'شروط الخدمة' : 'Terms of Service'}
              </button>
              <span className="text-white/40">|</span>
              <button
                onClick={() => handleContentClick('privacy_policy')}
                className="text-white/80 hover:text-white transition-colors duration-200 text-sm underline-offset-4 hover:underline"
              >
                {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* System Content Modal */}
      {modalContentKey && (
        <SystemContentModal
          contentKey={modalContentKey}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}
    </>
  )
}

