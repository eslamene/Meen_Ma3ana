'use client'

import { useTranslations } from 'next-intl'

export default function Hero() {
  const t = useTranslations('landing.hero')
  const tCTA = useTranslations('landing.cta')

  return (
    <section className="relative bg-gradient-to-br from-[#6B8E7E]/10 via-white to-[#E74C3C]/10 py-20 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            {t('title')}
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-8 font-medium">
            {t('subtitle')}
          </p>
          <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            {t('description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`mailto:${tCTA('email')}`}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-[#E74C3C] rounded-lg hover:bg-[#d63a2a] transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
            >
              {t('ctaPrimary')}
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white rounded-lg border-2 border-gray-300 hover:border-[#6B8E7E] hover:text-[#6B8E7E] transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
            >
              {t('ctaSecondary')}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

