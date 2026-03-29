import { NextRequest, NextResponse } from 'next/server'
import { createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import {
  getGoogleGeminiApiKey,
  getAnthropicApiKey,
  getGoogleTranslateApiKey,
} from '@/lib/utils/apiKeys'

type Provider = 'gemini' | 'anthropic' | 'translate'

async function testGeminiKey(apiKey: string): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=1`
  const response = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({} as { error?: { message?: string } }))
    const msg = data?.error?.message || `Request failed (${response.status})`
    throw new Error(msg)
  }
}

async function testAnthropicKey(apiKey: string): Promise<void> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    }),
    signal: AbortSignal.timeout(25_000),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({} as { error?: { message?: string } }))
    const msg = data?.error?.message || `Request failed (${response.status})`
    throw new Error(msg)
  }
}

async function testTranslateKey(apiKey: string): Promise<void> {
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: 'hello',
      source: 'en',
      target: 'ar',
      format: 'text',
    }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({} as { error?: { message?: string } }))
    const msg = data?.error?.message || `Request failed (${response.status})`
    throw new Error(msg)
  }
}

async function postHandler(request: NextRequest, _context: ApiHandlerContext) {
  const body = await request.json().catch(() => ({}))
  const provider = body.provider as Provider | undefined
  const overrideKey =
    typeof body.apiKey === 'string' && body.apiKey.trim().length > 0 ? body.apiKey.trim() : null

  if (provider !== 'gemini' && provider !== 'anthropic' && provider !== 'translate') {
    throw new ApiError('VALIDATION_ERROR', 'Invalid or missing provider.', 400)
  }

  let key = overrideKey
  if (!key) {
    if (provider === 'gemini') {
      key = (await getGoogleGeminiApiKey()) ?? null
    } else if (provider === 'anthropic') {
      key = (await getAnthropicApiKey()) ?? null
    } else {
      key = (await getGoogleTranslateApiKey()) ?? null
    }
  }

  if (!key) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'No API key to test. Enter a key in the field or save it first, or set the matching environment variable.',
      400
    )
  }

  try {
    if (provider === 'gemini') {
      await testGeminiKey(key)
    } else if (provider === 'anthropic') {
      await testAnthropicKey(key)
    } else {
      await testTranslateKey(key)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 200 })
  }

  return NextResponse.json({ ok: true, provider })
}

export const POST = createPostHandler(postHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/settings/test-api-key',
})
