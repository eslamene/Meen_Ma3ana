# Codebase Cleanup Instructions

**Purpose:** Step-by-step instructions for cleaning up the Meen Ma3ana codebase  
**Status:** Ready for Implementation

---

## Table of Contents

1. [Logging Cleanup](#1-logging-cleanup)
2. [TypeScript Type Safety](#2-typescript-type-safety)
3. [Deprecated Code Removal](#3-deprecated-code-removal)
4. [Error Handling Standardization](#4-error-handling-standardization)
5. [Code Duplication Reduction](#5-code-duplication-reduction)
6. [Security Improvements](#6-security-improvements)
7. [Performance Optimizations](#7-performance-optimizations)
8. [TODO Resolution](#8-todo-resolution)

---

## 1. Logging Cleanup

### Step 1.1: Create Migration Script

Create `scripts/cleanup/replace-console-logs.js`:

```javascript
#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import path from 'path'

const files = glob.sync('src/**/*.{ts,tsx}', { ignore: ['node_modules/**', '.next/**'] })

files.forEach(file => {
  let content = readFileSync(file, 'utf-8')
  let modified = false

  // Replace console.error with logger.error
  if (content.includes('console.error')) {
    // Check if logger is already imported
    if (!content.includes("from '@/lib/logger'")) {
      // Add import at top
      const importMatch = content.match(/^import.*from.*['"]/m)
      if (importMatch) {
        const insertPos = content.indexOf('\n', importMatch.index) + 1
        content = content.slice(0, insertPos) + 
          "import { Logger } from '@/lib/logger'\n" + 
          "import { getCorrelationId } from '@/lib/correlation'\n" +
          content.slice(insertPos)
        modified = true
      }
    }
    
    // Replace console.error patterns
    content = content.replace(
      /console\.error\((['"`])(.*?)\1\s*,\s*(.*?)\)/g,
      'logger.error($1$2$1, { error: $3 })'
    )
    modified = true
  }

  // Similar replacements for console.log, console.warn

  if (modified) {
    writeFileSync(file, content, 'utf-8')
    console.log(`✅ Updated: ${file}`)
  }
})
```

### Step 1.2: Manual Review Required Files

Files that need manual attention (complex logging):

1. `src/app/api/contact/route.ts` (line 134)
2. `src/app/api/translate/route.ts` (line 235)
3. All API routes in `src/app/api/`

**Action Items:**
- [ ] Run migration script
- [ ] Review and fix complex console statements manually
- [ ] Add correlation IDs to all API routes
- [ ] Test all routes after changes
- [ ] Add ESLint rule: `"no-console": "warn"`

### Step 1.3: Add ESLint Rule

Update `eslint.config.mjs`:

```javascript
rules: {
  "no-console": process.env.NODE_ENV === "production" ? "error" : "warn",
  // ... other rules
}
```

---

## 2. TypeScript Type Safety

### Step 2.1: Create Type Definitions

Create `src/types/api.ts`:

```typescript
// API Request/Response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  errorCode?: string
  details?: unknown
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}
```

### Step 2.2: Replace `any` Types

**Files to fix:**

1. `src/app/api/contributions/route.ts`
   - Line 136: `const normalizedContributions = (c: any) => {`
   - Replace with proper Contribution type

2. `src/lib/notifications.ts`
   - Line 80: `_caseData: any`
   - Create proper Case type

**Action Items:**
- [ ] Create shared type definitions
- [ ] Replace `any` in API routes
- [ ] Replace `any` in service files
- [ ] Remove `@ts-ignore` comments
- [ ] Enable `@typescript-eslint/no-explicit-any: "warn"`

### Step 2.3: Enable Strict TypeScript Rules

Update `eslint.config.mjs`:

```javascript
rules: {
  "@typescript-eslint/no-explicit-any": "warn", // Start with warn
  "@typescript-eslint/ban-ts-comment": "warn",
  // Gradually enable more strict rules
}
```

---

## 3. Deprecated Code Removal

### Step 3.1: Audit Deprecated Imports

Run audit script:

```bash
# Find all imports of deprecated files
grep -r "from '@/lib/supabase'" src/ --exclude-dir=node_modules
grep -r "from '@/config/navigation'" src/ --exclude-dir=node_modules
```

### Step 3.2: Replace Deprecated Imports

**For `@/lib/supabase`:**

```typescript
// ❌ OLD
import { supabase } from '@/lib/supabase'

// ✅ NEW (Client-side)
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// ✅ NEW (Server-side)
import { createClient } from '@/lib/supabase/server'
const supabase = createClient()
```

**For `@/config/navigation`:**

```typescript
// ❌ OLD
import { getIconComponent } from '@/config/navigation'

// ✅ NEW
import { getIconComponent } from '@/lib/icons/registry'
```

### Step 3.3: Remove Deprecated Files

**Action Items:**
- [ ] Replace all imports of `@/lib/supabase`
- [ ] Replace all imports of `@/config/navigation`
- [ ] Test all affected components
- [ ] Remove deprecated files:
  - `src/lib/supabase.ts`
  - `src/config/navigation.ts` (if no longer needed)

---

## 4. Error Handling Standardization

### Step 4.1: Create Error Utilities

Create `src/lib/utils/api-errors.ts`:

```typescript
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }

  toJSON() {
    return {
      error: this.message,
      errorCode: this.code,
      details: this.details,
    }
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode })
  }

  // Log unexpected errors
  const logger = new Logger('api-error-handler')
  logger.error('Unexpected error', { error })

  return NextResponse.json(
    { error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}
```

### Step 4.2: Create API Route Wrapper

Create `src/lib/utils/api-wrapper.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCorrelationId } from '@/lib/correlation'
import { Logger } from '@/lib/logger'
import { handleApiError } from './api-errors'

