'use client'

import { useParams } from 'next/navigation'
import { useEffect } from 'react'

export default function LocaleProvider({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const locale = params.locale as string

  useEffect(() => {
    const html = document.documentElement
    html.lang = locale
    html.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [locale])

  return <>{children}</>
} 