'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import ConditionalLayout from '@/components/layout/ConditionalLayout'
import Breadcrumbs from '@/components/navigation/Breadcrumbs'

interface PageLayoutProps {
  children: ReactNode
  showBreadcrumbs?: boolean
  className?: string
}

export default function PageLayout({ 
  children, 
  showBreadcrumbs = true, 
  className = "" 
}: PageLayoutProps) {
  const pathname = usePathname()
  
  // Don't show breadcrumbs on home page or if explicitly disabled
  const shouldShowBreadcrumbs = showBreadcrumbs && !pathname?.endsWith('/en') && !pathname?.endsWith('/ar')

  return (
    <ConditionalLayout>
      <div className={`${className}`}>
        {shouldShowBreadcrumbs && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <Breadcrumbs />
            </div>
          </div>
        )}
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </div>
    </ConditionalLayout>
  )
} 