export function withApiHandler<T>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options?: {
    requireAuth?: boolean
    requireAdmin?: boolean
  }
) {
  return async (request: NextRequest, context?: any) => {
    const correlationId = getCorrelationId(request)
    const logger = new Logger('api-handler', correlationId)

    try {
      // Common auth check
      if (options?.requireAuth) {
        // Check authentication
      }

      // Common admin check
      if (options?.requireAdmin) {
        // Check admin role
      }

      return await handler(request, context)
    } catch (error) {
      logger.error('API handler error', { error })
      return handleApiError(error)
    }
  }
}
```

### Step 4.3: Update API Routes

**Action Items:**
- [ ] Create error utilities
- [ ] Create API wrapper
- [ ] Update all API routes to use wrapper
- [ ] Standardize error responses
- [ ] Add correlation IDs to all errors

---

## 5. Code Duplication Reduction

### Step 5.1: Identify Duplicate Patterns

Common patterns to extract:

1. **Authentication checks** - Repeated in many API routes
2. **Permission validation** - Similar logic across routes
3. **Pagination logic** - Repeated pagination code
4. **Form validation** - Similar validation patterns

### Step 5.2: Create Shared Utilities

**Create `src/lib/utils/auth-helpers.ts`:**

```typescript
export async function requireAuth(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new ApiError('UNAUTHORIZED', 'Authentication required', 401)
  }
  
  return { user, supabase }
}
```

**Create `src/lib/utils/pagination.ts`:**

```typescript
export function parsePagination(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
  
  return { page, limit, offset: (page - 1) * limit }
}
```

### Step 5.3: Refactor Duplicate Code

**Action Items:**
- [ ] Identify duplicate patterns
- [ ] Create shared utilities
- [ ] Refactor duplicate code
- [ ] Test refactored code
- [ ] Update documentation

---

## 6. Security Improvements

### Step 6.1: Centralize Environment Variables

Create `src/config/env.ts`:

```typescript
import { z } from 'zod'

const envSchema = z.object({
  // Public env vars
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  
  // Server-only env vars
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().url().optional(),
  
  // Feature flags
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').optional(),
})

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  // ... other vars
})

export type Env = z.infer<typeof envSchema>
```

### Step 6.2: Replace Direct process.env Access

**Action Items:**
- [ ] Create env config
- [ ] Replace all `process.env` with `env` object
- [ ] Validate all env vars at startup
- [ ] Add type safety

### Step 6.3: Improve Input Validation

**Action Items:**
- [ ] Use Zod schemas for all API inputs
- [ ] Validate all user inputs
- [ ] Sanitize inputs where needed
- [ ] Add rate limiting where missing

---

## 7. Performance Optimizations

### Step 7.1: Optimize Images

```bash
# Compress large images
# Use tools like sharp, imagemin, or online tools

# Target: public/img/Child-Poverty-General.jpg (12MB -> <500KB)
```

### Step 7.2: Review Database Queries

**Action Items:**
- [ ] Check for N+1 queries
- [ ] Add database indexes
- [ ] Use database functions where appropriate
- [ ] Review query performance

### Step 7.3: Component Optimization

**Action Items:**
- [ ] Lazy load heavy components
- [ ] Memoize expensive computations
- [ ] Use React.memo where appropriate
- [ ] Review bundle size

---

## 8. TODO Resolution

### Step 8.1: Create GitHub Issues

For each TODO/FIXME:

1. Create GitHub issue
2. Assign priority
3. Add labels
4. Set milestone

### Step 8.2: Critical TODOs

**Priority: HIGH**

1. **Email Service Integration** (`src/lib/notifications.ts:168`)
   - Integrate with SendGrid/AWS SES
   - Implement email templates
   - Add email queue

2. **Audit Service Implementation** (`src/lib/services/auditService.ts:270`)
   - Implement `logChange` properly
   - Implement `logRoleAssignment` properly
   - Remove stub methods

### Step 8.3: Resolve TODOs

**Action Items:**
- [ ] Create issues for all TODOs
- [ ] Prioritize TODOs
- [ ] Assign owners
- [ ] Resolve critical TODOs first

---

## Cleanup Checklist

### Phase 1: Critical (Week 1)
- [ ] Replace all console statements
- [ ] Fix security issues
- [ ] Remove deprecated code
- [ ] Standardize error handling

### Phase 2: Important (Month 1)
- [ ] Improve TypeScript types
- [ ] Reduce code duplication
- [ ] Optimize performance
- [ ] Resolve critical TODOs

### Phase 3: Enhancement (Quarter 1)
- [ ] Add comprehensive tests
- [ ] Improve documentation
- [ ] Refactor legacy code
- [ ] Performance monitoring

---

## Testing After Cleanup

After each cleanup phase:

1. **Run TypeScript check:**
   ```bash
   npm run check:all
   ```

2. **Run linter:**
   ```bash
   npm run lint
   ```

3. **Build project:**
   ```bash
   npm run build
   ```

4. **Test critical paths:**
   - Authentication flows
   - API endpoints
   - Database operations
   - File uploads

---

## Rollback Plan

If issues arise:

1. Revert changes via Git
2. Review error logs
3. Fix issues incrementally
4. Re-apply changes with fixes

---

**Document Status:** Ready for Implementation  
**Last Updated:** 2025-01-27

