'use client'

import { useParams } from 'next/navigation'
import Image from 'next/image'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function MarketingHeader() {
  const params = useParams()
  const locale = params.locale as string
  const isArabic = locale === 'ar'

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <a href={`/${locale}/landing`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {/* Logo Image */}
              <Image
                src="/logo.png"
                alt="Meen Ma3ana"
                width={120}
                height={40}
                className="object-contain h-10 w-auto"
                priority
              />
              {/* Brand Name - English */}
              {!isArabic && (
                <span className="text-2xl font-bold tracking-tight">
                  <span className="text-[#6B8E7E]">Meen</span>{' '}
                  <span className="text-[#E74C3C]">Ma3ana</span>
                </span>
              )}
              {/* Brand Name - Arabic */}
              {isArabic && (
                <span className="text-2xl font-bold tracking-tight">
                  <span className="text-[#6B8E7E]">مين</span>{' '}
                  <span className="text-[#E74C3C]">معانا</span>
                </span>
              )}
            </a>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  )
}

