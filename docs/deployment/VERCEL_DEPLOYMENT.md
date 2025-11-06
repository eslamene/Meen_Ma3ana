# Vercel Deployment Guide

This guide provides comprehensive instructions for deploying the Meen Ma3ana charity platform to Vercel.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build Configuration](#build-configuration)
3. [Database Setup](#database-setup)
4. [Environment Variables Configuration](#environment-variables-configuration)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying to Vercel, ensure you have:

- A Vercel account (free or paid)
- A GitHub, GitLab, or Bitbucket repository connected to Vercel
- A Supabase project set up and configured
- All environment variables ready (see [Environment Variables Configuration](#environment-variables-configuration))

## Build Configuration

### Node.js Version

The project requires **Node.js 22.x** as specified in `package.json` engines field:

```json
"engines": {
  "node": ">=22 <23",
  "npm": ">=10 <11"
}
```

Vercel automatically detects and uses Node.js 22.x based on the `vercel.json` configuration, which sets the runtime to `nodejs22.x` for all functions.

### Build Settings

The `vercel.json` file contains the following build configuration:

- **Build Command**: `npm run build` (uses `vercel-build` script from `package.json`)
- **Install Command**: `npm ci` (ensures deterministic builds with exact dependency versions)
- **Output Directory**: `.next` (auto-detected by Vercel for Next.js projects)

### Lock File Synchronization

**Critical**: The `package-lock.json` file must be kept in sync with `package.json` to ensure successful deployments. 

- After any dependency changes, run `npm install` locally to regenerate `package-lock.json`
- Never manually edit `package-lock.json`
- Use `npm run validate:lockfile` before committing to verify synchronization
- The lock file is committed to version control so Vercel can use `npm ci` for reproducible builds

## Database Setup

### Connection String Configuration

The `DATABASE_URL` environment variable must point to the **Supabase connection pooler** (port 6543) for serverless compatibility:

```
postgresql://postgres.[project-ref]:[password]@[region].pooler.supabase.com:6543/postgres
```

**Important Notes:**

- Use port **6543** (connection pooler) instead of 5432 (direct connection)
- The connection pooler is optimized for serverless environments like Vercel
- Direct connections (port 5432) may cause connection limit issues in serverless functions

### Database Migrations

**Migrations should be run manually before deployment**, not during the build process:

1. Run migrations locally or via Supabase CLI:
   ```bash
   npm run db:migrate
   ```

2. Verify migrations are applied in your Supabase dashboard

3. The build process does not run migrations automatically to avoid:
   - Build-time database dependencies
   - Potential migration conflicts
   - Build failures due to database connectivity issues

### Build-Time Environment Variable Handling

The `drizzle.config.ts` file is configured to skip DATABASE_URL validation during builds:

- `SKIP_ENV_VALIDATION=true` is automatically set by `vercel.json`
- This allows builds to proceed without DATABASE_URL
- The actual database connection happens at runtime through `src/lib/db.ts`
- Drizzle Kit is only needed for migrations, not for Next.js builds

## Environment Variables Configuration

All environment variables must be configured in the Vercel dashboard:

**Project Settings → Environment Variables**

### Required Variables

Set the following variables for **Production**, **Preview**, and **Development** environments:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://[project-ref].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (sensitive) | `eyJhbGci...` |
| `DATABASE_URL` | PostgreSQL connection string (pooler, port 6543) | `postgresql://...` |

### Security Variables

Set these to `false` in production:

| Variable | Description | Production Value |
|----------|-------------|-----------------|
| `ENABLE_DEBUG_ENDPOINTS` | Enable debug API endpoints | `false` |
| `ENABLE_TEST_ENDPOINTS` | Enable test API endpoints | `false` |

### Optional Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PRELAUNCH` | Enable landing-page-only mode | No (default: `false`) |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features | No |
| `PERPLEXITY_API_KEY` | Perplexity API key for research features | No |

### Vercel-Specific Variables

The following variable is automatically set by `vercel.json` and should **NOT** be manually configured:

- `SKIP_ENV_VALIDATION`: Automatically set to `"true"` during builds

### Security Best Practices

1. **Mark sensitive variables as "Sensitive"** in Vercel:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `ANTHROPIC_API_KEY`
   - `PERPLEXITY_API_KEY`

2. **Use environment-specific values**:
   - Set different values for Production, Preview, and Development
   - Never use production credentials in preview environments

3. **Never commit environment variables**:
   - All `.env` files are in `.gitignore`
   - Use Vercel dashboard for all environment variable management

## Post-Deployment Verification

After deployment, verify the following:

### 1. Landing Page

- Navigate to your Vercel deployment URL
- Verify the landing page loads correctly
- Check both English and Arabic locales (if applicable)

### 2. Authentication Flow

- Test user registration
- Test user login
- Verify session persistence
- Check logout functionality

### 3. API Routes

- Test protected API endpoints
- Verify RBAC permissions are enforced
- Check error handling for unauthorized requests

### 4. Database Connectivity

- Verify database queries execute successfully
- Check that migrations are applied correctly
- Test database operations through the application

### 5. File Uploads

- Test file uploads to Supabase Storage
- Verify file access permissions
- Check file deletion functionality

### 6. Internationalization

- Test language switching
- Verify RTL layout for Arabic
- Check locale-specific content

### 7. PRELAUNCH Mode (if enabled)

- Verify app routes redirect to landing page
- Check that landing page and static assets are accessible
- Confirm API endpoints are blocked appropriately

## Troubleshooting

### Common Issues and Solutions

#### 1. Build Failures: npm ci Errors

**Symptom**: Build fails with lock file synchronization errors

**Solution**:
1. Delete `package-lock.json` locally
2. Run `npm install` to regenerate the lock file
3. Verify with `npm ci` locally
4. Commit and push the updated lock file

**Prevention**: Always run `npm install` after updating `package.json`

#### 2. Missing Environment Variables

**Symptom**: Application fails at runtime with "environment variable not set" errors

**Solution**:
1. Check Vercel dashboard → Project Settings → Environment Variables
2. Verify all required variables are set for the correct environment
3. Redeploy after adding missing variables

#### 3. Database Connection Issues

**Symptom**: Database queries fail or timeout

**Solution**:
1. Verify `DATABASE_URL` uses connection pooler (port 6543)
2. Check Supabase project is active and accessible
3. Verify database credentials are correct
4. Check Supabase dashboard for connection limits

#### 4. Node.js Version Mismatch

**Symptom**: Build fails with Node.js version errors

**Solution**:
1. Verify `vercel.json` specifies `nodejs22.x` runtime
2. Check Vercel project settings use Node.js 22.x
3. Ensure `package.json` engines field specifies Node.js 22.x

#### 5. TypeScript Build Errors

**Symptom**: Build fails with TypeScript compilation errors

**Solution**:
1. Run `tsc --noEmit` locally to check for errors
2. Fix TypeScript errors before deploying
3. Verify `tsconfig.json` is correctly configured

#### 6. Missing Dependencies

**Symptom**: Runtime errors about missing modules

**Solution**:
1. Verify all dependencies are in `package.json` (not just `devDependencies`)
2. Check `package-lock.json` is committed and up-to-date
3. Review build logs for dependency installation errors

#### 7. SSR Error: "ReferenceError: document is not defined"

**Symptom**: Build fails with "ReferenceError: document is not defined" during server-side rendering

**Root Cause**: 
- Browser-only APIs (like `document`, `window`, `localStorage`) are being accessed during SSR
- Next.js 15 pre-renders client components on the server by default, even components with `'use client'` directive
- The Supabase browser client was accessing `document.cookie` without checking for browser environment

**Resolution**:
- The `src/lib/supabase/client.ts` file has been updated with `typeof window !== 'undefined'` checks
- All cookie operations (`get`, `set`, `remove`) now check for browser environment before accessing `document`
- During SSR, these functions return safely without errors
- Once the component hydrates in the browser, cookie operations work correctly

**Prevention**:
- Always wrap browser-only APIs (`document`, `window`, `localStorage`, `sessionStorage`) in environment checks when creating utilities that might be imported in client components
- Use `typeof window !== 'undefined'` or `typeof document !== 'undefined'` checks before accessing browser APIs
- Consider lazy initialization with `useState(() => ...)` for browser-only code in React components
- Follow Supabase SSR best practices for client initialization

**Note**: Even though components have the `'use client'` directive, Next.js still performs initial server-side rendering for optimization. All client component code must be SSR-safe during initialization.

### Getting Help

If you encounter issues not covered in this guide:

1. Check Vercel deployment logs: **Project Dashboard → Deployments → [Deployment] → Logs**
2. Review runtime logs: **Project Dashboard → Logs**
3. Verify Supabase dashboard for database issues
4. Check GitHub issues for known problems
5. Review Next.js and Supabase documentation

### Rollback Procedure

To rollback to a previous deployment:

1. Navigate to **Project Dashboard → Deployments**
2. Find the deployment you want to restore
3. Click the three dots menu (⋯)
4. Select **Promote to Production**

For emergency rollbacks, Vercel provides instant rollback from the deployments page.

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs)

---

**Last Updated**: See git commit history for latest changes to this deployment guide.

