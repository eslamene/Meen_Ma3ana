'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface LandingStats {
  totalRaised: number
  activeCases: number
  beneficiaries: number
  contributors: number
}

function formatNumber(num: number): string {
  if (num === 0) {
    return '0'
  }
  if (num >= 1000000) {
    // Round to 2 decimal places for more precision
    const millions = num / 1000000
    // If it's close to a whole number (within 0.005), show as whole number
    if (millions % 1 < 0.005) {
      return `${Math.floor(millions)}M+`
    }
    return `${millions.toFixed(2)}M+`
  }
  if (num >= 1000) {
    const thousands = num / 1000
    if (thousands % 1 < 0.005) {
      return `${Math.floor(thousands)}K+`
    }
    return `${thousands.toFixed(2)}K+`
  }
  return `${num.toLocaleString()}`
}

export default function Stats() {
  const t = useTranslations('landing.stats')
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
        // Keep default values on error
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statsData = [
    { label: t('totalRaised'), value: formatNumber(stats.totalRaised) },
    { label: t('activeCases'), value: formatNumber(stats.activeCases) },
    { label: t('beneficiaries'), value: formatNumber(stats.beneficiaries) },
    { label: t('contributors'), value: formatNumber(stats.contributors) },
  ]

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {statsData.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-xl bg-gradient-to-br from-[#6B8E7E]/10 to-[#E74C3C]/10 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="text-3xl md:text-4xl font-bold text-[#E74C3C] mb-2">
                {loading ? '...' : stat.value}
              </div>
              <div className="text-sm md:text-base text-gray-600 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

