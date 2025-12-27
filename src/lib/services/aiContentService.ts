/**
 * AI Content Generation Service
 * 
 * Generates catchy titles and descriptions for fundraising cases using AI
 */

export interface GenerateContentInputs {
  beneficiaryName?: string
  beneficiarySituation?: string
  beneficiaryNeeds?: string
  category?: string
  location?: string
  targetAmount?: number
  caseType?: 'one-time' | 'recurring'
  additionalContext?: string
  title_en?: string  // Required for description generation
  title_ar?: string  // Required for description generation
}

export interface GenerateContentOptions {
  type: 'title' | 'description' | 'both'
  language: 'en' | 'ar' | 'both'
  inputs: GenerateContentInputs
}

export interface GenerateContentResponse {
  title_en?: string
  title_ar?: string
  description_en?: string
  description_ar?: string
  debug?: {
    title_en?: { prompt: string; response: string }
    title_ar?: { prompt: string; response: string }
    description_en?: { prompt: string; response: string }
    description_ar?: { prompt: string; response: string }
  }
}

/**
 * Generate AI content for case titles and descriptions
 */
export async function generateContent(
  options: GenerateContentOptions
): Promise<GenerateContentResponse> {
  const { type, language, inputs } = options

  if (!inputs || Object.keys(inputs).length === 0) {
    throw new Error('At least one input field is required to generate content')
  }

  try {
    const response = await fetch('/api/ai/generate-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        language,
        inputs,
      }),
    })

    if (!response.ok) {
      let errorMessage = 'Content generation failed'
      
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || `Content generation failed with status ${response.status}`
      } catch {
        if (response.status === 500) {
          errorMessage = 'AI service error. Please try again later.'
        } else if (response.status === 400) {
          errorMessage = 'Invalid request. Please check your inputs.'
        } else if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.'
        } else if (response.status >= 500) {
          errorMessage = 'AI service is temporarily unavailable. Please try again later.'
        } else {
          errorMessage = `Content generation failed with status ${response.status}`
        }
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    return data as GenerateContentResponse
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('An unexpected error occurred during content generation')
  }
}

