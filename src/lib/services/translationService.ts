/**
 * Translation Service
 * 
 * Provides translation functionality between Arabic and English
 * Uses Google Translate API or similar service for on-the-fly translation
 */

export type TranslationDirection = 'ar-to-en' | 'en-to-ar'

export interface TranslationRequest {
  text: string
  direction: TranslationDirection
}

export interface TranslationResponse {
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
}

export interface TranslationError {
  message: string
  code?: string
}

/**
 * Detect the language of the input text
 */
export function detectLanguage(text: string): 'ar' | 'en' | 'unknown' {
  if (!text || text.trim().length === 0) {
    return 'unknown'
  }

  // Simple heuristic: check for Arabic characters
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  const hasArabic = arabicRegex.test(text)

  // Check for English characters
  const englishRegex = /[a-zA-Z]/
  const hasEnglish = englishRegex.test(text)

  if (hasArabic && !hasEnglish) {
    return 'ar'
  } else if (hasEnglish && !hasArabic) {
    return 'en'
  } else if (hasArabic && hasEnglish) {
    // Mixed content - default to Arabic if more Arabic characters
    const arabicCount = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length
    const englishCount = (text.match(/[a-zA-Z]/g) || []).length
    return arabicCount > englishCount ? 'ar' : 'en'
  }

  return 'unknown'
}

/**
 * Determine translation direction based on source text
 */
export function determineTranslationDirection(sourceText: string): TranslationDirection | null {
  const detected = detectLanguage(sourceText)
  
  if (detected === 'ar') {
    return 'ar-to-en'
  } else if (detected === 'en') {
    return 'en-to-ar'
  }
  
  return null
}

/**
 * Translate text using the API
 */
export async function translateText(
  text: string,
  direction: TranslationDirection
): Promise<TranslationResponse> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text to translate cannot be empty')
  }

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        direction,
      }),
    })

    if (!response.ok) {
      let errorMessage = 'Translation failed'
      
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || `Translation failed with status ${response.status}`
      } catch {
        // If response is not JSON, provide a status-based message
        if (response.status === 500) {
          errorMessage = 'Translation service error. Please try again later.'
        } else if (response.status === 400) {
          errorMessage = 'Invalid translation request. Please check your input.'
        } else if (response.status === 429) {
          errorMessage = 'Too many translation requests. Please wait a moment and try again.'
        } else if (response.status >= 500) {
          errorMessage = 'Translation service is temporarily unavailable. Please try again later.'
        } else {
          errorMessage = `Translation failed with status ${response.status}`
        }
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    return {
      translatedText: data.translatedText,
      sourceLanguage: data.sourceLanguage || (direction === 'ar-to-en' ? 'ar' : 'en'),
      targetLanguage: data.targetLanguage || (direction === 'ar-to-en' ? 'en' : 'ar'),
    }
  } catch (error) {
    // Re-throw Error instances as-is (they already have proper messages)
    if (error instanceof Error) {
      // Check for network errors
      if (error.message.includes('fetch') || error.message.includes('Network')) {
        throw new Error('Network error: Unable to connect to translation service. Please check your internet connection.')
      }
      throw error
    }
    throw new Error('An unexpected error occurred during translation')
  }
}

/**
 * Auto-translate text by detecting the source language
 */
export async function autoTranslate(text: string): Promise<TranslationResponse | null> {
  if (!text || text.trim().length === 0) {
    return null
  }

  const direction = determineTranslationDirection(text)
  if (!direction) {
    throw new Error('Could not determine source language for translation')
  }

  return translateText(text, direction)
}

