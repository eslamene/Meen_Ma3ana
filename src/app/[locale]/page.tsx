'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, ArrowRight, Sparkles } from 'lucide-react'

export default function HomePage() {
  const t = useTranslations('home')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const { user, loading } = useAuth()
  const [redirecting, setRedirecting] = useState(false)

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      setRedirecting(true)
      // Small delay for smooth transition
      setTimeout(() => {
        router.push(`/${locale}/dashboard`)
      }, 1500)
    }
  }, [user, loading, router, locale])

  // Show loading state while checking auth
  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <Heart className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 fill-blue-600" />
          </div>
          <p className="mt-6 text-lg text-gray-600 font-medium">
            {redirecting ? 'Welcome back! Redirecting to dashboard...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Welcome page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated Logo/Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
              <Heart className="w-12 h-12 text-white fill-white" />
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4 leading-tight">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Meen Ma3ana
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-700 mb-6 font-medium">
          Empowering Communities Through Compassionate Giving
        </p>
        
        <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto leading-relaxed">
          Join us in making a real difference. Connect with your community, support those in need, 
          and track the impact of your contributions.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href={`/${locale}/auth/login`} className="inline-block">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 w-full sm:w-auto"
            >
              Sign In
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href={`/${locale}/auth/register`} className="inline-block">
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6 border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 w-full sm:w-auto"
            >
              Get Started
            </Button>
          </Link>
        </div>

        {/* Quick Features */}
        <div className="grid md:grid-cols-3 gap-4 mt-12">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Make an Impact</h3>
              <p className="text-sm text-gray-600">
                Support causes that matter to you
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-6 h-6 text-blue-600 fill-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Track Progress</h3>
              <p className="text-sm text-gray-600">
                See how your contributions help
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ArrowRight className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Join Community</h3>
              <p className="text-sm text-gray-600">
                Connect with like-minded people
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
