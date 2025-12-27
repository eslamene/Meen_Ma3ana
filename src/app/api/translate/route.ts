import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext, createPostHandler } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { getGoogleTranslateApiKey } from '@/lib/utils/apiKeys'

/**
 * Translation API Route
 * 
 * Translates text between Arabic and English
 * 
 * This is a placeholder implementation. In production, you should:
 * 1. Use a proper translation service (Google Translate API, Azure Translator, etc.)
 * 2. Add rate limiting
 * 3. Add authentication/authorization
 * 4. Cache translations for better performance
 * 5. Handle errors gracefully
 */

type TranslationDirection = 'ar-to-en' | 'en-to-ar'

interface TranslationRequest {
  text: string
  direction: TranslationDirection
}

// Simple translation mapping for common words/phrases
// In production, replace this with actual API calls to a translation service
// (Removed unused constant - can be re-added if needed for fallback translations)

/**
 * Translation function using Google Translate API
 * Requires GOOGLE_TRANSLATE_API_KEY environment variable
 */
async function performTranslation(
  text: string,
  direction: TranslationDirection
): Promise<string> {
  const sourceLang = direction === 'ar-to-en' ? 'ar' : 'en'
  const targetLang = direction === 'ar-to-en' ? 'en' : 'ar'

  // Commented out: MyMemory Translation API (free tier, no API key required)
  /*
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  
  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
    
    const response = await fetch(myMemoryUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    if (response.ok) {
      const data = await response.json()
      if (data.responseData && data.responseData.translatedText) {
        const translated = data.responseData.translatedText
        
        // MyMemory sometimes returns the original text if translation fails
        // Check if it's actually different
        if (translated !== text && translated.trim().length > 0) {
          return translated
        }
      }
      
      // If we got a response but translation is same as original, it might be a failure
      if (data.responseStatus && data.responseStatus !== 200) {
        throw new Error(`Translation service returned error: ${data.responseStatus}`)
      }
    } else {
      // Handle specific HTTP error codes
      if (response.status === 429) {
        throw new Error('Translation service rate limit exceeded. Please try again in a moment.')
      } else if (response.status >= 500) {
        throw new Error('Translation service is temporarily unavailable. Please try again later.')
      } else {
        throw new Error(`Translation service returned error: ${response.status}`)
      }
    }
  } catch (error) {
    // Handle network errors and timeouts
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network'))) {
      throw new Error('Network error: Unable to reach translation service. Please check your internet connection.')
    } else if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      throw new Error('Translation request timed out. Please try again.')
    } else if (error instanceof Error) {
      // Re-throw with the original error message
      throw error
    }
    logger.warn('MyMemory translation failed:', error)
  } finally {
    // Always clear the timeout
    clearTimeout(timeoutId)
  }
  */

  // Commented out: LibreTranslate (if you have a self-hosted instance)
  /*
  try {
    const libreTranslateUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com/translate'
    const response = await fetch(libreTranslateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.translatedText) {
        return data.translatedText
      }
    }
  } catch (error) {
    logger.warn('LibreTranslate failed:', error)
  }
  */

  // Use Google Translate API (requires API key)
  // Get from system_config first, then fallback to env
  const apiKey = await getGoogleTranslateApiKey()
  
  if (!apiKey) {
    throw new Error('Google Translate API key is not configured. Please set it in System Settings or GOOGLE_TRANSLATE_API_KEY in your environment variables.')
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    const googleUrl = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`
    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 400) {
        throw new Error('Invalid translation request. Please check the text and language settings.')
      } else if (response.status === 403) {
        throw new Error('Google Translate API access denied. Please check your API key and billing settings.')
      } else if (response.status === 429) {
        throw new Error('Google Translate API rate limit exceeded. Please try again in a moment.')
      } else if (response.status >= 500) {
        throw new Error('Google Translate API is temporarily unavailable. Please try again later.')
      } else {
        throw new Error(`Google Translate API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }
    }

    const data = await response.json()
    
    if (data.data && data.data.translations && data.data.translations[0]) {
      const translatedText = data.data.translations[0].translatedText
      
      if (!translatedText || translatedText.trim().length === 0) {
        throw new Error('Google Translate API returned an empty translation.')
      }
      
      return translatedText
    } else {
      throw new Error('Google Translate API returned an unexpected response format.')
    }
  } catch (error) {
    // Handle network errors and timeouts
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('network'))) {
      throw new Error('Network error: Unable to reach Google Translate API. Please check your internet connection.')
    } else if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      throw new Error('Translation request timed out. Please try again.')
    } else if (error instanceof Error) {
      // Re-throw with the original error message
      throw error
    }
    
    // Error will be logged by the handler
    throw new Error('An unexpected error occurred while translating. Please try again.')
  }
}

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context
  
  const body: TranslationRequest = await request.json()
  const { text, direction } = body

  // Validate input
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'Text to translate is required and cannot be empty', 400)
  }

  if (!direction || (direction !== 'ar-to-en' && direction !== 'en-to-ar')) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid translation direction. Must be "ar-to-en" or "en-to-ar"', 400)
  }

  // Check text length (prevent abuse)
  if (text.length > 5000) {
    throw new ApiError('VALIDATION_ERROR', 'Text to translate is too long. Maximum length is 5000 characters', 400)
  }

  // Perform translation
  const translatedText = await performTranslation(text, direction)

  return NextResponse.json({
    translatedText,
    sourceLanguage: direction === 'ar-to-en' ? 'ar' : 'en',
    targetLanguage: direction === 'ar-to-en' ? 'en' : 'ar',
  })
}

export const POST = createPostHandler(handler, { loggerContext: 'api/translate' })

