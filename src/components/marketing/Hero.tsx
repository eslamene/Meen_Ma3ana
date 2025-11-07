'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'

export default function Hero() {
  const t = useTranslations('landing.hero')
  const tCTA = useTranslations('landing.cta')

  return (
    <section className="relative overflow-hidden py-20 lg:py-32 bg-gradient-to-br from-yellow-100 via-orange-100 to-red-100">
      {/* Animated Background Banner */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top Shape - Animated fade in from top - Top left aligned at 30vw */}
        <div className="absolute top-0 left-0 w-full h-full hidden md:block" style={{ animation: 'fadeInDown 1s ease-out 0s forwards', opacity: 0 }}>
          <div className="absolute top-0 opacity-50" style={{ left: '5vw', width: '40%', height: '35%' }}>
            <Image
              src="/banner/svg/bg_top.svg"
              alt=""
              fill
              className="object-contain object-left-top"
              priority
            />
          </div>
        </div>

        {/* Left Shape - Animated slide in from left */}
        <div className="absolute top-0 left-0 w-full h-full hidden md:block" style={{ animation: 'fadeInLeft 1.2s ease-out 0.2s forwards', opacity: 0 }}>
          <div className="relative opacity-50 w-full h-full">
            <Image
              src="/banner/svg/bg_left.svg"
              alt=""
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>

        {/* Right Shape - Animated slide in from right */}
        <div className="absolute top-0 right-0 w-full h-full hidden md:block" style={{ animation: 'fadeInRight 1.2s ease-out 0.4s forwards', opacity: 0 }}>
          <div className="absolute top-0 right-0 w-[60%] h-full opacity-50">
            <Image
              src="/banner/svg/bg_right.svg"
              alt=""
              fill
              className="object-contain"
              style={{ objectPosition: 'right center' }}
              priority
            />
          </div>
        </div>

        {/* Center Shape - Animated fade in - Right side behind hand */}
        <div className="absolute top-0 right-0 w-full h-full z-0" style={{ animation: 'fadeIn 1.5s ease-out 0.6s forwards', opacity: 0 }}>
          <div className="absolute top-1/2 -translate-y-1/2 w-[80%] h-full opacity-50 relative" style={{ right: '-2vw' }}>
            <Image
              src="/banner/svg/bg_center.svg"
              alt=""
              fill
              className="object-contain"
              style={{ objectPosition: 'right center' }}
              priority
            />
          </div>
        </div>

        {/* Hand with Heart - Animated slide in from right, enlarge, then settle */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-full h-full z-10" style={{ animation: 'slideInRightScale 1.5s ease-out 0.8s forwards', opacity: 0 }}>
          <div className="absolute top-1/2 -translate-y-[55%] md:-translate-y-1/2 right-0 w-[70%] h-[90%] md:w-[50%] md:h-[80%]" style={{ right: '-2vw' }}>
            <Image
              src="/banner/svg/bg_hand.svg"
              alt=""
              fill
              className="object-contain"
              style={{ objectPosition: 'right center' }}
              priority
            />
          </div>
        </div>

        {/* Bottom Shape - Animated fade in from bottom - Bottom right aligned at 10vw */}
        <div className="absolute bottom-0 right-0 w-full h-full hidden md:block" style={{ animation: 'fadeInUp 1.2s ease-out 1.0s forwards', opacity: 0 }}>
          <div className="absolute bottom-0 opacity-50" style={{ right: '40vw', width: '40%', height: '30%' }}>
            <Image
              src="/banner/svg/bg_bottom.svg"
              alt=""
              fill
              className="object-contain object-bottom-right"
              priority
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight" style={{ animation: 'fadeInUp 0.8s ease-out 0s forwards', opacity: 0 }}>
            {t('title')}
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-8 font-medium" style={{ animation: 'fadeInUp 0.8s ease-out 0.2s forwards', opacity: 0 }}>
            {t('subtitle')}
          </p>
          <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto" style={{ animation: 'fadeInUp 0.8s ease-out 0.4s forwards', opacity: 0 }}>
            {t('description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center" style={{ animation: 'fadeInUp 0.8s ease-out 0.6s forwards', opacity: 0 }}>
            <a
              href={`mailto:${tCTA('email')}`}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-[#E74C3C] rounded-lg hover:bg-[#d63a2a] transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
            >
              {t('ctaPrimary')}
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white rounded-lg border-2 border-gray-300 hover:border-[#6B8E7E] hover:text-[#6B8E7C] transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
            >
              {t('ctaSecondary')}
            </a>
          </div>
        </div>
      </div>

    </section>
  )
}
