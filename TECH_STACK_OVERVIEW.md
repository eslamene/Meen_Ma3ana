# Meen Ma3ana - Tech Stack & Architecture Overview

## For New Senior Developers

This document provides a comprehensive overview of the Meen Ma3ana donation platform's technology stack, architecture patterns, and important structural decisions.

---

## 🏗️ Core Technology Stack

### Frontend Framework
- **Next.js 15.5.6** (App Router)
  - React 19.1.0 with Server Components
  - TypeScript 5.6.3 for type safety
  - Server-side rendering (SSR) and static generation
  - API routes for backend functionality

### Backend Infrastructure
- **Supabase** (BaaS Platform)
  - Authentication (Supabase Auth)
  - Real-time subscriptions (Supabase Realtime)
  - File storage (Supabase Storage)
  - Row Level Security (RLS) policies
- **PostgreSQL** (via Supabase)
  - Primary database
  - Connection pooling support
  - Full-text search capabilities

### Database ORM & Migrations
- **Drizzle ORM 0.44.4**
  - Type-safe database queries
  - Schema definitions in TypeScript
  - Migration generation and management
  - SQL-like query builder

### Styling & UI
- **Tailwind CSS 4.1.16**
  - Utility-first CSS framework
  - PostCSS integration
- **Radix UI** (Component Library)
  - Accessible, unstyled components
  - Used for: dialogs, selects, tabs, toasts, tooltips, etc.
- **Lucide React** (Icons)
  - Icon library for UI components
- **Framer Motion** (Animations)
  - Smooth UI transitions and animations

### Form Management & Validation
- **React Hook Form 7.66.0**
  - Performant form handling
- **Zod 4.1.12**
  - Schema validation
  - Type inference from schemas
- **@hookform/resolvers**
  - Zod integration with React Hook Form

### State Management & Data Fetching
- **SWR 2.2.4**
  - Data fetching with caching and revalidation
  - Real-time updates support

### Internationalization (i18n)
- **next-intl 4.3.4**
  - Multi-language support (English & Arabic)
  - RTL (Right-to-Left) layout support
  - Locale-based routing (`/[locale]/...`)
  - Message files in `messages/` directory

### Logging & Observability
- **Pino 10.1.0**
  - Structured JSON logging
  - PII redaction built-in
  - Correlation ID tracking
- **Correlation IDs**
  - Request tracing across services
  - Implemented in middleware

### Deployment
- **Vercel**
  - Hosting platform
  - Edge functions support
  - Automatic deployments from Git
  - Node.js 22.x runtime (pinned)

---

## 📁 Project Structure

```
Meen_Ma3ana/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (marketing)/              # Marketing pages group
│   │   ├── [locale]/                 # Localized routes (en, ar)
│   │   │   ├── admin/                # Admin dashboard pages
│   │   │   │   └── access-control/  # RBAC management UI
│   │   │   ├── cases/                # Case management pages
│   │   │   ├── contributions/        # Contribution pages
│   │   │   └── profile/              # User profile pages
│   │   ├── api/                      # API routes (backend)
│   │   │   ├── admin/                # Admin API endpoints
│   │   │   ├── cases/                # Case management APIs
│   │   │   ├── contributions/        # Contribution APIs
│   │   │   └── rbac/                 # RBAC management APIs
│   │   ├── auth/                     # Auth callback handlers
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page
│   │   └── middleware.ts             # Request middleware
│   │
│   ├── components/                   # React components
│   │   ├── admin/                    # Admin-specific components
│   │   ├── auth/                     # Auth components (guards, forms)
│   │   ├── cases/                    # Case-related components
│   │   ├── contributions/            # Contribution components
│   │   ├── layout/                   # Layout components
│   │   ├── navigation/               # Navigation components
│   │   ├── ui/                       # Reusable UI components (shadcn/ui)
│   │   └── marketing/                # Marketing page components
│   │
│   ├── lib/                          # Core libraries & utilities
│   │   ├── auth/                     # Auth utilities
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── middleware/               # Middleware utilities (rate limiting)
│   │   ├── navigation/               # Dynamic navigation logic
│   │   ├── notifications/            # Notification system
│   │   ├── rbac/                     # RBAC system implementation
│   │   ├── security/                 # Security guards & RLS
│   │   ├── services/                 # Business logic services
│   │   ├── supabase/                 # Supabase client utilities
│   │   ├── utils/                    # General utilities
│   │   ├── db.ts                     # Drizzle database client
│   │   ├── supabase.ts               # Supabase client
│   │   └── logger.ts                 # Pino logger setup
│   │
│   ├── config/                       # Configuration files
│   │   ├── navigation.ts             # Navigation icon mapping
│   │   └── permissions.ts            # Permission configuration
│   │
│   ├── types/                        # TypeScript type definitions
│   │   ├── beneficiary.ts
│   │   └── next-api.ts
│   │
│   └── i18n/                         # i18n configuration
│       └── request.ts                # Locale detection & config
│
├── drizzle/                          # Database schema & migrations
│   ├── schema.ts                     # Drizzle schema definitions
│   └── migrations/                   # Generated migration files
│
├── messages/                         # i18n message files
│   ├── en.json                       # English translations
│   └── ar.json                       # Arabic translations
│
├── scripts/                          # Utility scripts
│   ├── setup-env.js                  # Environment setup
│   ├── setup-storage-buckets.js      # Supabase storage setup
│   ├── create-admin-user.js          # Admin user creation
│   └── i18n/                         # i18n validation scripts
│
├── supabase/                         # Supabase-specific files
│   ├── migrations/                   # SQL migrations
│   └── *.sql                         # Storage policies, RLS fixes
│
├── middleware.ts                     # Next.js middleware (root)
├── drizzle.config.ts                 # Drizzle configuration
├── next.config.ts                    # Next.js configuration
├── vercel.json                       # Vercel deployment config
└── package.json                      # Dependencies & scripts
```

