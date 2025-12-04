'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { locales } from '@/i18n/request'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

interface LanguageSwitcherProps {
  /**
   * Compact mode - shows only icon, toggles between languages on click
   */
  compact?: boolean
}

export default function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  
  // Alternative way to get current locale from pathname
  const currentLocaleFromPath = pathname.split('/')[1] || 'en'

  const switchLanguage = (newLocale: string) => {
    // Remove any locale from the pathname (both current and any other locale)
    let pathWithoutLocale = pathname
    locales.forEach(loc => {
      pathWithoutLocale = pathWithoutLocale.replace(new RegExp(`^/${loc}(/|$)`), '/')
    })
    
    // Clean up any double slashes and ensure we don't have trailing slash unless it's root
    pathWithoutLocale = pathWithoutLocale.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
    
    // Build the new path with the new locale
    const newPath = pathWithoutLocale === '/' ? `/${newLocale}/landing` : `/${newLocale}${pathWithoutLocale}`
    
    // Force a full page reload to ensure Next.js re-renders server components
    // with the new locale. This is necessary for route groups with nested layouts
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = newPath
  }

  // Compact mode - single icon that toggles
  if (compact) {
    const currentLoc = currentLocaleFromPath || locale || 'en'
    const nextLocale = currentLoc === 'en' ? 'ar' : 'en'
    
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => switchLanguage(nextLocale)}
        className="p-2 hover:bg-[#6B8E7E]/10 hover:text-[#6B8E7E] transition-all duration-200 rounded-lg"
        title={`Switch to ${nextLocale === 'en' ? 'English' : 'Arabic'}`}
        aria-label={`Switch to ${nextLocale === 'en' ? 'English' : 'Arabic'}`}
      >
        <Globe className="h-5 w-5" />
      </Button>
    )
  }

  // Full mode - shows both languages
  return (
    <div className="relative group flex items-center">
      {/* Language Toggle Button */}
      <div className="flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
        {locales.map((loc) => {
          // Use pathname-based locale as the primary source since useLocale might not update immediately
          const currentLoc = currentLocaleFromPath || locale || 'en'
          const isActive = currentLoc === loc
          
          return (
            <button
              key={loc}
              onClick={() => switchLanguage(loc)}
              className={`relative flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm font-medium transition-all duration-200 min-w-[2.5rem] sm:min-w-0 first:rounded-l-lg last:rounded-r-lg ${
                isActive
                  ? 'bg-[#E74C3C] text-white shadow-sm transform scale-105 z-10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={`Switch to ${loc === 'en' ? 'English' : 'Arabic'}`}
            >
              {/* Flag Icon */}
              <span className="text-base sm:text-lg leading-none flex-shrink-0">
                {loc === 'en' ? '🇬🇧' : '🇪🇬'}
              </span>
              
              {/* Language Label - Hidden on small screens */}
              <span className="hidden sm:inline font-semibold whitespace-nowrap">
                {loc === 'en' ? 'EN' : 'AR'}
              </span>
            </button>
          )
        })}
      </div>
      
      {/* Tooltip - Shows on hover */}
      <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className="bg-gray-900 text-white text-xs px-3 py-1 rounded-md whitespace-nowrap shadow-lg">
          Switch Language
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      </div>
    </div>
  )
} 