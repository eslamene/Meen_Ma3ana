/**
 * API Keys Utility
 * 
 * Fetches API keys from system_config table with fallback to environment variables
 * This allows API keys to be managed through the admin settings UI
 */

import { createClient } from '@/lib/supabase/server'
import { env } from '@/config/env'
import { defaultLogger as logger } from '@/lib/logger'

/**
 * Get Google Translate API key from system_config or environment variable
 * @returns API key string or undefined if not configured
 */
export async function getGoogleTranslateApiKey(): Promise<string | undefined> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'google.translate.api_key')
      .maybeSingle()

    if (error) {
      logger.warn('Error fetching Google Translate API key from system_config, falling back to env:', { error })
      return env.GOOGLE_TRANSLATE_API_KEY
    }

    // If found in system_config and not empty, use it
    if (data?.config_value && data.config_value.trim() !== '') {
      return data.config_value.trim()
    }

    // Fallback to environment variable
    return env.GOOGLE_TRANSLATE_API_KEY
  } catch (error) {
    logger.warn('Exception fetching Google Translate API key from system_config, falling back to env:', { error })
    return env.GOOGLE_TRANSLATE_API_KEY
  }
}

/**
 * Get Google Gemini API key from system_config or environment variable
 * @returns API key string or undefined if not configured
 */
export async function getGoogleGeminiApiKey(): Promise<string | undefined> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'google.gemini.api_key')
      .maybeSingle()

    if (error) {
      logger.warn('Error fetching Google Gemini API key from system_config, falling back to env:', { error })
      return env.GOOGLE_GEMINI_API_KEY
    }

    // If found in system_config and not empty, use it
    if (data?.config_value && data.config_value.trim() !== '') {
      return data.config_value.trim()
    }

    // Fallback to environment variable
    return env.GOOGLE_GEMINI_API_KEY
  } catch (error) {
    logger.warn('Exception fetching Google Gemini API key from system_config, falling back to env:', { error })
    return env.GOOGLE_GEMINI_API_KEY
  }
}

/**
 * Get Anthropic Claude API key from system_config or environment variable
 * @returns API key string or undefined if not configured
 */
export async function getAnthropicApiKey(): Promise<string | undefined> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'anthropic.api_key')
      .maybeSingle()

    if (error) {
      logger.warn('Error fetching Anthropic API key from system_config, falling back to env:', { error })
      return env.ANTHROPIC_API_KEY
    }

    // If found in system_config and not empty, use it
    if (data?.config_value && data.config_value.trim() !== '') {
      return data.config_value.trim()
    }

    // Fallback to environment variable
    return env.ANTHROPIC_API_KEY
  } catch (error) {
    logger.warn('Exception fetching Anthropic API key from system_config, falling back to env:', { error })
    return env.ANTHROPIC_API_KEY
  }
}

