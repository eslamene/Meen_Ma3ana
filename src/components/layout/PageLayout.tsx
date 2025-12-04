'use client'

import { ReactNode, useContext } from 'react'
import { usePathname } from 'next/navigation'
import ConditionalLayout from '@/components/layout/ConditionalLayout'
import Breadcrumbs from '@/components/navigation/Breadcrumbs'
import Container, { ContainerVariant } from '@/components/layout/Container'
import { LayoutContext } from '@/components/layout/LayoutProvider'
import { usePageViewTracking } from '@/hooks/useActivityTracking'

interface PageLayoutProps {
  children: ReactNode
  showBreadcrumbs?: boolean
  className?: string
  /**
   * Container variant for this page (overrides global preference)
   */
  containerVariant?: ContainerVariant
  /**
   * Whether to use global layout preference
   * @default true
   */
  useGlobalLayout?: boolean
}

export default function PageLayout({ 
  children, 
  showBreadcrumbs = true, 
  className = "",
  containerVariant,
  useGlobalLayout = true,
}: PageLayoutProps) {
  const pathname = usePathname()
  const layoutContext = useContext(LayoutContext)
  
  // Track page views for activity logging
  usePageViewTracking()
  
  // Use page-specific variant if provided, otherwise use global or default to boxed
  const variant = containerVariant || (useGlobalLayout && layoutContext 
    ? layoutContext.containerVariant 
    : 'boxed')
  
  // Don't show breadcrumbs on home page, auth pages, or if explicitly disabled
  const shouldShowBreadcrumbs = showBreadcrumbs && 
    !pathname?.endsWith('/en') && 
    !pathname?.endsWith('/ar') &&
    !pathname?.includes('/auth/')

  return (
    <ConditionalLayout>
      <div className={className}>
        {shouldShowBreadcrumbs && (
          <div className="hidden sm:block bg-white border-b border-gray-200">
            <Container variant={variant} className="py-4">
              <Breadcrumbs />
            </Container>
          </div>
        )}
        
        {/* Allow children to control their own container if needed */}
        {/* If children need full-width backgrounds, they should wrap content in Container themselves */}
        <div>
          {children}
        </div>
      </div>
    </ConditionalLayout>
  )
} 