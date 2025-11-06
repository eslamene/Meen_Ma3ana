import type { Config } from 'drizzle-kit'

/**
 * Drizzle Kit configuration
 * 
 * Requires DATABASE_URL environment variable to be set.
 * Use .env.local for local development or set in your deployment environment.
 * 
 * Example .env.local:
 * DATABASE_URL=postgresql://user:password@host:port/database
 * 
 * Note: During Vercel builds, SKIP_ENV_VALIDATION=true allows builds to proceed
 * without DATABASE_URL since Drizzle Kit is only needed for migrations, not builds.
 * The actual database connection happens at runtime through src/lib/db.ts.
 */
if (!process.env.DATABASE_URL && process.env.SKIP_ENV_VALIDATION !== 'true') {
  throw new Error('DATABASE_URL environment variable is required. Please set it in your .env.local file or environment variables.');
}

// Provide a placeholder URL during builds if DATABASE_URL is missing
// This prevents build failures while ensuring migrations still work when DATABASE_URL is available
// Using an obviously invalid host (.invalid TLD) to prevent accidental connections
// Only assign placeholder when SKIP_ENV_VALIDATION is 'true'; otherwise the check above will throw
const databaseUrl = process.env.DATABASE_URL || (process.env.SKIP_ENV_VALIDATION === 'true' 
  ? 'postgresql://placeholder:placeholder@build-placeholder.invalid:5432/placeholder'
  : '')

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;