'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type ContainerVariant = 'full' | 'boxed'

interface ContainerProps {
  /**
   * Container variant
   * - 'full': Full viewport width, no max-width constraint
   * - 'boxed': Constrained to max-w-[1600px] with padding (wide layout)
   * @default 'boxed'
   */
  variant?: ContainerVariant
  
  /**
   * Children to render inside the container
   */
  children: ReactNode
  
  /**
   * Custom className for the container
   */
  className?: string
  
  /**
   * Whether to apply padding
   * @default true
   */
  padding?: boolean
  
  /**
   * Custom padding classes
   * @default 'px-4 sm:px-6 lg:px-8'
   */
  paddingClassName?: string
}

const variantClasses: Record<ContainerVariant, string> = {
  full: 'w-full',
  boxed: 'max-w-[1600px] mx-auto',
}

export default function Container({
  variant = 'boxed',
  children,
  className,
  padding = true,
  paddingClassName = 'px-4 sm:px-6 lg:px-8',
}: ContainerProps) {
  const baseClasses = variantClasses[variant]
  const paddingClasses = padding ? paddingClassName : ''
  
  return (
    <div className={cn(baseClasses, paddingClasses, className)}>
      {children}
    </div>
  )
}

