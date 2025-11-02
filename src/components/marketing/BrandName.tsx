'use client'

interface BrandNameProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

/**
 * Brand name component matching the logo colors:
 * - "Meen" in olive-green (#6B8E7E)
 * - "Ma3ana" in vibrant red (#E74C3C)
 */
export default function BrandName({ size = 'md', className = '' }: BrandNameProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }

  return (
    <span className={`font-bold tracking-tight ${sizeClasses[size]} ${className}`}>
      <span className="text-[#6B8E7E]">Meen</span>{' '}
      <span className="text-[#E74C3C]">Ma3ana</span>
    </span>
  )
}