---

## 🔐 Authentication & Authorization Architecture

### Authentication Flow
1. **Supabase Auth** handles user authentication
2. **Middleware** (`middleware.ts`) refreshes auth sessions for Server Components
3. **Session cookies** managed via Supabase SSR client
4. **Correlation IDs** added to all requests for tracing

### Role-Based Access Control (RBAC)

The platform uses a **fully database-driven RBAC system**:

#### Database Schema
```sql
rbac_roles              -- Roles (admin, moderator, donor, etc.)
rbac_permissions        -- Permissions (view:cases, create:cases, etc.)
rbac_role_permissions   -- Role-permission assignments
rbac_user_roles         -- User-role assignments
rbac_modules            -- Permission modules (cases, admin, etc.)
rbac_audit_log          -- Audit trail
```

#### Permission Naming Convention
- Format: `action:resource`
- Examples:
  - `view:cases` - View donation cases
  - `create:cases` - Create new cases
  - `manage:rbac` - Manage RBAC system
  - `approve:contributions` - Approve contributions

#### Permission Checking

**Server-side (API Routes):**
```typescript
import { requirePermission } from '@/lib/security/guards'

export async function GET(request: NextRequest) {
  const guardResult = await requirePermission('view:cases')(request)
  if (guardResult instanceof NextResponse) {
    return guardResult // Unauthorized response
  }
  
  const { user, supabase } = guardResult
  // Protected logic here
}
```

**Client-side (Components):**
```typescript
import PermissionGuard from '@/lib/components/auth/PermissionGuard'

<PermissionGuard permission="view:cases">
  <CaseList />
</PermissionGuard>
```

#### Key RBAC Files
- `src/lib/rbac/database-permissions.ts` - Database RBAC service
- `src/lib/security/guards.ts` - Server-side permission guards
- `src/lib/hooks/useDatabasePermissions.ts` - Client-side permission hooks
- `src/components/auth/PermissionGuard.tsx` - Permission guard component

---

## 🗄️ Database Architecture

### Schema Management
- **Drizzle ORM** for type-safe schema definitions
- Schema file: `drizzle/schema.ts`
- Migrations: `drizzle/migrations/`
- Migration commands:
  - `npm run db:generate` - Generate migrations
  - `npm run db:migrate` - Apply migrations
  - `npm run db:studio` - Open Drizzle Studio

### Key Tables

#### Core Entities
- `users` - User accounts
- `cases` - Donation cases (one-time & recurring)
- `projects` - Recurring projects with cycles
- `project_cycles` - Individual funding cycles
- `contributions` - Donation contributions
- `sponsorships` - Sponsor-beneficiary relationships
- `communications` - Sponsor-beneficiary messages

#### RBAC Tables
- `rbac_roles`, `rbac_permissions`, `rbac_role_permissions`, `rbac_user_roles`, `rbac_modules`

