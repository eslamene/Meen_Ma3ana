'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useContext } from 'react'
import { AuthContext } from '@/components/auth/AuthProvider'
import { publicAssets } from '@/config/public-assets'
import { cn } from '@/lib/utils'

interface LogoProps {
  /**
   * Size variant for the logo.
   * `icon` = square mark for narrow rails (collapsed sidebar); uses brand icon asset and fills the slot.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'icon'
  
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

  /**
   * Whether to mark the logo as high-priority (preload).
   * Keep false unless this logo is the actual LCP/hero image.
   * @default false
   */
  priority?: boolean
}

const sizeConfig = {
  sm: {
    src: publicAssets.brand.logo,
    image: { width: 80, height: 27, className: 'h-6 w-auto max-w-[min(100%,12rem)]' },
    text: 'text-base',
    frameClass: '',
  },
  md: {
    src: publicAssets.brand.logo,
    image: { width: 100, height: 33, className: 'h-8 w-auto max-w-[min(100%,14rem)]' },
    text: 'text-lg',
    frameClass: '',
  },
  lg: {
    src: publicAssets.brand.logo,
    image: { width: 120, height: 40, className: 'h-10 w-auto max-w-[min(100%,16rem)]' },
    text: 'text-2xl',
    frameClass: '',
  },
  /**
   * Collapsed sidebar rail (~32px inner width): fixed square frame + object-contain so
   * flex/layout does not crush the image to a few pixels (see h-only + w-auto issues).
   * Uses the full logo by default; swap `src` to `publicAssets.brand.icon` if you add a square mark.
   */
  icon: {
    src: publicAssets.brand.logo,
    image: { width: 128, height: 128, className: 'h-full w-full object-contain' },
    text: 'text-base',
    frameClass: 'flex size-10 shrink-0 items-center justify-center',
  },
} as const

export default function Logo({
  size = 'md',
  showText = true,
  link = true,
  href,
  className = '',
  imageClassName = '',
  textClassName = '',
  priority = false,
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
  
  const imageEl = config.frameClass ? (
    <span className={config.frameClass}>
      <Image
        src={config.src}
        alt="Meen Ma3ana"
        width={config.image.width}
        height={config.image.height}
        className={cn(config.image.className, imageClassName)}
        sizes={size === 'icon' ? '40px' : undefined}
        priority={priority}
      />
    </span>
  ) : (
    <Image
      src={config.src}
      alt="Meen Ma3ana"
      width={config.image.width}
      height={config.image.height}
      className={cn('object-contain', config.image.className, imageClassName)}
      priority={priority}
    />
  )

  const logoContent = (
    <div
      className={cn(
        'flex items-center gap-2',
        size === 'icon' && 'min-w-0 max-w-full justify-center',
        className
      )}
    >
      {imageEl}
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
        className={cn(
          'hover:opacity-80 transition-opacity',
          size === 'icon' && 'flex w-full max-w-full shrink-0 justify-center'
        )}
      >
        {logoContent}
      </Link>
    )
  }
  
  return logoContent
}

