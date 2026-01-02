import { pgTable, text, timestamp, uuid, decimal, boolean, integer, jsonb, type AnyPgColumn } from 'drizzle-orm/pg-core'
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
  phone: text('phone'), // Unique constraint enforced via database index (allows NULL)
  address: text('address'),
  profile_image: text('profile_image'),
  is_active: boolean('is_active').notNull().default(true),
  email_verified: boolean('email_verified').notNull().default(false),
  language: text('language').notNull().default('en'),
  notifications: text('notifications'), // JSON string for notification preferences
  notes: text('notes'), // Admin notes about the user
  tags: jsonb('tags').$type<string[]>(), // Array of tags for categorizing users
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  // Email uniqueness is already enforced via .unique() above
  // Phone uniqueness is enforced via partial unique index in migration 1010
  // (allows multiple NULL values but ensures uniqueness for non-null phones)
])

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

// Category detection rules table
export const categoryDetectionRules = pgTable('category_detection_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  category_id: uuid('category_id').references(() => caseCategories.id, { onDelete: 'cascade' }).notNull(),
  keyword: text('keyword').notNull(), // The keyword to search for
  is_active: boolean('is_active').notNull().default(true),
  priority: integer('priority').notNull().default(0), // Higher priority rules are checked first
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  created_by: uuid('created_by').references(() => users.id),
  updated_by: uuid('updated_by').references(() => users.id),
})

// Updated cases table with enhanced fields
export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  title_en: text('title_en').notNull(), // English title
  title_ar: text('title_ar'), // Arabic title
  description_ar: text('description_ar').notNull(), // Arabic description
  description_en: text('description_en'), // English description
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
  beneficiary_id: uuid('beneficiary_id').references(() => beneficiaries.id, { onDelete: 'set null' }),
  supporting_documents: text('supporting_documents'), // JSON array of document URLs (legacy, use case_files instead)
  batch_id: uuid('batch_id').references((): AnyPgColumn => batchUploads.id, { onDelete: 'set null' }), // Reference to batch upload if created from batch
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
  original_contribution_id: uuid('original_contribution_id'),
  revision_number: integer('revision_number'),
  revision_explanation: text('revision_explanation'),
  message: text('message'),
  proof_url: text('proof_url'),
  batch_id: uuid('batch_id').references((): AnyPgColumn => batchUploads.id, { onDelete: 'set null' }), // Reference to batch upload if created from batch
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
  title: text('title'), // Legacy field, kept for backward compatibility
  message: text('message'), // Legacy field, kept for backward compatibility
  title_en: text('title_en'), // English title
  title_ar: text('title_ar'), // Arabic title
  message_en: text('message_en'), // English message
  message_ar: text('message_ar'), // Arabic message
  data: jsonb('data'), // Additional data as JSON
  read: boolean('read').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

export const landingStats = pgTable('landing_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  statKey: text('stat_key').notNull().unique(),
  statValue: decimal('stat_value', { precision: 20, scale: 0 }).notNull().default('0'),
  displayFormat: text('display_format'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})


