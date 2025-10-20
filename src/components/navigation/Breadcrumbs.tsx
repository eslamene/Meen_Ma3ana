'use client'

import { useTranslations } from 'next-intl'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

export default function Breadcrumbs() {
  const t = useTranslations('navigation')
  const params = useParams()
  const pathname = usePathname()
  const locale = params.locale as string

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []
    
    // Always start with home
    breadcrumbs.push({
      label: t('home'),
      href: `/${locale}`
    })

    let currentPath = `/${locale}`
    
    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      currentPath += `/${segment}`
      
      // Skip locale segment
      if (segment === locale) continue
      
      // Map segments to readable labels
      let label = segment
      switch (segment) {
        case 'cases':
          label = t('cases')
          break
        case 'dashboard':
          label = t('dashboard')
          break
        case 'profile':
          label = t('profile')
          break
        case 'auth':
          label = t('login')
          break
        case 'admin':
          label = t('admin')
          break
        case 'contributions':
          label = t('contributions')
          break
        case 'notifications':
          label = t('notifications')
          break
        case 'create':
          label = t('createCase')
          break
        case 'details':
          label = t('details')
          break
        case 'donate':
          label = t('donate')
          break
        case 'edit':
          label = t('edit')
          break
        case 'login':
          label = t('login')
          break
        case 'register':
          label = t('register')
          break
        case 'forgot-password':
          label = t('forgotPassword')
          break
        case 'callback':
          label = t('callback')
          break
        default:
          // For dynamic segments like case IDs, show a generic label
          if (segment.length > 20) {
            label = t('item')
          }
          break
      }
      
      const isLast = i === pathSegments.length - 1
      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
        current: isLast
      })
    }
    
    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  // Don't show breadcrumbs on home page
  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <svg className="w-4 h-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {breadcrumb.current ? (
              <span className="text-sm font-medium text-gray-500" aria-current="page">
                {breadcrumb.label}
              </span>
            ) : breadcrumb.href ? (
              <Link
                href={breadcrumb.href}
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                {breadcrumb.label}
              </Link>
            ) : (
              <span className="text-sm font-medium text-gray-500">
                {breadcrumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
} 