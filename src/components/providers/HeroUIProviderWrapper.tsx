'use client'

import { HeroUIProvider } from '@heroui/react'
import { ReactNode } from 'react'

interface HeroUIProviderWrapperProps {
  children: ReactNode
}

export default function HeroUIProviderWrapper({ children }: HeroUIProviderWrapperProps) {
  return <HeroUIProvider>{children}</HeroUIProvider>
}

