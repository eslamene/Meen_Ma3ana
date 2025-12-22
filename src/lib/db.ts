import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/drizzle/schema'

import { defaultLogger as logger } from '@/lib/logger'

// Create the connection with proper URL encoding and error handling
const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Build a config object instead of passing the URL string to avoid any internal decodeURIComponent issues
let client: ReturnType<typeof postgres>
try {
  const url = new URL(connectionString)
  client = postgres({
    host: url.hostname,
    port: Number(url.port || '5432'),
    database: url.pathname.replace(/^\//, ''),
    user: url.username,
    password: url.password,
    ssl: 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
    onparameter: () => {},
  })
} catch (error: unknown) {
  logger.error('Error connecting to database:', { error: error })
  // Fallback to URL string if parsing fails
  client = postgres(connectionString, {
    ssl: 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
    onparameter: () => {},
  })
}

export const db = drizzle(client, { schema })
export { client }

// Export schema for use in other files
export { schema }

// Export individual tables for easier imports
export const { users, cases, projects, projectCycles, contributions, sponsorships, communications, localization, landingStats, systemConfig, systemContent } = schema 