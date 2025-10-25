'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import NavigationBar from '@/components/navigation/NavigationBar'
import SidebarNavigationNew from '@/components/navigation/SidebarNavigationNew'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show top navigation for guests
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationBar />
        <main>
          {children}
        </main>
      </div>
    )
  }

  // Show sidebar navigation for authenticated users
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* New Sidebar - handles its own mobile menu */}
      <SidebarNavigationNew />
      
      {/* Main Content */}
      <div className="flex-1">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
