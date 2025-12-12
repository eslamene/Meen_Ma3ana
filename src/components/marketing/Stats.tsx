'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import { Heart, Users, HandHeart, Sparkles, TrendingUp, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface LandingStats {
  totalRaised: number
  activeCases: number
  beneficiaries: number
  contributors: number
}

interface ImpactMetric {
  icon: React.ReactNode
  value: string
  label: string
  labelAr: string
  color: string
  bgColor: string
  description: string
  descriptionAr: string
}

function formatNumber(num: number): string {
  if (num === 0) {
    return '0'
  }
  if (num >= 1000000) {
    const millions = num / 1000000
    if (millions % 1 < 0.005) {
      return `${Math.floor(millions)}M+`
    }
    return `${millions.toFixed(1)}M+`
  }
  if (num >= 1000) {
    const thousands = num / 1000
    if (thousands % 1 < 0.005) {
      return `${Math.floor(thousands)}K+`
    }
    return `${thousands.toFixed(1)}K+`
  }
  return `${num.toLocaleString()}`
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) {
    const millions = amount / 1000000
    if (millions % 1 < 0.005) {
      return `${Math.floor(millions)}M+`
    }
    return `${millions.toFixed(1)}M+`
  }
  if (amount >= 1000) {
    const thousands = amount / 1000
    if (thousands % 1 < 0.005) {
      return `${Math.floor(thousands)}K+`
    }
    return `${thousands.toFixed(1)}K+`
  }
  return amount.toLocaleString()
}

export default function Stats() {
  const t = useTranslations('landing.stats')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [stats, setStats] = useState<LandingStats>({
    totalRaised: 0,
    activeCases: 0,
    beneficiaries: 0,
    contributors: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/landing/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching landing stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const impactMetrics: ImpactMetric[] = [
    {
      icon: <Heart className="h-8 w-8" />,
      value: loading ? '...' : formatAmount(stats.totalRaised),
      label: 'Total Raised',
      labelAr: 'إجمالي المبالغ',
      color: 'text-[#E74C3C]',
      bgColor: 'bg-[#E74C3C]/10',
      description: 'contributions making a real difference',
      descriptionAr: 'مساهمات عملت فرق حقيقي',
    },
    {
      icon: <Users className="h-8 w-8" />,
      value: loading ? '...' : formatNumber(stats.beneficiaries),
      label: 'Lives Touched',
      labelAr: 'عدد المستفيدين',
      color: 'text-[#6B8E7E]',
      bgColor: 'bg-[#6B8E7E]/10',
      description: 'Families and individuals supported by our community',
      descriptionAr: 'أسر وأفراد و ومشرروعات دعمناهم',
    },
    {
      icon: <HandHeart className="h-8 w-8" />,
      value: loading ? '...' : formatNumber(stats.contributors),
      label: 'Generous Hearts',
      labelAr: 'قلوب كريمة',
      color: 'text-[#3498DB]',
      bgColor: 'bg-[#3498DB]/10',
      description: 'People coming together to create positive change',
      descriptionAr:  'اتجمعت عشان تساعد معانا',
    },
    {
      icon: <Sparkles className="h-8 w-8" />,
      value: loading ? '...' : formatNumber(stats.activeCases),
      label: 'Active Initiatives',
      labelAr: 'حالات محتاجة دعم',
      color: 'text-[#9B59B6]',
      bgColor: 'bg-[#9B59B6]/10',
      description: 'Ongoing projects transforming lives every day',
      descriptionAr: 'حالات حقيقية محتاجة دعم',
    },
  ]

  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Impact Metrics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {impactMetrics.map((metric, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#6B8E7E]/30 transform hover:-translate-y-2"
            >
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-16 h-16 ${metric.bgColor} rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <div className={metric.color}>{metric.icon}</div>
              </div>

              {/* Value */}
              <div className="mb-2">
                <span className={`text-4xl md:text-5xl font-bold ${metric.color}`}>
                  {metric.value}
                </span>
                {index === 0 && (
                  <span className="text-xl text-gray-500 ml-2">EGP</span>
                )}
              </div>

              {/* Label */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2" dir={isRTL ? 'rtl' : 'ltr'}>
                {isRTL ? metric.labelAr : metric.label}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed" dir={isRTL ? 'rtl' : 'ltr'}>
                {isRTL ? metric.descriptionAr : metric.description}
              </p>

              {/* Decorative corner */}
              <div className={`absolute top-0 right-0 w-20 h-20 ${metric.bgColor} rounded-bl-full opacity-20`}></div>
            </div>
          ))}
        </div>

        {/* Community Message Section */}
        <div className="bg-gradient-to-r from-[#6B8E7E] to-[#5a7a6b] rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden mb-16">
          {/* Background image */}
          <div className="absolute inset-0">
            <Image 
              src="/img/Child-Poverty-General.jpg"
              alt="Children in need"
              fill
              className="object-cover"
              priority
              quality={85}
            />
          </div>
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#6B8E7E]/50 to-[#5a7a6b]/50"></div>

          <div className="relative z-10 text-center text-white">
            <TrendingUp className="h-12 w-12 mx-auto mb-6 opacity-90" />
            <h3 className="text-2xl md:text-3xl font-bold mb-4" dir={isRTL ? 'rtl' : 'ltr'}>
              {isRTL ? 'قوة مين معانا' : 'The Power of Meen Ma3an'}
            </h3>
            <p className="text-lg md:text-xl opacity-95 max-w-3xl mx-auto leading-relaxed mb-8" dir={isRTL ? 'rtl' : 'ltr'}>
              {isRTL 
                ? 'كل مساهمة، حتي لو بسيطة هتفرق بجد .'
                : 'Every contribution, even a small one, truly makes a difference.'}
            </p>
            <Link
              href={`/${locale}/cases`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#6B8E7E] rounded-lg hover:bg-gray-50 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span>{isRTL ? 'حالات محتاجة دعم' : 'Cases Needing Support'}</span>
              <ArrowRight className={`h-5 w-5 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
