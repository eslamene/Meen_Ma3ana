'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import { Heart, Users, DollarSign, Calendar, TrendingUp, ArrowRight, Stethoscope, GraduationCap, Home } from 'lucide-react'
import Link from 'next/link'

interface SuccessStory {
  id: string
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  amount: number
  amountFormatted: string
  contributors: number
  month: string
}

interface SuccessStoriesData {
  featured: SuccessStory[]
  byCategory: {
    medical: SuccessStory[]
    education: SuccessStory[]
    housing: SuccessStory[]
  }
}

export default function Stories() {
  const t = useTranslations('landing.stories')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [stories, setStories] = useState<SuccessStoriesData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStories() {
      try {
        const response = await fetch('/api/landing/impact')
        if (response.ok) {
          const data = await response.json()
          setStories(data.successStories)
        }
      } catch (error) {
        console.error('Error fetching success stories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStories()
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

  // Get stories to display - prioritize byCategory (has real case IDs), then featured
  const getDisplayStories = (): SuccessStory[] => {
    if (!stories) return []
    
    const displayStories: SuccessStory[] = []
    
    // Prioritize byCategory stories first (they have real case IDs for linking)
    if (stories.byCategory) {
      const categoryStories = [
        ...(stories.byCategory.medical || []),
        ...(stories.byCategory.education || []),
        ...(stories.byCategory.housing || []),
      ]
      
      // Add unique stories (by ID) up to 3 total
      const existingIds = new Set<string>()
      for (const story of categoryStories) {
        if (displayStories.length >= 3) break
        if (!existingIds.has(story.id)) {
          displayStories.push(story)
          existingIds.add(story.id)
        }
      }
    }
    
    // Fill remaining slots with featured stories if needed
    if (displayStories.length < 3 && stories.featured && stories.featured.length > 0) {
      const existingIds = new Set(displayStories.map(s => s.id))
      for (const story of stories.featured) {
        if (displayStories.length >= 3) break
        // Only add if we don't already have a story with this title (to avoid duplicates)
        const hasDuplicate = displayStories.some(s => s.title === story.title)
        if (!hasDuplicate && !existingIds.has(story.id)) {
          displayStories.push(story as SuccessStory)
          existingIds.add(story.id)
        }
      }
    }
    
    return displayStories.slice(0, 3)
  }

  const displayStories = getDisplayStories()

  // Category icons and colors
  const getCategoryInfo = (title: string, titleAr: string): { icon: React.ReactNode; color: string; bgColor: string } => {
    const titleLower = title.toLowerCase()
    const titleArLower = titleAr.toLowerCase()
    
    if (titleLower.includes('medical') || titleArLower.includes('طبي') || titleArLower.includes('طوارئ')) {
      return {
        icon: <Stethoscope className="h-6 w-6" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      }
    }
    if (titleLower.includes('education') || titleArLower.includes('تعليم') || titleArLower.includes('دراس')) {
      return {
        icon: <GraduationCap className="h-6 w-6" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      }
    }
    if (titleLower.includes('housing') || titleArLower.includes('سكن') || titleArLower.includes('مسكن')) {
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

  if (loading) {
    return (
      <section className="bg-gradient-to-b from-white to-gray-50 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!stories || displayStories.length === 0) {
    return null
  }

  return (
    <section className="bg-gradient-to-b from-white to-gray-50 py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#6B8E7E]/10 rounded-full mb-6">
            <Heart className="h-8 w-8 text-[#6B8E7E]" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {displayStories.map((story) => {
            const categoryInfo = getCategoryInfo(story.title, story.titleAr)
            
            // Only make clickable if we have a valid case ID (not placeholder IDs like 'medical-1')
            const isValidCaseId = story.id && !story.id.includes('-') && story.id.length > 10
            const CardContent = (
              <div className="h-full bg-white rounded-2xl p-6 md:p-8 shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#6B8E7E]/30 flex flex-col">
                  {/* Category Icon */}
                  <div className={`inline-flex items-center justify-center w-14 h-14 ${categoryInfo.bgColor} rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <div className={categoryInfo.color}>
                      {categoryInfo.icon}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#6B8E7E] transition-colors" dir={isRTL ? 'rtl' : 'ltr'}>
                    {isRTL ? story.titleAr : story.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 mb-6 leading-relaxed flex-grow" dir={isRTL ? 'rtl' : 'ltr'}>
                    {isRTL ? story.descriptionAr : story.description}
                  </p>

                  {/* Stats */}
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    {/* Amount Raised */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="h-4 w-4 text-[#E74C3C]" />
                        <span className="text-sm font-medium">{isRTL ? 'المبلغ المجموع' : 'Amount Raised'}</span>
                      </div>
                      <span className="text-lg font-bold text-[#E74C3C]">
                        {formatNumber(story.amount)} EGP
                      </span>
                    </div>

                    {/* Contributors */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">{isRTL ? 'المساهمون' : 'Contributors'}</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900">
                        {story.contributors || 0}
                      </span>
                    </div>

                    {/* Month */}
                    {story.month && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4 text-[#6B8E7E]" />
                          <span className="text-sm font-medium">{isRTL ? 'الشهر' : 'Month'}</span>
                        </div>
                        <span className="text-sm font-medium text-[#6B8E7E]">
                          {story.month}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Read More Link */}
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-[#6B8E7E] group-hover:gap-3 transition-all">
                    <span className="text-sm font-semibold">{t('readMore')}</span>
                    <ArrowRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                </div>
            )

            return isValidCaseId ? (
              <Link
                key={story.id}
                href={`/${locale}/cases/${story.id}`}
                className="group"
              >
                {CardContent}
              </Link>
            ) : (
              <div key={story.id} className="group">
                {CardContent}
              </div>
            )
          })}
        </div>

        {/* View All Link */}
        <div className="text-center mt-12">
          <Link
            href={`/${locale}/cases`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#6B8E7E] text-white rounded-lg hover:bg-[#5a7a6b] transition-colors font-semibold shadow-md hover:shadow-lg"
          >
            <TrendingUp className="h-5 w-5" />
            <span>{t('viewAll')}</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

