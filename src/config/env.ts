/**
 * Centralized Environment Variable Configuration
 * 
 * Validates and provides type-safe access to environment variables
 */

import { z } from 'zod'

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // Public environment variables (exposed to client)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  
  // Server-only environment variables
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().url().optional(),
  
  // Google Translate API
  GOOGLE_TRANSLATE_API_KEY: z.string().optional(),
  
  // Feature flags
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  
  // LibreTranslate (optional)
  LIBRETRANSLATE_URL: z.string().url().optional(),
  
  // Anthropic Claude API (for AI content generation)
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // Google Gemini API (alternative for AI content generation)
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  
  // Firebase Cloud Messaging (FCM)
  FIREBASE_SERVER_KEY: z.string().optional(), // Firebase Server Key for FCM
  NEXT_PUBLIC_FIREBASE_CONFIG: z.string().optional(), // Firebase config JSON string
})

/**
 * Parse and validate environment variables
 */
function parseEnv() {
  try {
    return envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY,
      ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS,
      NODE_ENV: process.env.NODE_ENV,
      LOG_LEVEL: process.env.LOG_LEVEL,
      LIBRETRANSLATE_URL: process.env.LIBRETRANSLATE_URL,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
      FIREBASE_SERVER_KEY: process.env.FIREBASE_SERVER_KEY,
      NEXT_PUBLIC_FIREBASE_CONFIG: process.env.NEXT_PUBLIC_FIREBASE_CONFIG,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')
      throw new Error(
        `❌ Invalid environment variables:\n${missingVars}\n\n` +
        'Please check your .env file and ensure all required variables are set.'
      )
    }
    throw error
  }
}

/**
 * Validated environment variables
 * 
 * @throws Error if required environment variables are missing or invalid
 */
export const env = parseEnv()

/**
 * Type for environment variables
 */
export type Env = z.infer<typeof envSchema>

/**
 * Helper to check if we're in production
 */
export const isProduction = env.NODE_ENV === 'production'

/**
 * Helper to check if we're in development
 */
export const isDevelopment = env.NODE_ENV === 'development'

/**
 * Helper to check if analytics is enabled
 */
export const isAnalyticsEnabled = env.ENABLE_ANALYTICS === true

