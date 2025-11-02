'use client'

import { useTranslations } from 'next-intl'
import { Search, Gem, Target, Heart } from 'lucide-react'

export default function Values() {
  const t = useTranslations('landing.values')

  const values = [
    { key: 'transparency', Icon: Search },
    { key: 'integrity', Icon: Gem },
    { key: 'impact', Icon: Target },
    { key: 'community', Icon: Heart },
  ]

  return (
    <section className="bg-gradient-to-br from-[#6B8E7E]/5 to-[#E74C3C]/5 py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value) => {
            const IconComponent = value.Icon
            return (
              <div
                key={value.key}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 text-center"
              >
                <div className="w-16 h-16 bg-[#6B8E7E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconComponent className="w-8 h-8 text-[#6B8E7E]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t(`${value.key}.title`)}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {t(`${value.key}.description`)}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

