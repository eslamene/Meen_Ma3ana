import type { CreateBeneficiaryData, Beneficiary } from '@/types/beneficiary'

/**
 * Shared client-side helper to create a beneficiary via the API.
 * Centralizes the POST /api/beneficiaries call so different UIs
 * (full page, selector modal, etc.) don't duplicate this logic.
 */
export async function createBeneficiaryClient(
  data: CreateBeneficiaryData
): Promise<Beneficiary> {
  const response = await fetch('/api/beneficiaries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  let result: any = {}
  try {
    result = await response.json()
  } catch {
    // Ignore JSON parse errors; we'll fall back to generic messages
  }

  if (!response.ok) {
    const errorMessage: string =
      result?.error || 'Failed to create beneficiary'
    throw new Error(errorMessage)
  }

  return result.data as Beneficiary
}


