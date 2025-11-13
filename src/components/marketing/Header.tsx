'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Heart, Mail } from 'lucide-react'

export default function MarketingHeader() {
  const params = useParams()
  const locale = params.locale as string
  const isArabic = locale === 'ar'

  const navLinks = [
    { href: '#features', label: isArabic ? 'المميزات' : 'Features', key: 'features' },
    { href: `/${locale}/cases`, label: isArabic ? 'الحالات' : 'Cases', key: 'cases', icon: Heart },
    { href: '#contact', label: isArabic ? 'اتصل بنا' : 'Contact', key: 'contact', icon: Mail },
  ]

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Logo size="lg" href={`/${locale}/landing`} />
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#6B8E7E] transition-colors duration-200"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Language Switcher */}
          <div className="flex items-center">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  )
}

