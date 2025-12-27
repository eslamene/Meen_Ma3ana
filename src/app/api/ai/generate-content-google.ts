import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext, createPostHandler } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

interface GenerateContentRequest {
  type: 'title' | 'description' | 'both'
  language: 'en' | 'ar' | 'both'
  inputs: {
    beneficiaryName?: string
    beneficiarySituation?: string
    beneficiaryNeeds?: string
    category?: string
    location?: string
    targetAmount?: number
    caseType?: 'one-time' | 'recurring'
    additionalContext?: string
  }
}

interface GenerateContentResponse {
  title_en?: string
  title_ar?: string
  description_en?: string
  description_ar?: string
}

/**
 * Generate AI content using Google Gemini API
 * This is an alternative to Claude that uses Google Cloud's Gemini API
 */
async function generateWithGemini(
  prompt: string,
  context: ApiHandlerContext
): Promise<string> {
  const { logger } = context
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY

  if (!apiKey) {
    throw new ApiError(
      'CONFIGURATION_ERROR',
      'GOOGLE_GEMINI_API_KEY is not configured. Please set it in your environment variables.',
      500
    )
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    // Using Gemini 1.5 Pro model
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2000,
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 401 || response.status === 403) {
        throw new ApiError('AUTH_ERROR', 'Invalid Google Gemini API key', 401)
      } else if (response.status === 429) {
        throw new ApiError('RATE_LIMIT_ERROR', 'AI service rate limit exceeded. Please try again in a moment.', 429)
      } else if (response.status >= 500) {
        throw new ApiError('SERVICE_ERROR', 'AI service is temporarily unavailable. Please try again later.', 503)
      } else {
        throw new ApiError(
          'SERVICE_ERROR',
          `AI service error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
          response.status
        )
      }
    }

    const data = await response.json()
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text.trim()
    } else {
      throw new ApiError('SERVICE_ERROR', 'AI service returned an unexpected response format.', 500)
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('TIMEOUT_ERROR', 'AI generation request timed out. Please try again.', 504)
    }
    
    logger.error('AI generation error:', error)
    throw new ApiError('SERVICE_ERROR', 'An unexpected error occurred during AI generation.', 500)
  }
}

async function handler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context
  
  const body: GenerateContentRequest = await request.json()
  const { type, language, inputs } = body

  // Validate input
  if (!type || !['title', 'description', 'both'].includes(type)) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid type. Must be "title", "description", or "both"', 400)
  }

  if (!language || !['en', 'ar', 'both'].includes(language)) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid language. Must be "en", "ar", or "both"', 400)
  }

  if (!inputs || typeof inputs !== 'object') {
    throw new ApiError('VALIDATION_ERROR', 'Inputs object is required', 400)
  }

  // Build context string from inputs
  const contextParts: string[] = []
  
  if (inputs.beneficiaryName) {
    contextParts.push(`Beneficiary: ${inputs.beneficiaryName}`)
  }
  
  if (inputs.beneficiarySituation) {
    contextParts.push(`Situation: ${inputs.beneficiarySituation}`)
  }
  
  if (inputs.beneficiaryNeeds) {
    contextParts.push(`Needs: ${inputs.beneficiaryNeeds}`)
  }
  
  if (inputs.category) {
    contextParts.push(`Category: ${inputs.category}`)
  }
  
  if (inputs.location) {
    contextParts.push(`Location: ${inputs.location}`)
  }
  
  if (inputs.targetAmount) {
    contextParts.push(`Target Amount: ${inputs.targetAmount} EGP`)
  }
  
  if (inputs.caseType) {
    contextParts.push(`Case Type: ${inputs.caseType === 'one-time' ? 'One-time donation' : 'Recurring support'}`)
  }
  
  if (inputs.additionalContext) {
    contextParts.push(`Additional Context: ${inputs.additionalContext}`)
  }

  if (contextParts.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'At least one input field is required to generate content', 400)
  }

  const contextString = contextParts.join('\n')

  const result: GenerateContentResponse = {}

  try {
    // Generate title
    if (type === 'title' || type === 'both') {
      if (language === 'en' || language === 'both') {
        const titlePrompt = `You are a professional copywriter for a charity fundraising platform. Generate a compelling, catchy, and emotionally engaging title for a fundraising case based on the following information:

${contextString}

Requirements:
- Maximum 80 characters
- Should be attention-grabbing and create emotional connection
- Should clearly communicate the need
- Should be appropriate for a charity platform
- Should inspire people to donate
- Do NOT include quotes or special formatting, just return the title text

Generate only the title, nothing else:`

        result.title_en = await generateWithGemini(titlePrompt, context)
      }

      if (language === 'ar' || language === 'both') {
        const titlePromptAr = `أنت كاتب محترف لمنصة خيرية لجمع التبرعات. قم بإنشاء عنوان جذاب ومؤثر عاطفياً لحالة جمع تبرعات بناءً على المعلومات التالية:

${contextString}

المتطلبات:
- الحد الأقصى 80 حرفاً
- يجب أن يكون جذاباً ويخلق ارتباطاً عاطفياً
- يجب أن يوضح الحاجة بوضوح
- يجب أن يكون مناسباً لمنصة خيرية
- يجب أن يلهم الناس للتبرع
- لا تضع علامات اقتباس أو تنسيق خاص، فقط أعد العنوان

قم بإنشاء العنوان فقط، لا شيء آخر:`

        result.title_ar = await generateWithGemini(titlePromptAr, context)
      }
    }

    // Generate description
    if (type === 'description' || type === 'both') {
      if (language === 'en' || language === 'both') {
        const descPrompt = `You are a professional copywriter for a charity fundraising platform. Generate a compelling, detailed, and emotionally engaging description for a fundraising case based on the following information:

${contextString}

Requirements:
- Maximum 2000 characters
- Should tell a compelling story that creates emotional connection
- Should clearly explain the situation and needs
- Should be appropriate for a charity platform
- Should inspire people to donate
- Should be well-structured and easy to read
- Do NOT include quotes or special formatting, just return the description text

Generate only the description, nothing else:`

        result.description_en = await generateWithGemini(descPrompt, context)
      }

      if (language === 'ar' || language === 'both') {
        const descPromptAr = `أنت كاتب محترف لمنصة خيرية لجمع التبرعات. قم بإنشاء وصف جذاب ومفصل ومؤثر عاطفياً لحالة جمع تبرعات بناءً على المعلومات التالية:

${contextString}

المتطلبات:
- الحد الأقصى 2000 حرفاً
- يجب أن يحكي قصة جذابة تخلق ارتباطاً عاطفياً
- يجب أن يوضح الوضع والاحتياجات بوضوح
- يجب أن يكون مناسباً لمنصة خيرية
- يجب أن يلهم الناس للتبرع
- يجب أن يكون منسقاً وسهل القراءة
- لا تضع علامات اقتباس أو تنسيق خاص، فقط أعد الوصف

قم بإنشاء الوصف فقط، لا شيء آخر:`

        result.description_ar = await generateWithGemini(descPromptAr, context)
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    logger.error('Unexpected error in AI content generation:', error)
    throw new ApiError('SERVICE_ERROR', 'An unexpected error occurred during content generation.', 500)
  }
}

export const POST = createPostHandler(handler, { 
  loggerContext: 'api/ai/generate-content',
  requireAuth: true 
})

