'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import { Heart, Users, DollarSign, Calendar, TrendingUp, ArrowRight, Stethoscope, GraduationCap, Home, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { defaultLogger as logger } from '@/lib/logger'

interface CategoryImpact {
  name: string
  nameAr: string
  totalCases: number
  totalAmount: number
  averagePerCase: number
  description: string
  descriptionAr: string
  icon: string
  color: string
}

interface ImpactData {
  ourImpact: {
    totalRaised: number
    activeCases: number
    beneficiariesHelped: number
    contributors: number
  }
  categorySummary: Record<string, CategoryImpact>
}

export default function Stories() {
  const t = useTranslations('landing.stories')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [impactData, setImpactData] = useState<ImpactData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchImpact() {
      try {
        const response = await fetch('/api/landing/impact')
        if (response.ok) {
          const data = await response.json()
          setImpactData(data)
        }
      } catch (error) {
        logger.error('Error fetching impact data:', { error: error })
      } finally {
        setLoading(false)
      }
    }

    fetchImpact()
  }, [])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toLocaleString()
  }

  // Get top 3 categories by impact (total amount)
  const getTopCategories = (): Array<CategoryImpact & { key: string }> => {
    if (!impactData?.categorySummary) return []
    
    // Ensure categorySummary is an object before processing
    const categorySummary = impactData.categorySummary && typeof impactData.categorySummary === 'object' 
      ? impactData.categorySummary 
      : {}
    
    const categories = Object.entries(categorySummary)
      .map(([key, data]) => ({ ...data, key }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 3)
    
    return categories
  }

  const topCategories = getTopCategories()

  // Category icons and colors mapping
  const getCategoryInfo = (categoryKey: string, icon?: string): { icon: React.ReactNode; color: string; bgColor: string } => {
    const keyLower = categoryKey.toLowerCase()
    
    if (keyLower.includes('medical') || icon?.includes('medical') || icon?.includes('stethoscope')) {
      return {
        icon: <Stethoscope className="h-6 w-6" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      }
    }
    if (keyLower.includes('education') || icon?.includes('education') || icon?.includes('graduation')) {
      return {
        icon: <GraduationCap className="h-6 w-6" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      }
    }
    if (keyLower.includes('housing') || icon?.includes('housing') || icon?.includes('home')) {
      return {
        icon: <Home className="h-6 w-6" />,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      }
    }
    
    // Default
    return {
      icon: <Heart className="h-6 w-6" />,
      color: 'text-[#6B8E7E]',
      bgColor: 'bg-[#6B8E7E]/10'
    }
  }

  // Generic, anonymized descriptions for each category
  const getGenericDescription = (categoryKey: string, isArabic: boolean): string => {
    const keyLower = categoryKey.toLowerCase()
    
    if (keyLower.includes('medical')) {
      return isArabic 
        ? 'دعم طبي طارئ لمساعدة الأسر في تغطية نفقات العلاج والرعاية الصحية'
        : 'Emergency medical support helping families cover treatment and healthcare expenses'
    }
    if (keyLower.includes('education')) {
      return isArabic
        ? 'دعم تعليمي شامل لتمكين الطلاب من متابعة تعليمهم وتحقيق أحلامهم'
        : 'Comprehensive educational support enabling students to continue their studies and achieve their dreams'
    }
    if (keyLower.includes('housing')) {
      return isArabic
        ? 'دعم سكني يساعد الأسر في الحصول على مسكن آمن ومستقر'
        : 'Housing support helping families secure safe and stable homes'
    }
    
    return isArabic
      ? 'دعم مجتمعي يحدث فرقاً حقيقياً في حياة المحتاجين'
      : 'Community support making a real difference in the lives of those in need'
  }

  if (loading) {
    return (
      <section className="bg-gradient-to-b from-white to-gray-50 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B8E7E]"></div>
            <p className="text-gray-600 mt-4">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!impactData || topCategories.length === 0) {
    return null
  }

  return (
    <section className="bg-gradient-to-b from-white to-gray-50 py-20 relative">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#6B8E7E]/20 to-transparent" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#6B8E7E]/10 rounded-full mb-6">
            <Heart className="h-8 w-8 text-[#6B8E7E]" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" dir={isRTL ? 'rtl' : 'ltr'}>
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {topCategories.map((category, index) => {
            const categoryInfo = getCategoryInfo(category.key, category.icon)
            const description = category.description || getGenericDescription(category.key, false)
            const descriptionAr = category.descriptionAr || getGenericDescription(category.key, true)
            
            return (
              <div
                key={category.key}
                className="group h-full bg-white rounded-2xl p-6 md:p-8 shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#6B8E7E]/30 flex flex-col transform hover:-translate-y-1"
              >
                {/* Category Icon */}
                <div className={`inline-flex items-center justify-center w-14 h-14 ${categoryInfo.bgColor} rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <div className={categoryInfo.color}>
                    {categoryInfo.icon}
                  </div>
                </div>

                {/* Title - Use category name */}
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#6B8E7E] transition-colors" dir={isRTL ? 'rtl' : 'ltr'}>
                  {isRTL ? category.nameAr : category.name}
                </h3>

                {/* Generic Description */}
                <p className="text-gray-600 mb-6 leading-relaxed flex-grow" dir={isRTL ? 'rtl' : 'ltr'}>
                  {isRTL ? descriptionAr : description}
                </p>

                {/* Stats */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  {/* Total Amount Raised */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="h-4 w-4 text-[#E74C3C]" />
                      <span className="text-sm font-medium">{isRTL ? 'إجمالي المبلغ' : 'Total Raised'}</span>
                    </div>
                    <span className="text-lg font-bold text-[#E74C3C]">
                      {formatNumber(category.totalAmount)} EGP
                    </span>
                  </div>

                  {/* Cases Supported */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">{isRTL ? 'الحالات المدعومة' : 'Cases Supported'}</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {category.totalCases}
                    </span>
                  </div>

                  {/* Average per Case */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{isRTL ? 'متوسط لكل حالة' : 'Avg per Case'}</span>
                    </div>
                    <span className="text-sm font-medium text-[#6B8E7E]">
                      {formatNumber(category.averagePerCase)} EGP
                    </span>
                  </div>
                </div>

                {/* Learn More Link */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <Link
                    href={`/${locale}/cases`}
                    className="inline-flex items-center gap-2 text-[#6B8E7E] hover:text-[#5a7a6b] transition-colors group/link"
                  >
                    <span className="text-sm font-semibold">{t('readMore')}</span>
                    <ArrowRight className={`h-4 w-4 transition-transform group-hover/link:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* View All Link */}
        <div className="text-center mt-12">
          <Link
            href={`/${locale}/cases`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#6B8E7E] to-[#5a7a6b] text-white rounded-xl hover:from-[#5a7a6b] hover:to-[#4a6a5b] transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <TrendingUp className="h-5 w-5" />
            <span>{t('viewAll')}</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
