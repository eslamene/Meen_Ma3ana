'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

/**
 * Redirect from /beneficiaries/create to /case-management/beneficiaries/create
 */
export default function BeneficiariesCreateRedirect() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  useEffect(() => {
    router.replace(`/${locale}/case-management/beneficiaries/create`)
  }, [router, locale])

  return null
}

