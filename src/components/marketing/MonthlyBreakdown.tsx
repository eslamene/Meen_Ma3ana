'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, Users, DollarSign, Clock } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface MonthlyData {
  month: number
  year: number
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

// Constants for scroll calculations - responsive
const CARD_WIDTH_MOBILE = 280 + 16 // card width (280px) + gap (16px) on mobile
const CARD_WIDTH_TABLET = 300 + 16 // card width (300px) + gap (16px) on tablet
const CARD_WIDTH_DESKTOP = 320 + 24 // card width (320px) + gap (24px) on desktop
const SPACER_WIDTH_MOBILE = 32 // Start spacer width on mobile (w-8)
const SPACER_WIDTH_DESKTOP = 128 // Start spacer width on desktop (w-32)
const TOTAL_START_OFFSET_MOBILE = 16 + 280 + 32 // paddingLeft (16px) + card offset (280px) + spacer (32px) on mobile
const TOTAL_START_OFFSET_DESKTOP = 96 + 344 + 128 // paddingLeft (96px) + card offset (344px) + spacer (128px) on desktop

export default function MonthlyBreakdown() {
  const t = useTranslations('landing.monthlyBreakdown')
  const locale = useLocale()
  const isRTL = locale === 'ar'
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/landing/impact')
        if (response.ok) {
          const data = await response.json()
          const dataWithYear = (data.monthlyBreakdown || []).map((item: any) => ({
            ...item,
            year: Number(item.year) || new Date().getFullYear(), // Ensure year is present and numeric
            month: Number(item.month) || 1 // Ensure month is numeric
          }))
          // Sort by year ASC, then month ASC (oldest first)
          const sortedData = [...dataWithYear].sort((a: MonthlyData, b: MonthlyData) => {
            // First compare by year (ascending)
            if (a.year !== b.year) {
              return a.year - b.year // Ascending year (oldest first)
            }
            // If same year, compare by month (ascending)
            return a.month - b.month // Ascending month (oldest first)
          })
          
          // Debug: Log the sorted order
          console.log('Sorted months (oldest to newest):', sortedData.map(d => `${d.monthName} ${d.year}`))
          
          setMonthlyData(sortedData)
          // Set default selection to most recent month (last in ascending order)
          if (sortedData.length > 0) {
            const latest = sortedData[sortedData.length - 1]
            setSelectedMonthYear(`${latest.year}-${String(latest.month).padStart(2, '0')}`)
          }
        }
      } catch (error) {
        console.error('Error fetching monthly breakdown:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Reset scroll position when data loads
  useEffect(() => {
    if (monthlyData.length > 0 && scrollContainerRef.current) {
      // Use responsive spacer width based on screen size
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const spacerWidth = isMobile ? SPACER_WIDTH_MOBILE : SPACER_WIDTH_DESKTOP
      
      scrollContainerRef.current.scrollTo({
        left: spacerWidth,
        behavior: 'auto'
      })
      setCurrentIndex(0)
      
      // Prevent elastic scroll behavior - only prevent horizontal scroll, allow vertical
      const container = scrollContainerRef.current
      const preventElasticScroll = (e: WheelEvent) => {
        // Only prevent if scrolling horizontally, allow vertical scrolling
        if (e.deltaX !== 0 && container.scrollLeft <= spacerWidth && e.deltaX < 0) {
          e.preventDefault()
        }
        // Allow vertical scrolling (deltaY) to pass through
      }
      
      container.addEventListener('wheel', preventElasticScroll, { passive: false })
      
      return () => {
        container.removeEventListener('wheel', preventElasticScroll)
      }
    }
  }, [monthlyData.length])

  // Update scroll indicators and prevent elastic scroll
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const updateScrollIndicators = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container
      
      // Use responsive values based on screen size
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const minScroll = isMobile ? SPACER_WIDTH_MOBILE : SPACER_WIDTH_DESKTOP
      const cardWidth = isMobile ? CARD_WIDTH_MOBILE : window.innerWidth < 1024 ? CARD_WIDTH_TABLET : CARD_WIDTH_DESKTOP
      const totalOffset = isMobile ? TOTAL_START_OFFSET_MOBILE : TOTAL_START_OFFSET_DESKTOP
      
      // Clamp scroll position to prevent elastic effect
      const maxScroll = scrollWidth - clientWidth
      
      if (scrollLeft < minScroll) {
        requestAnimationFrame(() => {
          if (container.scrollLeft < minScroll) {
            container.scrollLeft = minScroll
          }
        })
      }
      
      setCanScrollLeft(scrollLeft > minScroll)
      setCanScrollRight(scrollLeft < maxScroll - 10)
      
      // Update current index based on scroll position
      const adjustedScrollLeft = Math.max(0, scrollLeft - totalOffset)
      const index = Math.round(adjustedScrollLeft / cardWidth)
      setCurrentIndex(Math.min(Math.max(0, index), monthlyData.length - 1))
    }

    container.addEventListener('scroll', updateScrollIndicators, { passive: true })
    updateScrollIndicators()

    return () => container.removeEventListener('scroll', updateScrollIndicators)
  }, [monthlyData])

  // Scroll to selected month/year
  useEffect(() => {
    if (!selectedMonthYear || !scrollContainerRef.current) return
    
    const [year, month] = selectedMonthYear.split('-').map(Number)
    const index = monthlyData.findIndex(
      item => item.year === year && item.month === month
    )
    
    if (index !== -1 && scrollContainerRef.current) {
      // Use responsive values
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const cardWidth = isMobile ? CARD_WIDTH_MOBILE : window.innerWidth < 1024 ? CARD_WIDTH_TABLET : CARD_WIDTH_DESKTOP
      const totalOffset = isMobile ? TOTAL_START_OFFSET_MOBILE : TOTAL_START_OFFSET_DESKTOP
      
      // Scroll to card position accounting for total start offset
      scrollContainerRef.current.scrollTo({
        left: totalOffset + (index * cardWidth),
        behavior: 'smooth'
      })
      setCurrentIndex(index)
    }
  }, [selectedMonthYear, monthlyData])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    
    // Use responsive card width
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const cardWidth = isMobile ? CARD_WIDTH_MOBILE : window.innerWidth < 1024 ? CARD_WIDTH_TABLET : CARD_WIDTH_DESKTOP
    
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -cardWidth : cardWidth,
      behavior: 'smooth'
    })
  }

  // Generate month/year options
  const monthYearOptions = monthlyData.map(item => ({
    value: `${item.year}-${String(item.month).padStart(2, '0')}`,
    label: `${item.monthName} ${item.year}`,
    labelAr: `${item.monthNameArabic} ${item.year}`
  }))

  // Calculate next month placeholder
  const getNextMonthPlaceholder = (): MonthlyData | null => {
    if (monthlyData.length === 0) return null
    
    // Get the most recent month (last in ascending order)
    const latestMonth = monthlyData[monthlyData.length - 1]
    let nextMonth = latestMonth.month + 1
    let nextYear = latestMonth.year
    
    // Handle year rollover
    if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }
    
    // Month name mappings
    const monthNames: Record<number, { en: string; ar: string }> = {
      1: { en: 'January', ar: 'يناير' },
      2: { en: 'February', ar: 'فبراير' },
      3: { en: 'March', ar: 'مارس' },
      4: { en: 'April', ar: 'أبريل' },
      5: { en: 'May', ar: 'مايو' },
      6: { en: 'June', ar: 'يونيو' },
      7: { en: 'July', ar: 'يوليو' },
      8: { en: 'August', ar: 'أغسطس' },
      9: { en: 'September', ar: 'سبتمبر' },
      10: { en: 'October', ar: 'أكتوبر' },
      11: { en: 'November', ar: 'نوفمبر' },
      12: { en: 'December', ar: 'ديسمبر' },
    }
    
    const monthInfo = monthNames[nextMonth] || { en: `Month ${nextMonth}`, ar: `شهر ${nextMonth}` }
    
    return {
      month: nextMonth,
      year: nextYear,
      monthName: monthInfo.en,
      monthNameArabic: monthInfo.ar,
      totalCases: 0,
      totalAmount: 0,
      totalAmountFormatted: '0',
      contributors: 0,
      topCategory: {
        name: 'Coming Soon',
        nameArabic: 'قريباً',
        amount: 0,
        cases: 0,
      },
    }
  }

  const nextMonthPlaceholder = getNextMonthPlaceholder()

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
    <section className="bg-gradient-to-b from-gray-50 to-white py-16 overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
        {/* Header with Month Picker */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4 relative">
          {/* Centered Header */}
          <div className="flex-1 flex flex-col items-center text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {t('title')}
            </h2>
            <p className="text-lg text-gray-600">
              {t('subtitle')}
            </p>
          </div>
          
          {/* Month/Year Picker - Positioned at end */}
          <div className="flex items-center justify-center md:justify-end gap-2 flex-shrink-0 md:absolute md:right-0">
            <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <Select value={selectedMonthYear} onValueChange={setSelectedMonthYear}>
              <SelectTrigger className="w-[200px] md:w-[240px] bg-white border-gray-300 hover:border-[#6B8E7E] transition-colors">
                <SelectValue placeholder={isRTL ? 'اختر الشهر والسنة' : 'Select Month & Year'} />
              </SelectTrigger>
              <SelectContent>
                {monthYearOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {isRTL ? option.labelAr : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Carousel Container */}
        <div className="relative w-full overflow-hidden">
          {/* Left Arrow - Hidden on mobile */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="hidden md:block absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 md:p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-[#6B8E7E] hover:text-white group"
              aria-label={isRTL ? 'الشهر السابق' : 'Previous month'}
            >
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5 text-gray-700 group-hover:text-white transition-colors" />
            </button>
          )}

          {/* Right Arrow - Hidden on mobile */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="hidden md:block absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 md:p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-[#6B8E7E] hover:text-white group"
              aria-label={isRTL ? 'الشهر التالي' : 'Next month'}
            >
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-gray-700 group-hover:text-white transition-colors" />
            </button>
          )}

          {/* Scrollable Container */}
          <div 
            ref={scrollContainerRef}
            className="monthly-carousel flex gap-4 md:gap-6 overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              paddingLeft: 'clamp(16px, 4vw, 440px)', // Responsive padding: 16px on mobile, scales up to 440px
              paddingRight: 'clamp(16px, 4vw, 96px)', // Responsive padding: 16px on mobile, scales up to 96px
              overscrollBehaviorX: 'none',
              overscrollBehaviorY: 'auto', // Allow vertical page scrolling
            }}
          >
            {/* Extra spacer at the start to prevent overlap with left arrow - responsive */}
            <div className="flex-shrink-0 w-8 md:w-32" aria-hidden={true} style={{ pointerEvents: 'none' }} />
            {/* Additional spacer to offset first card by one card width - responsive */}
            <div className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[344px]" aria-hidden={true} style={{ pointerEvents: 'none' }} />
            {monthlyData.map((month) => (
              <div
                key={`${month.year}-${month.month}`}
                className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[360px] bg-white rounded-xl p-4 md:p-6 shadow-md hover:shadow-xl transition-all duration-300 snap-start border border-gray-100 hover:border-[#6B8E7E]/20 group"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-5 pb-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-[#6B8E7E] transition-colors" dir={isRTL ? 'rtl' : 'ltr'}>
                      {isRTL ? month.monthNameArabic : month.monthName} {month.year}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <TrendingUp className="h-4 w-4" />
                      <span>{month.totalCases} {t('cases')}</span>
                    </div>
                  </div>
                </div>
                
                {/* Card Content */}
                <div className="space-y-3 md:space-y-4">
                  {/* Total Amount */}
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-[#E74C3C] flex-shrink-0" />
                      <span className="text-xs md:text-sm font-medium text-gray-700">{t('totalAmount')}</span>
                    </div>
                    <span className="text-lg md:text-xl font-bold text-[#E74C3C] block">
                      {formatNumber(month.totalAmount)} EGP
                    </span>
                  </div>
                  
                  {/* Contributors */}
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
                      <span className="text-xs md:text-sm font-medium text-gray-700">{t('contributors')}</span>
                    </div>
                    <span className="text-lg md:text-xl font-semibold text-gray-900 block">
                      {month.contributors}
                    </span>
                  </div>
                  
                  {/* Top Category */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('topCategory')}</p>
                    <div className="p-3 bg-[#6B8E7E]/5 rounded-lg border border-[#6B8E7E]/10">
                      <p className="font-semibold text-[#6B8E7E] mb-1" dir={isRTL ? 'rtl' : 'ltr'}>
                        {isRTL && month.topCategory.nameArabic 
                          ? month.topCategory.nameArabic 
                          : month.topCategory.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatNumber(month.topCategory.amount)} EGP • {month.topCategory.cases} {t('cases')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Next Month Placeholder - Dimmed */}
            {nextMonthPlaceholder && (
              <div
                key={`placeholder-${nextMonthPlaceholder.year}-${nextMonthPlaceholder.month}`}
                className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[360px] bg-white rounded-xl p-4 md:p-6 shadow-sm transition-all duration-300 snap-start border border-gray-200 opacity-50 grayscale"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-5 pb-4 border-b border-gray-200">
                  <div>
                    <h3 className="text-xl font-bold text-gray-400 mb-1" dir={isRTL ? 'rtl' : 'ltr'}>
                      {isRTL ? nextMonthPlaceholder.monthNameArabic : nextMonthPlaceholder.monthName} {nextMonthPlaceholder.year}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>{isRTL ? 'قريباً' : 'Coming Soon'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Card Content */}
                <div className="space-y-3 md:space-y-4">
                  {/* Total Amount */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-gray-400 flex-shrink-0" />
                      <span className="text-xs md:text-sm font-medium text-gray-400">{t('totalAmount')}</span>
                    </div>
                    <span className="text-lg md:text-xl font-bold text-gray-400 block">
                      --
                    </span>
                  </div>
                  
                  {/* Contributors */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 md:h-5 md:w-5 text-gray-400 flex-shrink-0" />
                      <span className="text-xs md:text-sm font-medium text-gray-400">{t('contributors')}</span>
                    </div>
                    <span className="text-lg md:text-xl font-semibold text-gray-400 block">
                      --
                    </span>
                  </div>
                  
                  {/* Top Category */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('topCategory')}</p>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-400 mb-1" dir={isRTL ? 'rtl' : 'ltr'}>
                        {isRTL ? nextMonthPlaceholder.topCategory.nameArabic : nextMonthPlaceholder.topCategory.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        -- EGP • -- {t('cases')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Extra spacer at the end to prevent overlap with right arrow - responsive */}
            <div className="flex-shrink-0 w-8 md:w-32" aria-hidden={true} style={{ pointerEvents: 'none' }} />
          </div>

          {/* Scroll Indicators (Dots) */}
          <div className="flex justify-center gap-2 mt-8">
            {monthlyData.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (scrollContainerRef.current) {
                    // Use responsive values
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
                    const cardWidth = isMobile ? CARD_WIDTH_MOBILE : window.innerWidth < 1024 ? CARD_WIDTH_TABLET : CARD_WIDTH_DESKTOP
                    const totalOffset = isMobile ? TOTAL_START_OFFSET_MOBILE : TOTAL_START_OFFSET_DESKTOP
                    
                    // Scroll to card position accounting for total start offset
                    scrollContainerRef.current.scrollTo({
                      left: totalOffset + (index * cardWidth),
                      behavior: 'smooth'
                    })
                    setCurrentIndex(index)
                  }
                }}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-10 bg-[#6B8E7E] shadow-md'
                    : 'w-2.5 bg-gray-300 hover:bg-gray-400 hover:w-3'
                }`}
                aria-label={`Go to month ${index + 1}`}
              />
            ))}
          </div>

          {/* Hide scrollbar for webkit browsers using CSS */}
          <style jsx global>{`
            .monthly-carousel::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </div>
      </div>
    </section>
  )
}

