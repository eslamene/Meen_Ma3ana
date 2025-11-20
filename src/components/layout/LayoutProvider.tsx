'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ContainerVariant } from './Container'

interface LayoutContextType {
  containerVariant: ContainerVariant
  setContainerVariant: (variant: ContainerVariant) => void
}

export const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

interface LayoutProviderProps {
  children: ReactNode
  /**
   * Default container variant
   * @default 'boxed'
   */
  defaultVariant?: ContainerVariant
  /**
   * Whether to persist layout preference in localStorage
   * @default false
   */
  persist?: boolean
  /**
   * localStorage key for persisting preference
   * @default 'meen-ma3ana-layout-variant'
   */
  storageKey?: string
}

export function LayoutProvider({
  children,
  defaultVariant = 'boxed',
  persist = false,
  storageKey = 'meen-ma3ana-layout-variant',
}: LayoutProviderProps) {
  const [containerVariant, setContainerVariantState] = useState<ContainerVariant>(() => {
    if (persist && typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        // Migrate old layout preferences
        if (stored === 'narrow' || stored === 'wide') {
          // Convert 'narrow' or 'wide' to 'boxed' (which now uses wide dimensions)
          return 'boxed'
        }
        if (stored === 'full' || stored === 'boxed') {
          return stored as ContainerVariant
        }
      }
    }
    return defaultVariant
  })

  const setContainerVariant = (variant: ContainerVariant) => {
    setContainerVariantState(variant)
    if (persist && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, variant)
    }
  }

  return (
    <LayoutContext.Provider value={{ containerVariant, setContainerVariant }}>
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}

/**
 * Optional version of useLayout that returns null if LayoutProvider is not available
 * Useful for components that may be used in contexts without LayoutProvider
 */
export function useLayoutOptional() {
  const context = useContext(LayoutContext)
  return context || null
}

