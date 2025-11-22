'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AuthForm from '@/components/auth/AuthForm'
import SocialSignIn from '@/components/auth/SocialSignIn'
import { ArrowRight, CheckCircle2, Shield } from 'lucide-react'
import SystemContentModal from '@/components/marketing/SystemContentModal'

export default function RegisterPage() {
  const t = useTranslations('auth')
  const params = useParams()
  const locale = params.locale as string
  const [termsModalOpen, setTermsModalOpen] = useState(false)
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false)

  const benefits = [
    t('benefit1'),
    t('benefit2'),
    t('benefit3'),
    t('benefit4')
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-100 to-red-100 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-[#6B8E7E]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-[#E74C3C]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[#6B8E7E]/5 to-[#E74C3C]/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
          {/* Left side - Benefits (Desktop only) */}
          <div className="hidden lg:block space-y-6 lg:space-y-8">
            <div className="space-y-4 lg:space-y-6">
              <div className="inline-flex items-center space-x-2 bg-white/60 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border border-white/30">
                <Shield className="h-5 w-5 text-[#6B8E7E]" />
                <span className="text-sm font-semibold text-gray-800">{t('joinOurCommunity')}</span>
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
                {t('createYourAccount')}
              </h1>
              <p className="text-lg lg:text-xl text-gray-700 leading-relaxed">
                {t('createAccountDescription')}
              </p>
            </div>
            
            <div className="space-y-3 lg:space-y-4 pt-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start space-x-3 group">
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-1.5 border border-white/30 shadow-sm group-hover:bg-white/80 transition-all">
                    <CheckCircle2 className="h-5 w-5 text-[#6B8E7E] flex-shrink-0 mr-0" />
                  </div>
                  <p className="text-base lg:text-lg text-gray-800 pt-0.5">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Registration Form */}
          <div className="w-full">
            {/* Glass effect card */}
            <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-6 sm:p-8 lg:p-10 xl:p-12 relative overflow-hidden">
              {/* Glass effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10">
                {/* Mobile Header */}
                <div className="lg:hidden text-center mb-6 sm:mb-8">
                  <div className="inline-flex items-center justify-center space-x-2 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full mb-4 shadow-lg border border-white/30">
                    <Shield className="h-4 w-4 text-[#6B8E7E]" />
                    <span className="text-xs sm:text-sm font-semibold text-gray-800">{t('joinOurCommunity')}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {t('createAccount')}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-700">
                    {t('createAccountSubtitle')}
                  </p>
                </div>

                {/* Desktop Header */}
                <div className="hidden lg:block text-center mb-8 xl:mb-10">
                  <h2 className="text-3xl xl:text-4xl font-bold text-gray-900 mb-3">
            {t('createAccount')}
          </h2>
                  <p className="text-base xl:text-lg text-gray-700">
                    {t('createAccountSubtitle')}
                  </p>
                </div>
                
                <div className="space-y-5 sm:space-y-6">
                  <AuthForm mode="register" />

                  {/* Social Sign-In - Only show if enabled */}
                  {process.env.NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN === 'true' && (
                    <>
                      <div className="relative pt-4 sm:pt-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300/50"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-4 bg-white/40 backdrop-blur-sm text-gray-600 rounded-full">{t('or')}</span>
                        </div>
                      </div>

                      {/* Social Sign-In */}
                      <SocialSignIn mode="register" />

                      <div className="relative pt-4 sm:pt-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300/50"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-4 bg-white/40 backdrop-blur-sm text-gray-600 rounded-full">{t('or')}</span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="text-center">
                    <p className="text-sm sm:text-base text-gray-700">
                      {t('alreadyHaveAccount')}{' '}
                      <Link 
                        href={`/${locale}/auth/login`} 
                        className="font-semibold text-[#E74C3C] hover:text-[#C0392B] transition-colors inline-flex items-center group"
                      >
              {t('signInToExistingAccount')}
                        <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </p>
                  </div>
        </div>
        
                {/* Terms Notice */}
                <div className="mt-6 sm:mt-8 lg:mt-10 pt-6 border-t border-gray-300/50">
                  <p className="text-xs sm:text-sm text-gray-600 text-center">
                    {t('termsNotice')}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Terms button clicked, setting termsModalOpen to true')
                        setTermsModalOpen(true)
                      }}
                      className="font-semibold text-[#6B8E7E] hover:text-[#5a7a6b] underline transition-colors cursor-pointer"
                    >
                      {t('termsOfService')}
                    </button>
                    {' '}{t('and')}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Privacy button clicked, setting privacyModalOpen to true')
                        setPrivacyModalOpen(true)
                      }}
                      className="font-semibold text-[#6B8E7E] hover:text-[#5a7a6b] underline transition-colors cursor-pointer"
                    >
                      {t('privacyPolicy')}
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug indicator */}
      {(termsModalOpen || privacyModalOpen) && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-2 z-[9999] rounded">
          Modal state: Terms={termsModalOpen ? 'open' : 'closed'}, Privacy={privacyModalOpen ? 'open' : 'closed'}
        </div>
      )}

      {/* Terms of Service Modal */}
      <SystemContentModal
        contentKey="terms_of_service"
        open={termsModalOpen}
        onOpenChange={setTermsModalOpen}
      />

      {/* Privacy Policy Modal */}
      <SystemContentModal
        contentKey="privacy_policy"
        open={privacyModalOpen}
        onOpenChange={setPrivacyModalOpen}
      />
    </div>
  )
} 
