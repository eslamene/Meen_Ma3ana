import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, ApiHandlerContext, createPostHandler } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { getGoogleGeminiApiKey, getAnthropicApiKey } from '@/lib/utils/apiKeys'
import { getAIGenerationSettings } from '@/lib/utils/aiGenerationSettings'
import { combineAIRules, getAIRuleParameter } from '@/lib/utils/aiRulesService'

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
    title_en?: string  // Required for description generation
    title_ar?: string  // Required for description generation
  }
}

interface GenerateContentResponse {
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
 * Generate AI content using Google Gemini API or Anthropic Claude API
 * Supports both providers - checks for Google Gemini API key first, then falls back to Anthropic Claude
 * API keys are retrieved from system_config first, then fallback to environment variables
 */
async function generateWithAI(
  prompt: string,
  context: ApiHandlerContext,
  maxTokens?: number
): Promise<string> {
  const { logger } = context
  
  // Check for Google Gemini API key first (from system_config or env)
  const geminiApiKey = await getGoogleGeminiApiKey()
  if (geminiApiKey) {
    return generateWithGemini(prompt, context, geminiApiKey, maxTokens)
  }
  
  // Fall back to Anthropic Claude (from system_config or env)
  const anthropicApiKey = await getAnthropicApiKey()
  if (anthropicApiKey) {
    return generateWithClaude(prompt, context, anthropicApiKey, maxTokens)
  }
  
  throw new ApiError(
    'CONFIGURATION_ERROR',
    'Neither Google Gemini API key nor Anthropic API key is configured. Please set at least one in System Settings or environment variables.',
    500
  )
}

/**
 * Generate AI content using Google Gemini API
 */
async function generateWithGemini(
  prompt: string,
  context: ApiHandlerContext,
  apiKey: string,
  maxTokens?: number
): Promise<string> {
  const { logger } = context

  // Using Gemini 3 models only
  // Reference: https://ai.google.dev/gemini-api/docs/models#gemini-3-flash-preview
  const modelsToTry = [
    'gemini-3-flash-preview',  // Most intelligent model built for speed (Gemini 3)
    'gemini-3-pro-preview',    // Most powerful model for multimodal understanding (Gemini 3)
  ]

  let lastError: Error | null = null

  for (const modelName of modelsToTry) {
    // Retry logic for rate limit errors (429)
    const maxRetries = 2
    let retryCount = 0
    
    while (retryCount <= maxRetries) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

        // Using v1beta API endpoint with x-goog-api-key header (as per Google AI Studio)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
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
          
          // If model not found, try next model
          if (response.status === 404 && errorData.error?.message?.includes('not found')) {
            lastError = new Error(`Model ${modelName} not available`)
            break // Exit retry loop, try next model
          }
          
          // Handle rate limit with retry
          if (response.status === 429) {
            if (retryCount < maxRetries) {
              // Exponential backoff: wait 1s, 2s, 4s
              const waitTime = Math.pow(2, retryCount) * 1000
              await new Promise(resolve => setTimeout(resolve, waitTime))
              retryCount++
              continue // Retry the same model
            } else {
              // All retries exhausted, try next model or throw error
              lastError = new ApiError(
                'RATE_LIMIT_ERROR',
                'AI service rate limit exceeded. Please wait a few moments and try again. Free tier API keys have rate limits.',
                429
              )
              break // Exit retry loop, try next model
            }
          }
          
          if (response.status === 401 || response.status === 403) {
            throw new ApiError('AUTH_ERROR', 'Invalid Google Gemini API key', 401)
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
        // If it's a rate limit error and we haven't exhausted retries, continue retry loop
        if (error instanceof ApiError && error.statusCode === 429 && retryCount < maxRetries) {
          const waitTime = Math.pow(2, retryCount) * 1000
          await new Promise(resolve => setTimeout(resolve, waitTime))
          retryCount++
          continue // Retry
        }
        
        // If it's a model not found error, break to try next model
        if (error instanceof ApiError && error.message.includes('not found')) {
          lastError = error
          break // Exit retry loop, try next model
        }
        
        // If it's an AbortError or other non-model-specific error, throw it
        if (error instanceof ApiError && error.statusCode !== 429) {
          throw error
        }
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiError('TIMEOUT_ERROR', 'AI generation request timed out. Please try again.', 504)
        }
        
        // For rate limit errors after all retries, break to try next model
        if (error instanceof ApiError && error.statusCode === 429) {
          lastError = error
          break // Exit retry loop, try next model
        }
        
        // For other errors, try next model
        lastError = error instanceof Error ? error : new Error(String(error))
        break // Exit retry loop, try next model
      }
    }
  }

  // If all models failed, throw the last error
  if (lastError) {
    throw new ApiError(
      'SERVICE_ERROR',
      `All Gemini models failed. Last error: ${lastError.message}. Please check your API key and available models.`,
      500
    )
  }

  throw new ApiError('SERVICE_ERROR', 'No available Gemini models found.', 500)
}

