'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import NavigationBar from '@/components/navigation/NavigationBar'
import SimpleSidebar from '@/components/navigation/SimpleSidebar'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false) // Start closed on mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)

  const [supabase] = useState(() => createClient())
  
  // Check if we're on the reset password page
  const isResetPasswordPage = pathname?.includes('/auth/reset-password') || false
  
  // Check for recovery mode
  useEffect(() => {
    const checkRecoveryMode = () => {
      if (typeof window !== 'undefined') {
        const recoveryMode = document.cookie
          .split('; ')
          .find(row => row.startsWith('recovery_mode='))
          ?.split('=')[1] === 'true'
        setIsRecoveryMode(recoveryMode || false)
      }
    }
    
    checkRecoveryMode()
    
    // Check periodically in case cookie changes
    const interval = setInterval(checkRecoveryMode, 1000)
    return () => clearInterval(interval)
  }, [])
  
  // Load sidebar state from localStorage and set initial mobile state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-collapsed')
      if (stored === 'true') {
        setSidebarCollapsed(true)
      }
      
      // Check if desktop
      const checkDesktop = () => {
        const desktop = window.innerWidth >= 1024
        setIsDesktop(desktop)
        if (desktop) {
          setSidebarOpen(true)
        }
      }
      
      checkDesktop()
      
      // Handle window resize
      const handleResize = () => {
        checkDesktop()
      }
      
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])
  
  // Save sidebar collapsed state
  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', String(newState))
    }
  }

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

  // Show top navigation for guests, users in recovery mode, or on reset password page without recovery mode
  // If on reset password page, require recovery mode cookie to show authenticated UI
  const shouldShowPublicNav = !user || isRecoveryMode || (isResetPasswordPage && !isRecoveryMode)
  
  if (shouldShowPublicNav) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationBar />
        <main>
          {children}
        </main>
      </div>
    )
  }

  // Show sidebar navigation for authenticated users (not in recovery mode)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      {!sidebarOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 bg-white shadow-md"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}
      
      {/* Sidebar - Always fixed, never scrolls with page */}
      <SimpleSidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        collapsed={sidebarCollapsed}
        onCollapseToggle={toggleSidebarCollapse}
      />
      
      {/* Main Content - Accounts for fixed sidebar width on desktop, full width on mobile */}
      <div 
        className="min-h-screen transition-all duration-300"
        style={{
          marginLeft: sidebarOpen && isDesktop 
            ? (sidebarCollapsed ? '80px' : '256px') 
            : '0',
        }}
      >
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
