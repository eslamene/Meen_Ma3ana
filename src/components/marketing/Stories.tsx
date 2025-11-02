'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface StoryStats {
  storyMedicalRaised: number
  storyEducationStudents: number
  storyHousingFamilies: number
}

export default function Stories() {
  const t = useTranslations('landing.stories')
  const [stats, setStats] = useState<StoryStats>({
    storyMedicalRaised: 0,
    storyEducationStudents: 0,
    storyHousingFamilies: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/landing/stats')
        if (response.ok) {
          const data = await response.json()
          setStats({
            storyMedicalRaised: data.storyMedicalRaised || 0,
            storyEducationStudents: data.storyEducationStudents || 0,
            storyHousingFamilies: data.storyHousingFamilies || 0,
          })
        }
      } catch (error) {
        console.error('Error fetching story stats:', error)
        // Keep default values on error
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Get stories from translations
  const storiesRaw = t.raw('items') as Array<{
    title: string
    description: string
    impact: string
    impactKey?: string // Optional key to identify which stat to use
  }>

  // Map story indices to stat keys
  const statKeys = ['storyMedicalRaised', 'storyEducationStudents', 'storyHousingFamilies']
  
  // Format number based on the impact text pattern
  const formatImpact = (impactTemplate: string, value: number, index: number): string => {
    if (loading) return impactTemplate
    
    const statKey = statKeys[index]
    if (!statKey) return impactTemplate
    
    const statValue = stats[statKey as keyof StoryStats] || 0
    
    // Extract the pattern from the template and replace the number
    // English patterns: "50,000 EGP raised", "30 students helped", "15 families supported"
    // Arabic patterns: "تم جمع 50,000 جنيه", "تم مساعدة 30 طالب", "تم دعم 15 أسرة"
    
    // Check for EGP/mبلغ (Arabic: مبلغ/جنيه) patterns
    if (impactTemplate.includes('EGP') || impactTemplate.includes('مبلغ') || impactTemplate.includes('جنيه') || impactTemplate.includes('Amount raised')) {
      // If Arabic, format: "تم جمع مبلغ {number} جنيه"
      if (impactTemplate.includes('مبلغ') || impactTemplate.includes('جنيه')) {
        // Arabic: "تم جمع مبلغ {number} جنيه"
        return `تم جمع مبلغ ${statValue.toLocaleString()} جنيه`
      } else if (impactTemplate.includes('Amount raised')) {
        // English: "Amount raised: {number} EGP"
        return `Amount raised: ${statValue.toLocaleString()} EGP`
      } else {
        // Fallback for old format: "50,000 EGP raised"
        const parts = impactTemplate.split(/\d+/)
        const beforeNumber = parts[0]?.trim() || ''
        const afterNumber = parts[1]?.trim() || ''
        return `${beforeNumber} ${statValue.toLocaleString()} EGP ${afterNumber || 'raised'}`
      }
    }
    
    // Check for students/طالب patterns
    if (impactTemplate.includes('students') || impactTemplate.includes('طالب')) {
      const parts = impactTemplate.split(/\d+/)
      const beforeNumber = parts[0]?.trim() || ''
      const afterNumber = parts[1]?.trim() || ''
      if (impactTemplate.includes('طالب')) {
        // Arabic: "تم مساعدة 30 طالب"
        return `${beforeNumber} ${statValue.toLocaleString()} ${afterNumber}`
      } else {
        // English: "30 students helped"
        return `${statValue.toLocaleString()} students ${afterNumber || 'helped'}`
      }
    }
    
    // Check for families/أسرة patterns
    if (impactTemplate.includes('families') || impactTemplate.includes('أسرة')) {
      const parts = impactTemplate.split(/\d+/)
      const beforeNumber = parts[0]?.trim() || ''
      const afterNumber = parts[1]?.trim() || ''
      if (impactTemplate.includes('أسرة')) {
        // Arabic: "تم دعم 15 أسرة"
        return `${beforeNumber} ${statValue.toLocaleString()} ${afterNumber}`
      } else {
        // English: "15 families supported"
        return `${statValue.toLocaleString()} families ${afterNumber || 'supported'}`
      }
    }
    
    // Fallback: try to extract and replace any number
    const numberPattern = /[\d,]+/g
    return impactTemplate.replace(numberPattern, statValue.toLocaleString())
  }

  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {storiesRaw.map((story, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-[#6B8E7E]/10 to-[#E74C3C]/10 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {story.title}
              </h3>
              <p className="text-gray-700 mb-4 leading-relaxed">
                {story.description}
              </p>
              <div className="text-sm font-semibold text-[#E74C3C]">
                {formatImpact(story.impact, 0, index)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

