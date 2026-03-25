import { describe, expect, it } from 'vitest'
import { ApiError, ApiErrorCodes, createApiError } from '@/lib/utils/api-errors'

describe('ApiError', () => {
  it('serializes standardized error payload', () => {
    const err = new ApiError(ApiErrorCodes.BAD_REQUEST, 'bad input', 400, { field: 'email' })

    expect(err.toJSON()).toEqual({
      error: 'bad input',
      errorCode: ApiErrorCodes.BAD_REQUEST,
      details: { field: 'email' },
    })
  })

  it('creates forbidden error with proper status', () => {
    const err = createApiError.forbidden('no permission')

    expect(err.code).toBe(ApiErrorCodes.FORBIDDEN)
    expect(err.statusCode).toBe(403)
    expect(err.message).toBe('no permission')
  })
})
