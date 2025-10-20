'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function HomePage() {
  const t = useTranslations('home')
  const params = useParams()
  const locale = params.locale as string

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
            {t('title')}
          </h1>
          <p className="text-2xl text-gray-700 mb-6 max-w-4xl mx-auto font-medium">
            {t('subtitle')}
          </p>
          <p className="text-lg text-gray-600 max-w-4xl mx-auto mb-10 leading-relaxed">
            {t('description')}
          </p>
          
          {/* Language Switcher */}
          <div className="flex justify-center mb-10">
            <LanguageSwitcher />
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href={`/${locale}/cases`}>
              <Button size="lg" className="text-lg px-10 py-4 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
                Browse Cases
              </Button>
            </Link>
            <Link href={`/${locale}/auth/register`}>
              <Button variant="outline" size="lg" className="text-lg px-10 py-4 border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl">🤝</span>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">Community Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 text-center leading-relaxed">
                Connect with your community and make a real difference in people's lives through our platform.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl">🔒</span>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">Secure Donations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 text-center leading-relaxed">
                Your donations are processed securely with full transparency and tracking.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl">📊</span>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">Impact Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 text-center leading-relaxed">
                See the real impact of your contributions with detailed progress tracking.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
