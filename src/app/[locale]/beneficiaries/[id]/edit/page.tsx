'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

/**
 * Redirect from /beneficiaries/[id]/edit to /case-management/beneficiaries/[id]/edit
 */
export default function BeneficiaryEditRedirect() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const id = params.id as string

  useEffect(() => {
    router.replace(`/${locale}/case-management/beneficiaries/${id}/edit`)
  }, [router, locale, id])

  return null
}