#### Supporting Tables
- `case_images` - Case image attachments
- `case_updates` - Case progress updates
- `case_status_history` - Case status change audit
- `payment_methods` - Payment method lookup
- `case_categories` - Case categorization

### Database Connection
- **Connection Pooling**: Configured via `postgres` client
- **Connection String**: `DATABASE_URL` environment variable
- **SSL**: Required for production connections
- **Connection Limits**: Max 10 connections, 20s idle timeout

---

## 🌐 Internationalization (i18n)

### Implementation
- **next-intl** for locale management
- **Supported Locales**: `en` (English), `ar` (Arabic)
- **Default Locale**: `en`
- **RTL Support**: Automatic RTL layout for Arabic

### Locale Routing
- All routes prefixed with locale: `/[locale]/cases`
- Middleware handles locale detection and routing
- Message files: `messages/en.json`, `messages/ar.json`

### Usage
```typescript
import { useTranslations } from 'next-intl'

const t = useTranslations('Cases')
return <h1>{t('title')}</h1>
```

---

## 🔄 Request Flow & Middleware

### Middleware Pipeline (`middleware.ts`)

1. **Correlation ID Injection**
   - Adds `x-correlation-id` header to all requests
   - Forwards correlation ID downstream
   - Sets correlation ID on response headers

2. **Prelaunch Guard**
   - Blocks app routes if `PRELAUNCH=true`
   - Allows only landing page and static assets

3. **Auth Session Refresh**
   - Refreshes Supabase auth session
   - Required for Server Components
   - Manages cookies via Supabase SSR client

4. **Rate Limiting**
   - Applied to API routes (`/api/*`)
   - Configurable per route
   - Prevents abuse

5. **Internationalization**
   - Handles locale routing
   - Redirects to appropriate locale

### API Route Pattern

```typescript
// Standard API route structure
export async function GET(request: NextRequest) {
  // 1. Permission check
  const guardResult = await requirePermission('view:cases')(request)
  if (guardResult instanceof NextResponse) return guardResult
  
  // 2. Extract user & supabase client
  const { user, supabase } = guardResult
  
  // 3. Business logic
  const data = await fetchCases(user.id)
  
  // 4. Return response
  return NextResponse.json(data)
}
```

---

## 📦 Key Libraries & Patterns

### Data Fetching
- **SWR** for client-side data fetching
- **Server Components** for server-side data fetching
- **API Routes** for backend operations

### Form Handling
- **React Hook Form** + **Zod** for validation
- Pattern:
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
})
```

### Error Handling
- **Error Boundaries** (`ErrorBoundary.tsx`)
- **Toast notifications** for user feedback
- **Structured logging** with Pino

### File Uploads
- **Supabase Storage** for file storage
- Buckets: `case-files`, `case-images`, `contributions`
- RLS policies for access control

---

## 🔒 Security Features

### Row Level Security (RLS)
- **Supabase RLS** policies on all tables
- User-specific data access
- Admin override capabilities

### Security Guards
- **Server-side guards** (`requirePermission`, `requireRole`)
- **Client-side guards** (`PermissionGuard` component)
- **API route protection** via middleware pattern

### Audit Logging
- **RBAC audit logs** for permission changes
- **Case status history** for case changes
- **Correlation IDs** for request tracing

### Environment Security
- **Debug endpoints** disabled in production (`ENABLE_DEBUG_ENDPOINTS=false`)
- **Test endpoints** disabled in production (`ENABLE_TEST_ENDPOINTS=false`)
- **Prelaunch mode** for controlled rollouts

---

## 🚀 Deployment & DevOps

### Vercel Configuration
- **Node.js Version**: 22.x (pinned in `vercel.json`)
- **Build Command**: `npm run build`
- **Install Command**: `npm ci` (deterministic installs)
- **Region**: `fra1` (Frankfurt)

### Environment Variables
Required variables (see `.env.production.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `ENABLE_DEBUG_ENDPOINTS=false`
- `ENABLE_TEST_ENDPOINTS=false`
- `PRELAUNCH=false` (or `true` for prelaunch mode)

### Build Process
1. `npm ci` - Install dependencies
2. `npm run build` - Build Next.js app
3. Deploy to Vercel edge network

---

## 📊 Key Features & Business Logic

