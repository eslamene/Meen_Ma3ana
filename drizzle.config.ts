import type { Config } from 'drizzle-kit'

export default {
  schema: '@/drizzle/schema',
  out: '@/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres.pmqqjfwpwmdcasheygsw:GpI41rvz5Y!%6PnN@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  },
} satisfies Config;