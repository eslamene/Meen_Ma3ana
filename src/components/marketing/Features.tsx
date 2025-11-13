'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Lock, 
  BarChart3, 
  Eye, 
  Sparkles, 
  Shield 
} from 'lucide-react'

export default function Features() {
  const t = useTranslations('landing.features')

  const features = [
    {
      key: 'communitySupport',
      Icon: Users,
    },
    {
      key: 'secureDonations',
      Icon: Lock,
    },
    {
      key: 'impactTracking',
      Icon: BarChart3,
    },
    {
      key: 'transparency',
      Icon: Eye,
    },
    {
      key: 'easyProcess',
      Icon: Sparkles,
    },
    {
      key: 'trustedPlatform',
      Icon: Shield,
    },
  ]

  return (
    <section id="features" className="bg-gradient-to-br from-gray-50 to-[#6B8E7E]/5 py-20 relative">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#6B8E7E]/20 to-transparent" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => {
            const IconComponent = feature.Icon
            return (
              <Card
                key={feature.key}
                className="bg-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 group overflow-hidden"
              >
                <CardHeader className="text-center pb-4 relative">
                  {/* Hover gradient effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#6B8E7E]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="w-16 h-16 bg-[#6B8E7E]/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#6B8E7E]/20 group-hover:scale-110 transition-all duration-300">
                    <IconComponent className="w-8 h-8 text-[#6B8E7E] group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-[#6B8E7E] transition-colors duration-300 relative z-10">
                    {t(`${feature.key}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className="text-gray-700 text-center leading-relaxed">
                    {t(`${feature.key}.description`)}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

