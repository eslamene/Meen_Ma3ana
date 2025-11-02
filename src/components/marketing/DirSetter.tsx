'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function DirSetter() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const isRTL = locale === 'ar'

  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Set attributes immediately on mount
      const html = document.documentElement
      html.setAttribute('lang', locale)
      html.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
    }
  }, [locale, isRTL])

  return null
}

