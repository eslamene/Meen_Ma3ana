import { pgTable, text, timestamp, uuid, decimal, boolean, integer, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// User roles enum
export const userRoles = ['donor', 'sponsor', 'admin'] as const
export type UserRole = typeof userRoles[number]

// Payment methods enum
export const paymentMethods = [
  'bank_transfer',
  'mobile_wallet', 
  'cash',
  'check',
  'ipn'
] as const
export type PaymentMethod = typeof paymentMethods[number]

// Case types enum
export const caseTypes = ['one-time', 'recurring'] as const
export type CaseType = typeof caseTypes[number]

// Case status enum
export const caseStatuses = ['draft', 'submitted', 'published', 'closed', 'under_review'] as const
export type CaseStatus = typeof caseStatuses[number]

// Recurring frequency enum
export const recurringFrequencies = ['weekly', 'monthly', 'quarterly', 'yearly'] as const
export type RecurringFrequency = typeof recurringFrequencies[number]

// Project status enum
export const projectStatuses = ['active', 'paused', 'completed', 'cancelled'] as const
export type ProjectStatus = typeof projectStatuses[number]

// Cycle status enum
export const cycleStatuses = ['active', 'completed', 'cancelled', 'upcoming'] as const
export type CycleStatus = typeof cycleStatuses[number]

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: userRoles }).notNull().default('donor'),
  first_name: text('first_name'),
  last_name: text('last_name'),
  phone: text('phone'),
  address: text('address'),
  profile_image: text('profile_image'),
  is_active: boolean('is_active').notNull().default(true),
  email_verified: boolean('email_verified').notNull().default(false),
  language: text('language').notNull().default('en'),
  notifications: text('notifications'), // JSON string for notification preferences
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Payment methods lookup table
export const paymentMethodsTable = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // bank_transfer, mobile_wallet, etc.
  name: text('name').notNull(), // Bank Transfer, Mobile Wallet, etc.
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Case categories table
export const caseCategories = pgTable('case_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'), // For UI display
  color: text('color'), // For UI styling
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Updated cases table with enhanced fields
export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  type: text('type', { enum: caseTypes }).notNull().default('one-time'),
  category_id: uuid('category_id').references(() => caseCategories.id),
  priority: text('priority').notNull(),
  location: text('location'),
  beneficiary_name: text('beneficiary_name'),
  beneficiary_contact: text('beneficiary_contact'),
  target_amount: decimal('target_amount', { precision: 10, scale: 2 }).notNull(),
  current_amount: decimal('current_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  status: text('status', { enum: caseStatuses }).notNull().default('draft'),
  // Recurring case specific fields
  frequency: text('frequency', { enum: recurringFrequencies }),
  start_date: timestamp('start_date'),
  end_date: timestamp('end_date'),
  duration: integer('duration'), // Duration in days for one-time cases
  // Workflow fields
  created_by: uuid('created_by').references(() => users.id).notNull(),
  assigned_to: uuid('assigned_to').references(() => users.id),
  sponsored_by: uuid('sponsored_by').references(() => users.id),
  supporting_documents: text('supporting_documents'), // JSON array of document URLs
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Case images table
export const caseImages = pgTable('case_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id).notNull(),
  image_path: text('image_path').notNull(),
  image_url: text('image_url').notNull(),
  file_name: text('file_name').notNull(),
  file_size: integer('file_size'),
  mime_type: text('mime_type'),
  is_primary: boolean('is_primary').notNull().default(false),
  order_index: integer('order_index').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Case status history table
export const caseStatusHistory = pgTable('case_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id).notNull(),
  previous_status: text('previous_status', { enum: caseStatuses }),
  new_status: text('new_status', { enum: caseStatuses }).notNull(),
  changed_by: uuid('changed_by').references(() => users.id),
  system_triggered: boolean('system_triggered').notNull().default(false),
  change_reason: text('change_reason'),
  changed_at: timestamp('changed_at').notNull().defaultNow(),
})

// Case updates table
export const caseUpdates = pgTable('case_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').references(() => cases.id).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  update_type: text('update_type', { enum: ['progress', 'milestone', 'general', 'emergency'] }).notNull().default('general'),
  is_public: boolean('is_public').notNull().default(true),
  attachments: text('attachments'), // JSON array of file URLs
  created_by: uuid('created_by').references(() => users.id).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  target_amount: decimal('target_amount', { precision: 10, scale: 2 }).notNull(),
  current_amount: decimal('current_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  status: text('status', { enum: projectStatuses }).notNull().default('active'),
  cycle_duration: text('cycle_duration').notNull(), // e.g., 'monthly', 'quarterly'
  cycle_duration_days: integer('cycle_duration_days'), // Number of days per cycle
  total_cycles: integer('total_cycles'), // Total number of cycles planned (null for indefinite)
  current_cycle_number: integer('current_cycle_number').notNull().default(1),
  next_cycle_date: timestamp('next_cycle_date'),
  last_cycle_date: timestamp('last_cycle_date'),
  auto_progress: boolean('auto_progress').notNull().default(true), // Whether cycles auto-progress
  created_by: uuid('created_by').references(() => users.id).notNull(),
  assigned_to: uuid('assigned_to').references(() => users.id),
  supporting_documents: text('supporting_documents'), // JSON array of document URLs
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

export const projectCycles = pgTable('project_cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id').references(() => projects.id).notNull(),
  cycle_number: integer('cycle_number').notNull(),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  target_amount: decimal('target_amount', { precision: 10, scale: 2 }).notNull(),
  current_amount: decimal('current_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  status: text('status', { enum: cycleStatuses }).notNull().default('active'),
  progress_percentage: decimal('progress_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  notes: text('notes'), // Cycle-specific notes
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

export const contributions = pgTable('contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // 'donation', 'sponsorship', 'recurring'
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  payment_method_id: uuid('payment_method_id').references(() => paymentMethodsTable.id).notNull(),
  status: text('status').notNull().default('pending'),
  proof_of_payment: text('proof_of_payment'),
  anonymous: boolean('anonymous').notNull().default(false), // Whether the contribution is anonymous
  donor_id: uuid('donor_id').references(() => users.id).notNull(),
  case_id: uuid('case_id').references(() => cases.id),
  notes: text('notes'),
  // Revision system fields
  original_contribution_id: uuid('original_contribution_id').references(() => contributions.id), // Link to original contribution for revisions
  revision_number: integer('revision_number'), // Revision number (1, 2, 3, etc.)
  revision_explanation: text('revision_explanation'), // Explanation of what was changed in this revision
  message: text('message'), // Optional message from donor
  proof_url: text('proof_url'), // Updated proof URL field name
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Recurring contributions table for managing recurring contribution schedules
export const recurringContributions = pgTable('recurring_contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  donor_id: uuid('donor_id').references(() => users.id).notNull(),
  case_id: uuid('case_id').references(() => cases.id),
  project_id: uuid('project_id').references(() => projects.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  frequency: text('frequency', { enum: recurringFrequencies }).notNull(), // weekly, monthly, quarterly, yearly
  status: text('status').notNull().default('active'), // active, paused, cancelled, completed
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date'), // null for indefinite
  next_contribution_date: timestamp('next_contribution_date').notNull(),
  total_contributions: integer('total_contributions').notNull().default(0),
  successful_contributions: integer('successful_contributions').notNull().default(0),
  failed_contributions: integer('failed_contributions').notNull().default(0),
  payment_method: text('payment_method').notNull(),
  auto_process: boolean('auto_process').notNull().default(true),
  notes: text('notes'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

export const sponsorships = pgTable('sponsorships', {
  id: uuid('id').primaryKey().defaultRandom(),
  sponsor_id: uuid('sponsor_id').references(() => users.id).notNull(),
  case_id: uuid('case_id').references(() => cases.id),
  project_id: uuid('project_id').references(() => projects.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('pending'),
  terms: text('terms'),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

export const communications = pgTable('communications', {
  id: uuid('id').primaryKey().defaultRandom(),
  sender_id: uuid('sender_id').references(() => users.id).notNull(),
  recipient_id: uuid('recipient_id').references(() => users.id).notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  is_read: boolean('is_read').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

export const localization = pgTable('localization', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  language: text('language').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // 'contribution_approved', 'contribution_rejected', 'contribution_pending', 'case_update', etc.
  recipient_id: uuid('recipient_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: jsonb('data'), // Additional data as JSON
  read: boolean('read').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

export const contributionApprovalStatus = pgTable('contribution_approval_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  contribution_id: uuid('contribution_id').notNull().references(() => contributions.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // pending, approved, rejected, acknowledged
  admin_id: uuid('admin_id').references(() => users.id),
  rejection_reason: text('rejection_reason'),
  admin_comment: text('admin_comment'),
  donor_reply: text('donor_reply'),
  donor_reply_date: timestamp('donor_reply_date'),
  payment_proof_url: text('payment_proof_url'),
  resubmission_count: integer('resubmission_count').default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})

export type ContributionApprovalStatus = typeof contributionApprovalStatus.$inferSelect
export type NewContributionApprovalStatus = typeof contributionApprovalStatus.$inferInsert

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  cases: many(cases),
  caseUpdates: many(caseUpdates),
  caseStatusHistory: many(caseStatusHistory),
  contributions: many(contributions),
  recurringContributions: many(recurringContributions),
  sponsorships: many(sponsorships),
  communications: many(communications),
  projects: many(projects),
  notifications: many(notifications),
}))

export const caseCategoriesRelations = relations(caseCategories, ({ many }) => ({
  cases: many(cases),
}))

export const casesRelations = relations(cases, ({ one, many }) => ({
  category: one(caseCategories, {
    fields: [cases.category_id],
    references: [caseCategories.id],
  }),
  createdBy: one(users, {
    fields: [cases.created_by],
    references: [users.id],
  }),
  assignedTo: one(users, {
    fields: [cases.assigned_to],
    references: [users.id],
  }),
  sponsoredBy: one(users, {
    fields: [cases.sponsored_by],
    references: [users.id],
  }),
  images: many(caseImages),
  statusHistory: many(caseStatusHistory),
  updates: many(caseUpdates),
  contributions: many(contributions),
  recurringContributions: many(recurringContributions),
  sponsorships: many(sponsorships),
}))

export const caseImagesRelations = relations(caseImages, ({ one }) => ({
  case: one(cases, {
    fields: [caseImages.case_id],
    references: [cases.id],
  }),
}))

export const caseStatusHistoryRelations = relations(caseStatusHistory, ({ one }) => ({
  case: one(cases, {
    fields: [caseStatusHistory.case_id],
    references: [cases.id],
  }),
  changedBy: one(users, {
    fields: [caseStatusHistory.changed_by],
    references: [users.id],
  }),
}))

export const caseUpdatesRelations = relations(caseUpdates, ({ one }) => ({
  case: one(cases, {
    fields: [caseUpdates.case_id],
    references: [cases.id],
  }),
  createdBy: one(users, {
    fields: [caseUpdates.created_by],
    references: [users.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipient_id],
    references: [users.id],
  }),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projects.created_by],
    references: [users.id],
  }),
  assignedTo: one(users, {
    fields: [projects.assigned_to],
    references: [users.id],
  }),
  cycles: many(projectCycles),
  contributions: many(contributions),
  recurringContributions: many(recurringContributions),
  sponsorships: many(sponsorships),
}))

export const projectCyclesRelations = relations(projectCycles, ({ one, many }) => ({
  project: one(projects, {
    fields: [projectCycles.project_id],
    references: [projects.id],
  }),
  contributions: many(contributions),
}))

export const contributionsRelations = relations(contributions, ({ one }) => ({
  donor: one(users, {
    fields: [contributions.donor_id],
    references: [users.id],
  }),
  case: one(cases, {
    fields: [contributions.case_id],
    references: [cases.id],
  }),
}))

export const sponsorshipsRelations = relations(sponsorships, ({ one }) => ({
  sponsor: one(users, {
    fields: [sponsorships.sponsor_id],
    references: [users.id],
  }),
  case: one(cases, {
    fields: [sponsorships.case_id],
    references: [cases.id],
  }),
  project: one(projects, {
    fields: [sponsorships.project_id],
    references: [projects.id],
  }),
}))

export const communicationsRelations = relations(communications, ({ one }) => ({
  sender: one(users, {
    fields: [communications.sender_id],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [communications.recipient_id],
    references: [users.id],
  }),
}))

export const recurringContributionsRelations = relations(recurringContributions, ({ one, many }) => ({
  donor: one(users, {
    fields: [recurringContributions.donor_id],
    references: [users.id],
  }),
  case: one(cases, {
    fields: [recurringContributions.case_id],
    references: [cases.id],
  }),
  project: one(projects, {
    fields: [recurringContributions.project_id],
    references: [projects.id],
  }),
}))

// Export schema object
export const schema = {
  users,
  caseCategories,
  cases,
  caseImages,
  caseStatusHistory,
  projects,
  projectCycles,
  contributions,
  recurringContributions,
  sponsorships,
  communications,
  localization,
}