export const systemConfig = pgTable('system_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  configKey: text('config_key').notNull().unique(),
  configValue: text('config_value').notNull(),
  description: text('description'),
  descriptionAr: text('description_ar'),
  groupType: text('group_type'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const systemContent = pgTable('system_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentKey: text('content_key').notNull().unique(),
  titleEn: text('title_en').notNull(),
  titleAr: text('title_ar').notNull(),
  contentEn: text('content_en').notNull(),
  contentAr: text('content_ar').notNull(),
  description: text('description'),
  descriptionAr: text('description_ar'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
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

// Beneficiaries table
export const beneficiaries = pgTable('beneficiaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  name_ar: text('name_ar'),
  age: integer('age'),
  gender: text('gender', { enum: ['male', 'female', 'other'] }),
  mobile_number: text('mobile_number'),
  additional_mobile_number: text('additional_mobile_number'),
  email: text('email'),
  alternative_contact: text('alternative_contact'),
  national_id: text('national_id'),
  id_type: text('id_type').default('national_id'),
  id_type_id: uuid('id_type_id').references(() => idTypes.id),
  address: text('address'),
  city: text('city'),
  city_id: uuid('city_id').references(() => cities.id),
  governorate: text('governorate'),
  country: text('country').default('Egypt'),
  medical_condition: text('medical_condition'),
  social_situation: text('social_situation'),
  family_size: integer('family_size'),
  dependents: integer('dependents'),
  is_verified: boolean('is_verified').default(false),
  verification_date: timestamp('verification_date'),
  verification_notes: text('verification_notes'),
  notes: text('notes'),
  tags: text('tags').array(), // Array of tags (PostgreSQL text[])
  risk_level: text('risk_level', { enum: ['low', 'medium', 'high', 'critical'] }).default('low'),
  total_cases: integer('total_cases').default(0),
  active_cases: integer('active_cases').default(0),
  total_amount_received: decimal('total_amount_received', { precision: 15, scale: 2 }).default('0'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  created_by: uuid('created_by').references(() => users.id),
})

// Beneficiary documents table
export const beneficiaryDocuments = pgTable('beneficiary_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  beneficiary_id: uuid('beneficiary_id').notNull().references(() => beneficiaries.id, { onDelete: 'cascade' }),
  document_type: text('document_type').notNull(), // 'identity_copy', 'personal_photo', 'other'
  file_name: text('file_name').notNull(),
  file_url: text('file_url').notNull(),
  file_size: integer('file_size'),
  mime_type: text('mime_type'),
  is_public: boolean('is_public').default(false),
  description: text('description'),
  uploaded_at: timestamp('uploaded_at').defaultNow(),
  uploaded_by: uuid('uploaded_by').references(() => users.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// ID types lookup table
export const idTypes = pgTable('id_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name_en: text('name_en').notNull(),
  name_ar: text('name_ar').notNull(),
  description: text('description'),
  is_active: boolean('is_active').default(true),
  sort_order: integer('sort_order').default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Cities lookup table
export const cities = pgTable('cities', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name_en: text('name_en').notNull(),
  name_ar: text('name_ar').notNull(),
  governorate: text('governorate'),
  country: text('country').default('Egypt'),
  is_active: boolean('is_active').default(true),
  sort_order: integer('sort_order').default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Case files table (unified file storage)
export const caseFiles = pgTable('case_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  case_id: uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  original_filename: text('original_filename'),
  file_url: text('file_url').notNull(),
  file_path: text('file_path'),
  file_type: text('file_type').notNull(), // MIME type
  file_size: integer('file_size').default(0),
  category: text('category').default('other'), // photos, medical, financial, identity, videos, audio, other
  description: text('description'),
  is_public: boolean('is_public').default(false),
  is_primary: boolean('is_primary').default(false),
  display_order: integer('display_order').default(0),
  uploaded_by: uuid('uploaded_by').references(() => users.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Site activity log table
export const siteActivityLog = pgTable('site_activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  session_id: text('session_id'),
  activity_type: text('activity_type').notNull(), // 'page_view', 'api_call', 'user_action', etc.
  category: text('category'), // 'navigation', 'authentication', 'data', etc.
  action: text('action').notNull(),
  resource_type: text('resource_type'),
  resource_id: uuid('resource_id'),
  resource_path: text('resource_path'),
  method: text('method'),
  status_code: integer('status_code'),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  referer: text('referer'),
  details: jsonb('details'),
  metadata: jsonb('metadata'),
  severity: text('severity').default('info'), // 'info', 'warning', 'error', 'critical'
  created_at: timestamp('created_at').notNull().defaultNow(),
})

// Storage rules table
export const storageRules = pgTable('storage_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  bucket_name: text('bucket_name').notNull().unique(),
  max_file_size_mb: integer('max_file_size_mb').notNull().default(5),
  allowed_extensions: text('allowed_extensions').array().notNull(), // Array of allowed file extensions
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Admin roles table
export const adminRoles = pgTable('admin_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  display_name: text('display_name').notNull(),
  display_name_ar: text('display_name_ar'),
  description: text('description'),
  description_ar: text('description_ar'),
  level: integer('level').notNull().default(0),
  is_system: boolean('is_system').default(false),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Admin permissions table
export const adminPermissions = pgTable('admin_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  display_name: text('display_name').notNull(),
  display_name_ar: text('display_name_ar'),
  description: text('description'),
  description_ar: text('description_ar'),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  is_system: boolean('is_system').default(false),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Admin role permissions junction table
export const adminRolePermissions = pgTable('admin_role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  role_id: uuid('role_id').notNull().references(() => adminRoles.id, { onDelete: 'cascade' }),
  permission_id: uuid('permission_id').notNull().references(() => adminPermissions.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').notNull().defaultNow(),
})

// Admin user roles junction table
export const adminUserRoles = pgTable('admin_user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role_id: uuid('role_id').notNull().references(() => adminRoles.id, { onDelete: 'cascade' }),
  assigned_by: uuid('assigned_by').references(() => users.id),
  assigned_at: timestamp('assigned_at').defaultNow(),
  expires_at: timestamp('expires_at'),
  is_active: boolean('is_active').default(true),
})

// Admin menu items table (self-referencing)
// Using AnyPgColumn to break circular type inference
export const adminMenuItems = pgTable('admin_menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  parent_id: uuid('parent_id').references((): AnyPgColumn => adminMenuItems.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  label_ar: text('label_ar'),
  href: text('href').notNull(),
  icon: text('icon'),
  description: text('description'),
  description_ar: text('description_ar'),
  sort_order: integer('sort_order').default(0),
  permission_id: uuid('permission_id').references(() => adminPermissions.id, { onDelete: 'set null' }),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

// Batch upload management tables
export const batchUploads = pgTable('batch_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  source_file: text('source_file'),
  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  total_items: integer('total_items').notNull().default(0),
  processed_items: integer('processed_items').notNull().default(0),
  successful_items: integer('successful_items').notNull().default(0),
  failed_items: integer('failed_items').notNull().default(0),
  error_summary: jsonb('error_summary'),
  metadata: jsonb('metadata'),
  created_by: uuid('created_by').references(() => users.id).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  completed_at: timestamp('completed_at'),
})

export const batchUploadItems = pgTable('batch_upload_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  batch_id: uuid('batch_id').references(() => batchUploads.id, { onDelete: 'cascade' }).notNull(),
  row_number: integer('row_number').notNull(),
  case_number: text('case_number').notNull(),
  case_title: text('case_title').notNull(),
  contributor_nickname: text('contributor_nickname').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  month: text('month').notNull(),
  user_id: uuid('user_id').references(() => users.id),
  case_id: uuid('case_id').references(() => cases.id),
  contribution_id: uuid('contribution_id').references(() => contributions.id),
  status: text('status').notNull().default('pending'), // 'pending', 'mapped', 'case_created', 'contribution_created', 'failed'
  error_message: text('error_message'),
  mapping_notes: text('mapping_notes'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

export const nicknameMappings = pgTable('nickname_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  nickname: text('nickname').notNull().unique(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  created_by: uuid('created_by').references(() => users.id).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
})

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
  beneficiary: one(beneficiaries, {
    fields: [cases.beneficiary_id],
    references: [beneficiaries.id],
  }),
  images: many(caseImages),
  files: many(caseFiles),
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

export const recurringContributionsRelations = relations(recurringContributions, ({ one }) => ({
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

export const beneficiariesRelations = relations(beneficiaries, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [beneficiaries.created_by],
    references: [users.id],
  }),
  idType: one(idTypes, {
    fields: [beneficiaries.id_type_id],
    references: [idTypes.id],
  }),
  city: one(cities, {
    fields: [beneficiaries.city_id],
    references: [cities.id],
  }),
  documents: many(beneficiaryDocuments),
  cases: many(cases),
}))

export const beneficiaryDocumentsRelations = relations(beneficiaryDocuments, ({ one }) => ({
  beneficiary: one(beneficiaries, {
    fields: [beneficiaryDocuments.beneficiary_id],
    references: [beneficiaries.id],
  }),
  uploadedBy: one(users, {
    fields: [beneficiaryDocuments.uploaded_by],
    references: [users.id],
  }),
}))

export const caseFilesRelations = relations(caseFiles, ({ one }) => ({
  case: one(cases, {
    fields: [caseFiles.case_id],
    references: [cases.id],
  }),
  uploadedBy: one(users, {
    fields: [caseFiles.uploaded_by],
    references: [users.id],
  }),
}))

export const adminRolesRelations = relations(adminRoles, ({ many }) => ({
  rolePermissions: many(adminRolePermissions),
  userRoles: many(adminUserRoles),
  menuItems: many(adminMenuItems),
}))

export const adminPermissionsRelations = relations(adminPermissions, ({ many }) => ({
  rolePermissions: many(adminRolePermissions),
  menuItems: many(adminMenuItems),
}))

export const adminRolePermissionsRelations = relations(adminRolePermissions, ({ one }) => ({
  role: one(adminRoles, {
    fields: [adminRolePermissions.role_id],
    references: [adminRoles.id],
  }),
  permission: one(adminPermissions, {
    fields: [adminRolePermissions.permission_id],
    references: [adminPermissions.id],
  }),
}))

export const adminUserRolesRelations = relations(adminUserRoles, ({ one }) => ({
  user: one(users, {
    fields: [adminUserRoles.user_id],
    references: [users.id],
  }),
  role: one(adminRoles, {
    fields: [adminUserRoles.role_id],
    references: [adminRoles.id],
  }),
  assignedBy: one(users, {
    fields: [adminUserRoles.assigned_by],
    references: [users.id],
  }),
}))

export const adminMenuItemsRelations = relations(adminMenuItems, ({ one, many }) => ({
  parent: one(adminMenuItems, {
    fields: [adminMenuItems.parent_id],
    references: [adminMenuItems.id],
  }),
  children: many(adminMenuItems),
  permission: one(adminPermissions, {
    fields: [adminMenuItems.permission_id],
    references: [adminPermissions.id],
  }),
}))

export const batchUploadsRelations = relations(batchUploads, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [batchUploads.created_by],
    references: [users.id],
  }),
  items: many(batchUploadItems),
}))

export const batchUploadItemsRelations = relations(batchUploadItems, ({ one }) => ({
  batch: one(batchUploads, {
    fields: [batchUploadItems.batch_id],
    references: [batchUploads.id],
  }),
  user: one(users, {
    fields: [batchUploadItems.user_id],
    references: [users.id],
  }),
  case: one(cases, {
    fields: [batchUploadItems.case_id],
    references: [cases.id],
  }),
  contribution: one(contributions, {
    fields: [batchUploadItems.contribution_id],
    references: [contributions.id],
  }),
}))

export const nicknameMappingsRelations = relations(nicknameMappings, ({ one }) => ({
  user: one(users, {
    fields: [nicknameMappings.user_id],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [nicknameMappings.created_by],
    references: [users.id],
  }),
}))

// Export schema object
export const schema = {
  users,
  caseCategories,
  categoryDetectionRules,
  cases,
  caseImages,
  caseFiles,
  caseStatusHistory,
  projects,
  projectCycles,
  contributions,
  recurringContributions,
  sponsorships,
  communications,
  localization,
  landingStats,
  systemConfig,
  systemContent,
  contributionApprovalStatus,
  beneficiaries,
  beneficiaryDocuments,
  idTypes,
  cities,
  siteActivityLog,
  storageRules,
  adminRoles,
  adminPermissions,
  adminRolePermissions,
  adminUserRoles,
  adminMenuItems,
  batchUploads,
  batchUploadItems,
  nicknameMappings,
}