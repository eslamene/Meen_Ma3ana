'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { locales } from '@/i18n'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  
  // Alternative way to get current locale from pathname
  const currentLocaleFromPath = pathname.split('/')[1] || 'en'
  
  // Debug: log both locale sources
  console.log('useLocale():', locale)
  console.log('From pathname:', currentLocaleFromPath)
  console.log('Pathname:', pathname)

  const switchLanguage = (newLocale: string) => {
    // Remove any locale from the pathname (both current and any other locale)
    let pathWithoutLocale = pathname
    locales.forEach(loc => {
      pathWithoutLocale = pathWithoutLocale.replace(new RegExp(`^/${loc}(/|$)`), '/')
    })
    
    // Clean up any double slashes and ensure we don't have trailing slash unless it's root
    pathWithoutLocale = pathWithoutLocale.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
    
    // Navigate to the new locale
    const newPath = pathWithoutLocale === '/' ? `/${newLocale}` : `/${newLocale}${pathWithoutLocale}`
    router.push(newPath)
  }

  return (
    <div className="relative group">
      {/* Language Toggle Button */}
      <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
        {locales.map((loc) => {
          // Use pathname-based locale as the primary source since useLocale might not update immediately
          const currentLoc = currentLocaleFromPath || locale || 'en'
          const isActive = currentLoc === loc
          console.log(`Locale ${loc}: active=${isActive}, useLocale=${locale}, fromPath=${currentLocaleFromPath}, final=${currentLoc}`)
          
          return (
            <button
              key={loc}
              onClick={() => switchLanguage(loc)}
              className={`relative px-3 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 first:rounded-l-lg last:rounded-r-lg ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm transform scale-105 z-10'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={`Switch to ${loc === 'en' ? 'English' : 'Arabic'}`}
            >
              {/* Flag Icon */}
              <span className="text-base leading-none">
                {loc === 'en' ? '🇺🇸' : '🇪🇬'}
              </span>
              
              {/* Language Label - Hidden on small screens */}
              <span className="hidden sm:inline font-semibold">
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