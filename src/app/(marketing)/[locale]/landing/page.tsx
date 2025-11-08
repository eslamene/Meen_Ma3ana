'use client'

import { useTranslations } from 'next-intl'
import MarketingHeader from '@/components/marketing/Header'
import Hero from '@/components/marketing/Hero'
import Stats from '@/components/marketing/Stats'
import Features from '@/components/marketing/Features'
import Stories from '@/components/marketing/Stories'
import MonthlyBreakdown from '@/components/marketing/MonthlyBreakdown'
import CategorySummary from '@/components/marketing/CategorySummary'
import Values from '@/components/marketing/Values'
import Inspiration from '@/components/marketing/Inspiration'
import CTA from '@/components/marketing/CTA'
import ContactForm from '@/components/marketing/ContactForm'
import WhatsAppChat from '@/components/marketing/WhatsAppChat'

export default function LandingPage() {
  const t = useTranslations('landing.footer')
  // Use current year - this is client-rendered so it's consistent
  const currentYear = new Date().getFullYear()
  
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Stories />
        <MonthlyBreakdown />
        <CategorySummary />
        <Values />
        <Inspiration />
        <CTA />
        <ContactForm />
      </main>
      <footer className="bg-[#6B8E7E] text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-white/90">
            © {currentYear} {t('copyright')}
          </p>
        </div>
      </footer>
      <WhatsAppChat />
    </div>
  )
}

