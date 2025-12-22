'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useEffect, useState } from 'react'

import { defaultLogger as logger } from '@/lib/logger'

interface CategoryData {
  name: string
  nameArabic: string
  totalCases: number
  totalAmount: number
  totalAmountFormatted: string
  averagePerCase: number
  description: string
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toLocaleString()
}

export default function CategorySummary() {
  const t = useTranslations('landing.categorySummary')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [categories, setCategories] = useState<Record<string, CategoryData>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/landing/impact')
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categorySummary || {})
        }
      } catch (error) {
        logger.error('Error fetching category summary:', { error: error })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <section className="bg-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        </div>
      </section>
    )
  }

  const categoryArray = Object.values(categories)
  if (categoryArray.length === 0) {
    return null
  }

  // Sort by total amount (descending)
  const sortedCategories = [...categoryArray].sort((a, b) => b.totalAmount - a.totalAmount)

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCategories.map((category) => (
            <div
              key={category.name}
              className="bg-gradient-to-br from-[#6B8E7E]/10 to-[#E74C3C]/10 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2" dir={isRTL ? 'rtl' : 'ltr'}>
                {isRTL ? category.nameArabic : category.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4" dir={isRTL ? 'rtl' : 'ltr'}>
                {category.description}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t('totalCases')}</span>
                  <span className="text-lg font-bold text-[#E74C3C]">
                    {category.totalCases}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t('totalAmount')}</span>
                  <span className="text-lg font-bold text-[#E74C3C]">
                    {formatNumber(category.totalAmount)} EGP
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                  <span className="text-sm text-gray-600">{t('averagePerCase')}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatNumber(category.averagePerCase)} EGP
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