### Case Management
- **One-time cases**: Standard donation cases with target amounts
- **Recurring cases**: Monthly/periodic support cases
- **Case lifecycle**: Draft → Submitted → Published → Closed
- **Automatic closure**: When target amount reached

### Contribution System
- **Proof-based donations**: Donors upload payment proof
- **Admin approval**: Contributions require admin approval
- **Anonymous contributions**: Support for anonymous donations
- **Payment methods**: Bank transfer, mobile wallet, cash, check, IPN

### Sponsorship System
- **Sponsor-beneficiary matching**: Admin-approved connections
- **Direct communication**: Sponsor-beneficiary messaging
- **Case sponsorship**: Cases can be fully sponsored
- **Automatic reopening**: Cases reopen when sponsorship ends

### Recurring Projects
- **Cycle-based fundraising**: Projects with multiple funding cycles
- **Cycle management**: Automatic cycle progression
- **Goal tracking**: Per-cycle and overall project goals

### Analytics & Reporting
- **Real-time stats**: Case progress, contributions
- **Admin dashboard**: Comprehensive analytics
- **Audit trails**: Complete action history

---

## 🛠️ Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Setup environment
npm run setup:env

# Setup Supabase storage
npm run setup:storage

# Run migrations
npm run db:migrate

# Start dev server
npm run dev
```

### Common Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate migrations
- `npm run db:migrate` - Apply migrations
- `npm run db:studio` - Open Drizzle Studio
- `npm run i18n:check` - Validate i18n files

### Code Quality
- **TypeScript** for type safety
- **ESLint** for code linting
- **Pre-commit checks** via `precommit:check` script
- **Lock file validation** via `validate:lockfile`

---

## 🎯 Important Patterns & Conventions

### Component Structure
- **Server Components** by default
- **Client Components** only when needed (`'use client'`)
- **Component co-location** with related files

### API Route Structure
- **RESTful conventions** (`GET`, `POST`, `PUT`, `DELETE`)
- **Permission guards** on all protected routes
- **Error handling** with proper HTTP status codes
- **Type-safe responses** with TypeScript

### Database Queries
- **Drizzle ORM** for type-safe queries
- **Prepared statements** for security
- **Connection pooling** for performance
- **Transaction support** for atomic operations

### State Management
- **Server state**: Server Components + API routes
- **Client state**: React hooks + SWR
- **Form state**: React Hook Form
- **No global state library** (Redux/Zustand) - not needed

---

## 📚 Key Documentation Files

- `README.md` - Project overview & setup
- `Meen-Ma3ana_BRD.md` - Business requirements
- `DATABASE_SETUP.md` - Database setup guide
- `RBAC_SYSTEM.md` - RBAC documentation
- `docs/RBAC_USER_GUIDE.md` - RBAC user guide
- `QUICK_SETUP.md` - Quick setup instructions
- `SETUP.md` - Detailed setup guide

---

## 🔍 Debugging & Troubleshooting

### Logging
- **Pino logger** with structured JSON logs
- **Correlation IDs** for request tracing
- **PII redaction** built into logger
- **Log levels**: debug, info, warn, error

### Debug Endpoints
- `/api/debug/rbac-data` - View RBAC data (debug mode only)
- `/api/test-rls` - Test RLS policies (test mode only)

### Common Issues
- **Database connection**: Check `DATABASE_URL` format
- **Auth issues**: Verify Supabase keys
- **Permission errors**: Check RBAC assignments
- **i18n issues**: Validate message files

---

## 🎓 Learning Resources

### Next.js
- [Next.js 15 Docs](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)

### Supabase
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

### Drizzle ORM
- [Drizzle ORM Docs](https://orm.drizzle.team/docs)

### next-intl
- [next-intl Docs](https://next-intl-docs.vercel.app/)

---

## 🤝 Contributing Guidelines

1. **Follow TypeScript** strict mode
2. **Use ESLint** rules
3. **Write type-safe code**
4. **Add permission guards** to new API routes
5. **Update i18n files** for new UI text
6. **Run tests** before committing
7. **Follow RBAC patterns** for access control

---

## 📞 Getting Help

- Check existing documentation in `docs/` directory
- Review migration files in `drizzle/migrations/`
- Check Supabase dashboard for database issues
- Review Vercel deployment logs for build issues

---

**Last Updated**: Based on current codebase analysis
**Node.js Version**: 22.x
**Next.js Version**: 15.5.6
**React Version**: 19.1.0




