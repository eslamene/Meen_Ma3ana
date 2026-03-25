import { beforeEach, describe, expect, it, vi } from 'vitest'

const maybeSingleMock = vi.fn()
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }))
const selectMock = vi.fn(() => ({ eq: eqMock }))
const fromMock = vi.fn(() => ({ select: selectMock }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: fromMock,
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    },
  })),
}))

vi.mock('@/lib/logger', () => ({
  Logger: class {
    warn() {}
    error() {}
    debug() {}
    logStableError() {}
  },
}))

vi.mock('@/lib/security/rls', () => ({
  hasPermission: vi.fn(async () => true),
}))

describe('GET /api/auth/availability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns email existence status', async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: { id: 'user-1' }, error: null })

    const { GET } = await import('@/app/api/auth/availability/route')
    const response = await GET(new Request('http://localhost/api/auth/availability?email=person@example.com') as any)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.emailExists).toBe(true)
    expect(payload.phoneExists).toBe(null)
  })
})
