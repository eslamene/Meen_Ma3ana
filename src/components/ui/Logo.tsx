'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useContext } from 'react'
import { AuthContext } from '@/components/auth/AuthProvider'

interface LogoProps {
  /**
   * Size variant for the logo
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  
  /**
   * Whether to show the brand name text next to the logo
   * @default true
   */
  showText?: boolean
  
  /**
   * Whether the logo should be a clickable link
   * @default true
   */
  link?: boolean
  
  /**
   * Custom href for the logo link (overrides default behavior)
   */
  href?: string
  
  /**
   * Custom className for the container
   */
  className?: string
  
  /**
   * Custom className for the image
   */
  imageClassName?: string
  
  /**
   * Custom className for the text
   */
  textClassName?: string
}

const sizeConfig = {
  sm: {
    image: { width: 80, height: 27, className: 'h-6 w-auto' },
    text: 'text-base'
  },
  md: {
    image: { width: 100, height: 33, className: 'h-8 w-auto' },
    text: 'text-lg'
  },
  lg: {
    image: { width: 120, height: 40, className: 'h-10 w-auto' },
    text: 'text-2xl'
  }
}

export default function Logo({
  size = 'md',
  showText = true,
  link = true,
  href,
  className = '',
  imageClassName = '',
  textClassName = ''
}: LogoProps) {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  
  // Safely access auth context - may not be available in all contexts
  // useContext returns undefined if context is not available (e.g., outside AuthProvider)
  const authContext = useContext(AuthContext)
  const user = authContext?.user || null
  
  // Determine the default href
  const defaultHref = href || (user ? `/${locale}/dashboard` : `/${locale}/landing`)
  
  const config = sizeConfig[size]
  const isArabic = locale === 'ar'
  
  const logoContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.png"
        alt="Meen Ma3ana"
        width={config.image.width}
        height={config.image.height}
        className={`object-contain ${config.image.className} ${imageClassName}`}
        style={{ width: 'auto' }}
        priority
      />
      {showText && (
        isArabic ? (
          <span className={`font-bold tracking-tight ${config.text} ${textClassName}`}>
            <span className="text-[#6B8E7E]">مين</span>{' '}
            <span className="text-[#E74C3C]">معانا</span>
          </span>
        ) : (
          <span className={`font-bold tracking-tight ${config.text} ${textClassName}`}>
            <span className="text-[#6B8E7E]">Meen</span>{' '}
            <span className="text-[#E74C3C]">Ma3ana</span>
          </span>
        )
      )}
    </div>
  )
  
  if (link) {
    return (
      <Link 
        href={defaultHref} 
        className="hover:opacity-80 transition-opacity"
      >
        {logoContent}
      </Link>
    )
  }
  
  return logoContent
}