/**
 * Generate AI content using Anthropic Claude API
 */
async function generateWithClaude(
  prompt: string,
  context: ApiHandlerContext,
  apiKey: string,
  maxTokens?: number
): Promise<string> {
  const { logger } = context

  // Default max tokens, or use provided value
  const estimatedMaxTokens = maxTokens || 2000

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: estimatedMaxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 401) {
        throw new ApiError('AUTH_ERROR', 'Invalid Anthropic API key', 401)
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
    
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text.trim()
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
    
    if (error instanceof Error) {
      logger.error('AI generation error:', error)
    } else {
      logger.error('AI generation error:', error, { errorType: typeof error })
    }
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
  // Prioritize hints (situation, needs, additionalContext, category) at the top
  const contextParts: string[] = []
  const hintParts: string[] = []
  
  // Collect hints first (these are the primary source for title generation)
  if (inputs.beneficiarySituation) {
    hintParts.push(`Situation: ${inputs.beneficiarySituation}`)
  }
  
  if (inputs.beneficiaryNeeds) {
    hintParts.push(`Needs: ${inputs.beneficiaryNeeds}`)
  }
  
  if (inputs.additionalContext) {
    hintParts.push(`Case Hint/Context: ${inputs.additionalContext}`)
  }
  
  if (inputs.category) {
    hintParts.push(`Category: ${inputs.category}`)
  }
  
  // Add hints first (most important)
  contextParts.push(...hintParts)
  
  // Add other context
  if (inputs.beneficiaryName) {
    contextParts.push(`Beneficiary: ${inputs.beneficiaryName}`)
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

  // Validate based on generation type
  if (type === 'title' || type === 'both') {
    // For title generation, require at least one "hint" field
    // Hints are: beneficiarySituation, beneficiaryNeeds, additionalContext, or category
    const hasHint = !!(
      inputs.beneficiarySituation?.trim() ||
      inputs.beneficiaryNeeds?.trim() ||
      inputs.additionalContext?.trim() ||
      inputs.category?.trim()
    )
    
    if (!hasHint) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'Title generation requires at least one hint: beneficiary situation, beneficiary needs, category, or additional context. Please provide information about the case to generate a title.',
        400
      )
    }
  }
  
  if (type === 'description') {
    // For description generation only, require a title
    const hasTitle = !!(inputs.title_en?.trim() || inputs.title_ar?.trim())
    
    if (!hasTitle) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'Description generation requires a case title. Please generate or enter a title first before generating the description.',
        400
      )
    }
    
    // Add title to context for description generation
    if (inputs.title_en) {
      contextParts.push(`Title (EN): ${inputs.title_en}`)
    }
    if (inputs.title_ar) {
      contextParts.push(`Title (AR): ${inputs.title_ar}`)
    }
  }

  if (contextParts.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'At least one input field is required to generate content', 400)
  }

  const contextString = contextParts.join('\n')

  // Fetch AI generation settings from system_config
  const aiSettings = await getAIGenerationSettings()

  // Helper function to estimate max tokens from character length
  // Rough estimate: 1 token ≈ 4 characters
  const getMaxTokens = (maxLength: number) => Math.ceil(maxLength / 4)

  // Build requirements from database rules (no hardcoding)
  const buildRequirements = async (category: 'title' | 'description', lang: 'en' | 'ar'): Promise<string> => {
    try {
      // Get all rules for this category and language from database
      const rulesText = await combineAIRules(category, lang, 'global', undefined, {
        max_length: category === 'title' ? String(aiSettings.titleMaxLength) : String(aiSettings.descriptionMaxLength),
        min_length: category === 'title' ? String(aiSettings.titleMinLength) : String(aiSettings.descriptionMinLength),
        style: category === 'title' ? aiSettings.titleStyle : aiSettings.descriptionStyle,
        tone: category === 'title' ? aiSettings.titleTone : aiSettings.descriptionTone,
        structure: category === 'description' ? aiSettings.descriptionStructure : '',
      })
      
      if (!rulesText || rulesText.trim() === '') {
        logger.warn(`No AI rules found for ${category} generation in ${lang}. This may cause generation to fail.`)
        throw new ApiError(
          'CONFIGURATION_ERROR',
          `No AI rules found in database for ${category} generation in ${lang}. Please configure rules in AI Settings.`,
          500
        )
      }
      
      return rulesText
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      logger.error(`Error building requirements for ${category} in ${lang}:`, error)
      throw new ApiError(
        'CONFIGURATION_ERROR',
        `Failed to build requirements for ${category} generation in ${lang}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      )
    }
  }

  const result: GenerateContentResponse = {}
  const debug: GenerateContentResponse['debug'] = {}

  try {
    // Generate title
    if (type === 'title' || type === 'both') {
      if (language === 'en' || language === 'both') {
        // Get requirements from database rules
        const titleRequirements = await buildRequirements('title', 'en')

        // Get hint emphasis template from database (required)
        const hintEmphasisTemplate = aiSettings.promptTemplates.get('ai.prompt.title.hint_emphasis.en')
        if (!hintEmphasisTemplate) {
          logger.error('Missing prompt template: ai.prompt.title.hint_emphasis.en', {
            availableTemplates: Array.from(aiSettings.promptTemplates.keys())
          })
          throw new ApiError(
            'CONFIGURATION_ERROR',
            'AI prompt template "ai.prompt.title.hint_emphasis.en" not found in database. Please configure it in AI Settings.',
            500
          )
        }
        
        const hintEmphasis = hintParts.length > 0
          ? '\n\n' + hintEmphasisTemplate.replace(/{hintParts}/g, hintParts.join('\n'))
          : ''

        // Get title prompt template from database (required)
        const titlePromptTemplate = aiSettings.promptTemplates.get('ai.prompt.title.template.en')
        if (!titlePromptTemplate) {
          logger.error('Missing prompt template: ai.prompt.title.template.en', {
            availableTemplates: Array.from(aiSettings.promptTemplates.keys())
          })
          throw new ApiError(
            'CONFIGURATION_ERROR',
            'AI prompt template "ai.prompt.title.template.en" not found in database. Please configure it in AI Settings.',
            500
          )
        }
        
        // Replace placeholders in template
        const titlePrompt = titlePromptTemplate
          .replace(/{titleStyle}/g, aiSettings.titleStyle)
          .replace(/{titleTone}/g, aiSettings.titleTone)
          .replace(/{contextString}/g, contextString)
          .replace(/{hintEmphasis}/g, hintEmphasis)
          .replace(/{titleRequirements}/g, titleRequirements)

        const titleEnResponse = await generateWithAI(titlePrompt, context, getMaxTokens(aiSettings.titleMaxLength))
        result.title_en = titleEnResponse
        debug.title_en = { prompt: titlePrompt, response: titleEnResponse }
      }

      if (language === 'ar' || language === 'both') {
        // Get requirements from database rules
        const titleRequirementsAr = await buildRequirements('title', 'ar')

        // Get hint emphasis template from database (required)
        const hintEmphasisTemplateAr = aiSettings.promptTemplates.get('ai.prompt.title.hint_emphasis.ar')
        if (!hintEmphasisTemplateAr) {
          logger.error('Missing prompt template: ai.prompt.title.hint_emphasis.ar', {
            availableTemplates: Array.from(aiSettings.promptTemplates.keys())
          })
          throw new ApiError(
            'CONFIGURATION_ERROR',
            'AI prompt template "ai.prompt.title.hint_emphasis.ar" not found in database. Please configure it in AI Settings.',
            500
          )
        }
        
        const hintEmphasisAr = hintParts.length > 0
          ? '\n\n' + hintEmphasisTemplateAr.replace(/{hintParts}/g, hintParts.join('\n'))
          : ''

        // Get title prompt template from database (required)
        const titlePromptTemplateAr = aiSettings.promptTemplates.get('ai.prompt.title.template.ar')
        if (!titlePromptTemplateAr) {
          logger.error('Missing prompt template: ai.prompt.title.template.ar', {
            availableTemplates: Array.from(aiSettings.promptTemplates.keys())
          })
          throw new ApiError(
            'CONFIGURATION_ERROR',
            'AI prompt template "ai.prompt.title.template.ar" not found in database. Please configure it in AI Settings.',
            500
          )
        }
        
        // Replace placeholders in template
        const titlePromptAr = titlePromptTemplateAr
          .replace(/{titleStyle}/g, aiSettings.titleStyle)
          .replace(/{titleTone}/g, aiSettings.titleTone)
          .replace(/{contextString}/g, contextString)
          .replace(/{hintEmphasis}/g, hintEmphasisAr)
          .replace(/{titleRequirements}/g, titleRequirementsAr)

        const titleArResponse = await generateWithAI(titlePromptAr, context, getMaxTokens(aiSettings.titleMaxLength))
        result.title_ar = titleArResponse
        debug.title_ar = { prompt: titlePromptAr, response: titleArResponse }
      }
    }

    // Generate description
    if (type === 'description' || type === 'both') {
      // For "both" type, use the generated title for description
      // For "description" type, use the provided title from inputs
      const titleForDescription = type === 'both' 
        ? (result.title_en || result.title_ar || '')
        : (inputs.title_en || inputs.title_ar || '')
      
      if (!titleForDescription && type === 'description') {
        throw new ApiError(
          'VALIDATION_ERROR',
          'Description generation requires a case title. Please provide a title first.',
          400
        )
      }
      
      // Add generated or provided title to context for description
      const descriptionContext = titleForDescription 
        ? `${contextString}\n\nTitle: ${titleForDescription}`
        : contextString
      
      if (language === 'en' || language === 'both') {
        // Get requirements from database rules
        const descRequirements = await buildRequirements('description', 'en')

        // Get hint emphasis template from database (required)
        const descHintEmphasisTemplate = aiSettings.promptTemplates.get('ai.prompt.description.hint_emphasis.en')
        if (!descHintEmphasisTemplate) {
          logger.error('Missing prompt template: ai.prompt.description.hint_emphasis.en', {
            availableTemplates: Array.from(aiSettings.promptTemplates.keys())
          })
          throw new ApiError(
            'CONFIGURATION_ERROR',
            'AI prompt template "ai.prompt.description.hint_emphasis.en" not found in database. Please configure it in AI Settings.',
            500
          )
        }
        
        const descHintEmphasis = hintParts.length > 0
          ? '\n\n' + descHintEmphasisTemplate.replace(/{hintParts}/g, hintParts.join('\n'))
          : ''

        // Get description prompt template from database (required)
        const descPromptTemplate = aiSettings.promptTemplates.get('ai.prompt.description.template.en')
        if (!descPromptTemplate) {
          logger.error('Missing prompt template: ai.prompt.description.template.en', {
            availableTemplates: Array.from(aiSettings.promptTemplates.keys())
          })
          throw new ApiError(
            'CONFIGURATION_ERROR',
            'AI prompt template "ai.prompt.description.template.en" not found in database. Please configure it in AI Settings.',
            500
          )
        }
        
        // Replace placeholders in template
        const descPrompt = descPromptTemplate
          .replace(/{descriptionStyle}/g, aiSettings.descriptionStyle)
          .replace(/{descriptionTone}/g, aiSettings.descriptionTone)
          .replace(/{descriptionStructure}/g, aiSettings.descriptionStructure)
          .replace(/{descriptionContext}/g, descriptionContext)
          .replace(/{descHintEmphasis}/g, descHintEmphasis)
          .replace(/{descRequirements}/g, descRequirements)

        const descEnResponse = await generateWithAI(descPrompt, context, getMaxTokens(aiSettings.descriptionMaxLength))
        result.description_en = descEnResponse
        debug.description_en = { prompt: descPrompt, response: descEnResponse }
      }

      if (language === 'ar' || language === 'both') {
        // Get requirements from database rules
        const descRequirementsAr = await buildRequirements('description', 'ar')
        
        // Add generated or provided title to context for description
        const descriptionContextAr = titleForDescription 
          ? `${contextString}\n\nالعنوان: ${titleForDescription}`
          : contextString

        // Get hint emphasis template from database (required)
        const descHintEmphasisTemplateAr = aiSettings.promptTemplates.get('ai.prompt.description.hint_emphasis.ar')
        if (!descHintEmphasisTemplateAr) {
          logger.error('Missing prompt template: ai.prompt.description.hint_emphasis.ar', {
            availableTemplates: Array.from(aiSettings.promptTemplates.keys())
          })
          throw new ApiError(
            'CONFIGURATION_ERROR',
            'AI prompt template "ai.prompt.description.hint_emphasis.ar" not found in database. Please configure it in AI Settings.',
            500
          )
        }
        
        const descHintEmphasisAr = hintParts.length > 0
          ? '\n\n' + descHintEmphasisTemplateAr.replace(/{hintParts}/g, hintParts.join('\n'))
          : ''

        // Get Arabic description prompt template from database (required)
        const descPromptTemplateAr = aiSettings.promptTemplates.get('ai.prompt.description.template.ar')
        if (!descPromptTemplateAr) {
          logger.error('Missing prompt template: ai.prompt.description.template.ar', {
            availableTemplates: Array.from(aiSettings.promptTemplates.keys())
          })
          throw new ApiError(
            'CONFIGURATION_ERROR',
            'AI prompt template "ai.prompt.description.template.ar" not found in database. Please configure it in AI Settings.',
            500
          )
        }
        
        // Replace placeholders in template
        const descPromptAr = descPromptTemplateAr
          .replace(/{descriptionStyle}/g, aiSettings.descriptionStyle)
          .replace(/{descriptionTone}/g, aiSettings.descriptionTone)
          .replace(/{descriptionStructure}/g, aiSettings.descriptionStructure)
          .replace(/{descriptionContext}/g, descriptionContextAr)
          .replace(/{descHintEmphasis}/g, descHintEmphasisAr)
          .replace(/{descRequirements}/g, descRequirementsAr)

        const descArResponse = await generateWithAI(descPromptAr, context, getMaxTokens(aiSettings.descriptionMaxLength))
        result.description_ar = descArResponse
        debug.description_ar = { prompt: descPromptAr, response: descArResponse }
      }
    }

    // Add debug info if any exists
    if (Object.keys(debug).length > 0) {
      result.debug = debug
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof Error) {
      logger.error('Unexpected error in AI content generation:', error)
    } else {
      logger.error('Unexpected error in AI content generation:', error, { errorType: typeof error })
    }
    throw new ApiError('SERVICE_ERROR', 'An unexpected error occurred during content generation.', 500)
  }
}

export const POST = createPostHandler(handler, { 
  loggerContext: 'api/ai/generate-content',
  requireAuth: true 
})

