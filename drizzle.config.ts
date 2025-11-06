import type { Config } from 'drizzle-kit'

/**
 * Drizzle Kit configuration
 * 
 * Requires DATABASE_URL environment variable to be set.
 * Use .env.local for local development or set in your deployment environment.
 * 
 * Example .env.local:
 * DATABASE_URL=postgresql://user:password@host:port/database
 */
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required. Please set it in your .env.local file or environment variables.');
}

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;