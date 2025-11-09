'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import ClientSidebarNavigation from '@/components/navigation/ClientSidebarNavigation'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

interface ClientLayoutProps {
  children: React.ReactNode
  locale: string
  modules: Array<{
    id: string
    name: string
    display_name: string
    description?: string
    icon: string
    color: string
    sort_order: number
    items: Array<{
      label: string
      href: string
      icon: string
      description?: string
      sortOrder: number
      permission?: string
    }>
  }>
  user: User | null
}

export default function ClientLayout({ 
  children, 
  locale, 
  modules, 
  user 
}: ClientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSidebar}
          className="bg-white shadow-md"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar */}
      <ClientSidebarNavigation
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        locale={locale}
        modules={modules}
        user={user}
      />

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  )
}
