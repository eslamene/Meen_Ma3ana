'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

/**
 * Redirect from /beneficiaries to /case-management/beneficiaries
 * This maintains backward compatibility for any existing links
 */
export default function BeneficiariesRedirect() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  useEffect(() => {
    router.replace(`/${locale}/case-management/beneficiaries`)
  }, [router, locale])

  return null
}

