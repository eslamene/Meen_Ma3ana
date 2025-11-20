'use client'

import { useTranslations } from 'next-intl'
import NavigationBar from '@/components/navigation/NavigationBar'
import Hero from '@/components/marketing/Hero'
import Stats from '@/components/marketing/Stats'
import Features from '@/components/marketing/Features'
import Stories from '@/components/marketing/Stories'
import MonthlyBreakdown from '@/components/marketing/MonthlyBreakdown'
import Values from '@/components/marketing/Values'
import Inspiration from '@/components/marketing/Inspiration'
import ContactForm from '@/components/marketing/ContactForm'
import WhatsAppChat from '@/components/marketing/WhatsAppChat'
import Footer from '@/components/marketing/Footer'

export default function LandingPage() {
  const t = useTranslations('landing.footer')
  // Use current year - this is client-rendered so it's consistent
  const currentYear = new Date().getFullYear()
  
  return (
    <div className="min-h-screen bg-white scroll-smooth">
      <NavigationBar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Stories />
        <MonthlyBreakdown />
        <Values />
        <Inspiration />
        <ContactForm />
      </main>
      <Footer currentYear={currentYear} />
      <WhatsAppChat />
    </div>
  )
}

