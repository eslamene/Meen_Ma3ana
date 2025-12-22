/**
 * Shared Zod validation schemas for API routes
 * These schemas provide type-safe validation and can be reused across routes
 */

import { z } from 'zod'

/**
 * Common validation schemas
 */
export const commonSchemas = {
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional(),
  url: z.string().url('Invalid URL format').optional(),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().nonnegative('Must be a non-negative number'),
  dateString: z.string().datetime('Invalid date format').or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')),
}

/**
 * Contact form validation schema
 */
export const contactSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must not exceed 120 characters')
    .trim(),
  email: commonSchemas.email,
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must not exceed 5000 characters')
    .trim(),
})

/**
 * Contribution validation schema
 */
export const contributionSchema = z.object({
  caseId: commonSchemas.uuid,
  amount: commonSchemas.positiveNumber,
  message: z.string().max(1000, 'Message too long').optional(),
  anonymous: z.boolean().default(false),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  proofOfPayment: commonSchemas.url.optional(),
})

/**
 * Recurring contribution validation schema
 */
export const recurringContributionSchema = z.object({
  caseId: commonSchemas.uuid.optional(),
  projectId: commonSchemas.uuid.optional(),
  amount: commonSchemas.positiveNumber,
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly'], {
    message: 'Frequency must be one of: weekly, monthly, quarterly, yearly'
  }),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  autoProcess: z.boolean().default(true),
  notes: z.string().max(1000, 'Notes too long').optional(),
}).refine(
  (data) => data.caseId || data.projectId,
  { message: 'Either caseId or projectId must be provided' }
)

/**
 * Case creation/update validation schema
 */
export const caseSchema = z.object({
  title: z.string().max(200, 'Title too long').optional(),
  title_en: z.string().max(200, 'Title too long').optional(),
  title_ar: z.string().max(200, 'Title too long').optional(),
  description: z.string().max(10000, 'Description too long').optional(),
  description_en: z.string().max(10000, 'Description too long').optional(),
  description_ar: z.string().max(10000, 'Description too long').optional(),
  targetAmount: commonSchemas.positiveNumber,
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    message: 'Priority must be one of: low, medium, high, urgent'
  }),
  location: z.string().max(200, 'Location too long').optional(),
  beneficiaryName: z.string().max(200, 'Beneficiary name too long').optional(),
  beneficiaryContact: z.string().max(200, 'Beneficiary contact too long').optional(),
  type: z.enum(['one-time', 'recurring']).default('one-time'),
  status: z.enum(['draft', 'published', 'closed', 'cancelled']).default('draft'),
  duration: z.number().positive().optional(),
  frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
}).refine(
  (data) => (data.title_en || data.title_ar || data.title),
  { message: 'At least one title (title_en or title_ar) must be provided', path: ['title_en'] }
).refine(
  (data) => (data.description_en || data.description_ar || data.description),
  { message: 'At least one description (description_en or description_ar) must be provided', path: ['description_en'] }
)

/**
 * Project creation validation schema
 */
export const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(10000, 'Description too long'),
  category: z.string().min(1, 'Category is required'),
  targetAmount: commonSchemas.positiveNumber,
  cycleDuration: z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'custom'], {
    message: 'Cycle duration must be one of: weekly, monthly, quarterly, yearly, custom'
  }),
  cycleDurationDays: z.number().positive().optional(),
  totalCycles: z.number().positive().optional(),
  autoProgress: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.cycleDuration === 'custom') {
      return data.cycleDurationDays !== undefined && data.cycleDurationDays > 0
    }
    return true
  },
  { message: 'cycleDurationDays is required when cycleDuration is custom', path: ['cycleDurationDays'] }
)

/**
 * Category creation/update validation schema
 */
export const categorySchema = z.object({
  name: z.string().max(100, 'Name too long').optional(),
  name_en: z.string().max(100, 'Name too long').optional(),
  name_ar: z.string().max(100, 'Name too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  description_en: z.string().max(1000, 'Description too long').optional(),
  description_ar: z.string().max(1000, 'Description too long').optional(),
  icon: z.string().max(50, 'Icon too long').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
  is_active: z.boolean().optional(),
}).refine(
  (data) => (data.name_en || data.name_ar || data.name),
  { message: 'At least one name (name_en or name_ar) must be provided', path: ['name_en'] }
)

/**
 * Translation request validation schema
 */
export const translationSchema = z.object({
  text: z.string()
    .min(1, 'Text to translate is required')
    .max(5000, 'Text to translate is too long. Maximum length is 5000 characters'),
  direction: z.enum(['ar-to-en', 'en-to-ar'], {
    message: 'Invalid translation direction. Must be "ar-to-en" or "en-to-ar"'
  }),
})

/**
 * User profile update validation schema
 */
export const profileUpdateSchema = z.object({
  first_name: z.string().max(100, 'First name too long').optional(),
  last_name: z.string().max(100, 'Last name too long').optional(),
  phone: commonSchemas.phone,
  address: z.string().max(500, 'Address too long').optional(),
  language: z.enum(['en', 'ar']).optional(),
})

/**
 * Helper function to validate request body with Zod schema
 */
export function validateRequestBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body)
  
  if (!result.success) {
    const errors = result.error.issues.map(err => ({
      path: err.path.join('.'),
      message: err.message,
    }))
    
    throw new Error(`Validation failed: ${JSON.stringify(errors)}`)
  }
  
  return result.data
}

