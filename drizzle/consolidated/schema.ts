/**
 * Consolidated Drizzle schema entrypoint.
 *
 * This file is intentionally a stable import target for the single-baseline
 * migration strategy. It re-exports the canonical schema currently defined in
 * drizzle/schema.ts and adds tenant primitives required by the SaaS target model.
 */

import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core'

export * from '../schema'

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

export const tenantMembers = pgTable('tenant_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').notNull(),
  role: text('role').notNull().default('member'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})
