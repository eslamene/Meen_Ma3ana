'use client'

import { useTranslations, useLocale } from 'next-intl'

export default function Inspiration() {
  const t = useTranslations('landing.inspiration')
  const locale = useLocale()
  const isRTL = locale === 'ar'

  // Get quotes from translations
  const quotes = t.raw('quotes') as Array<{
    text: string
    icon: string
    signature?: string
  }>

  return (
    <section className="bg-gradient-to-br from-gray-900 to-[#6B8E7E] py-20 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {quotes.map((quote, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-white/20 hover:bg-white/15 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl md:text-3xl flex-shrink-0 mt-1">
                  {quote.icon}
                </span>
                <div className="flex-1">
                  <p className="text-lg md:text-xl leading-relaxed text-white/95 whitespace-pre-line">
                    {quote.text}
                  </p>
                  {quote.signature && (
                    <p className="text-lg md:text-xl text-white/95 mt-4" style={{ textAlign: isRTL ? 'left' : 'right' }}>
                      {quote.signature}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

