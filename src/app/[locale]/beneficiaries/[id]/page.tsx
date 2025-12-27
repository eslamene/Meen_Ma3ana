'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

/**
 * Redirect from /beneficiaries/[id] to /case-management/beneficiaries/[id]
 */
export default function BeneficiaryDetailRedirect() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const id = params.id as string

  useEffect(() => {
    router.replace(`/${locale}/case-management/beneficiaries/${id}`)
  }, [router, locale, id])

  return null
}

