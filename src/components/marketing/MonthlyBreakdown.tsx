'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useEffect, useState } from 'react'

interface MonthlyData {
  month: number
  monthName: string
  monthNameArabic: string
  totalCases: number
  totalAmount: number
  totalAmountFormatted: string
  contributors: number
  topCategory: {
    name: string
    nameArabic?: string
    amount: number
    cases: number
  }
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

export default function MonthlyBreakdown() {
  const t = useTranslations('landing.monthlyBreakdown')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/landing/impact')
        if (response.ok) {
          const data = await response.json()
          setMonthlyData(data.monthlyBreakdown || [])
        }
      } catch (error) {
        console.error('Error fetching monthly breakdown:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        </div>
      </section>
    )
  }

  if (monthlyData.length === 0) {
    return null
  }

  return (
    <section className="bg-gray-50 py-16">
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
          {monthlyData.map((month) => (
            <div
              key={month.month}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900" dir={isRTL ? 'rtl' : 'ltr'}>
                  {isRTL ? month.monthNameArabic : month.monthName}
                </h3>
                <span className="text-sm text-gray-500">
                  {month.totalCases} {t('cases')}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t('totalAmount')}</span>
                  <span className="text-lg font-bold text-[#E74C3C]">
                    {formatNumber(month.totalAmount)} EGP
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t('contributors')}</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {month.contributors}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">{t('topCategory')}</p>
                  <p className="font-semibold text-[#6B8E7E]" dir={isRTL ? 'rtl' : 'ltr'}>
                    {isRTL && month.topCategory.nameArabic 
                      ? month.topCategory.nameArabic 
                      : month.topCategory.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatNumber(month.topCategory.amount)} EGP • {month.topCategory.cases} {t('cases')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

