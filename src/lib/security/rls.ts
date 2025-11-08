import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { users, cases, contributions, sponsorships, communications } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

import { defaultLogger } from '@/lib/logger'

/**
 * Security service for handling Row Level Security (RLS) context
 * and security-related database operations
 */
export class SecurityService {
  /**
   * Set the security context for database operations
   * This ensures RLS policies are applied correctly
   */
  static async setSecurityContext(userId: string, userRole: string) {
    try {
      // Set JWT claims for RLS policies using parameterized query
      await db.execute(sql`
        SET LOCAL "request.jwt.claims" = ${JSON.stringify({ sub: userId, role: userRole })};
      `)
    } catch (error) {
      defaultLogger.error('Error setting security context:', error)
      throw new Error('Failed to set security context')
    }
  }

  /**
   * Clear the security context
   */
  static async clearSecurityContext() {
    try {
      await db.execute(sql`RESET "request.jwt.claims";`)
    } catch (error) {
      defaultLogger.error('Error clearing security context:', error)
    }
  }

  /**
   * Get current user from Supabase auth
   */
  static async getCurrentUser() {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    return user
  }

  /**
   * Get current user role from database
   */
  static async getCurrentUserRole(userId: string) {
    try {
      const result = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (result.length > 0) {
        return result[0].role
      }

      return 'donor' // Default role
    } catch (error) {
      defaultLogger.error('Error getting user role:', error)
      return 'donor'
    }
  }

  /**
   * Check if user has specific role
   */
  static async hasRole(userId: string, requiredRole: string): Promise<boolean> {
    const userRole = await this.getCurrentUserRole(userId)
    return userRole === requiredRole
  }

  /**
   * Check if user has admin privileges
   */
  static async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'admin')
  }

  /**
   * Check if user has sponsor privileges
   */
  static async isSponsor(userId: string): Promise<boolean> {
    const userRole = await this.getCurrentUserRole(userId)
    return userRole === 'sponsor' || userRole === 'admin'
  }

  /**
   * Validate user can access a specific resource
   */
  static async canAccessResource(
    userId: string, 
    resourceType: string, 
    resourceId: string
  ): Promise<boolean> {
    try {
      // Set security context
      const userRole = await this.getCurrentUserRole(userId)
      await this.setSecurityContext(userId, userRole)

      // Check access based on resource type
      switch (resourceType) {
        case 'case':
          const caseResult = await db
            .select({ id: cases.id })
            .from(cases)
            .where(eq(cases.id, resourceId))
            .limit(1)
          return caseResult.length > 0

        case 'contribution':
          const contributionResult = await db
            .select({ id: contributions.id })
            .from(contributions)
            .where(eq(contributions.id, resourceId))
            .limit(1)
          return contributionResult.length > 0

        case 'sponsorship':
          const sponsorshipResult = await db
            .select({ id: sponsorships.id })
            .from(sponsorships)
            .where(eq(sponsorships.id, resourceId))
            .limit(1)
          return sponsorshipResult.length > 0

        case 'communication':
          const communicationResult = await db
            .select({ id: communications.id })
            .from(communications)
            .where(eq(communications.id, resourceId))
            .limit(1)
          return communicationResult.length > 0

        default:
          return false
      }
    } catch (error) {
      defaultLogger.error('Error checking resource access:', error)
      return false
    } finally {
      await this.clearSecurityContext()
    }
  }

  /**
   * Get user's accessible resources based on role
   */
  static async getUserAccessibleResources(userId: string, resourceType: string) {
    try {
      const userRole = await this.getCurrentUserRole(userId)
      await this.setSecurityContext(userId, userRole)

      switch (resourceType) {
        case 'cases':
          const casesResult = await db
            .select({ id: cases.id, title: cases.title, status: cases.status })
            .from(cases)
            .orderBy(cases.created_at)
          return casesResult

        case 'contributions':
          const contributionsResult = await db
            .select({ id: contributions.id, amount: contributions.amount, status: contributions.status })
            .from(contributions)
            .orderBy(contributions.created_at)
          return contributionsResult

        case 'sponsorships':
          const sponsorshipsResult = await db
            .select({ id: sponsorships.id, amount: sponsorships.amount, status: sponsorships.status })
            .from(sponsorships)
            .orderBy(sponsorships.created_at)
          return sponsorshipsResult

        default:
          return []
      }
    } catch (error) {
      defaultLogger.error('Error getting accessible resources:', error)
      return []
    } finally {
      await this.clearSecurityContext()
    }
  }

  /**
   * Audit security-related actions
   */
  static async auditAction(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: Record<string, unknown>
  ) {
    try {
      // Note: This would require a security_audit_log table in the schema
      // For now, we'll log to console as a placeholder
      defaultLogger.info('Security Audit:', {
        userId,
        action,
        resourceType,
        resourceId,
        details,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      defaultLogger.error('Error auditing action:', error)
      // Don't throw error for audit failures to avoid breaking main functionality
    }
  }
}

/**
 * Security middleware for API routes
 */
export function withSecurity<T extends unknown[], R>(
  handler: (userId: string, userRole: string, ...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const user = await SecurityService.getCurrentUser()
    
    if (!user) {
      throw new Error('Unauthorized')
    }

    const userRole = await SecurityService.getCurrentUserRole(user.id)
    
    // Set security context
    await SecurityService.setSecurityContext(user.id, userRole)
    
    try {
      return await handler(user.id, userRole, ...args)
    } finally {
      // Clear security context
      await SecurityService.clearSecurityContext()
    }
  }
}

/**
 * Role-based access control decorator
 */
export function requireRole(requiredRole: string) {
  return function <T extends unknown[], R>(
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: T): Promise<R> {
      const user = await SecurityService.getCurrentUser()
      
      if (!user) {
        throw new Error('Unauthorized')
      }

      const userRole = await SecurityService.getCurrentUserRole(user.id)
      
      if (userRole !== requiredRole && userRole !== 'admin') {
        throw new Error('Insufficient permissions')
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * Check if user has specific permission via admin_permissions system
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT 1 FROM admin_user_roles ur
      JOIN admin_role_permissions rp ON ur.role_id = rp.role_id
      JOIN admin_permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ${userId}
        AND ur.is_active = true
        AND p.is_active = true
        AND p.name = ${permission}
      LIMIT 1
    `)
    
    return result.length > 0
  } catch (error) {
    defaultLogger.error('Error checking permission:', error)
    return false
  }
}

/**
 * Check if user has admin role via admin_user_roles system
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT 1 FROM admin_user_roles ur
      JOIN admin_roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${userId}
        AND ur.is_active = true
        AND r.is_active = true
        AND r.name IN ('admin', 'super_admin')
      LIMIT 1
    `)
    
    return result.length > 0
  } catch (error) {
    defaultLogger.error('Error checking admin role:', error)
    return false
  }
}

/**
 * Require admin permission guard for API routes
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function requireAdminPermission(_request: NextRequest): Promise<{ user: { id: string; email?: string; user_metadata?: Record<string, unknown> }; supabase: SupabaseClient } | NextResponse> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permission via RBAC
    const isAdmin = await isAdminUser(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    return { user, supabase }
  } catch (error) {
    defaultLogger.error('Error in requireAdminPermission:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Require specific permission guard for API routes
 */
export function requirePermission(permission: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async (_request: NextRequest): Promise<{ user: { id: string; email?: string; user_metadata?: Record<string, unknown> }; supabase: SupabaseClient } | NextResponse> => {
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
              }
            },
          },
        }
      )
      
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check specific permission via RBAC
      const hasRequiredPermission = await hasPermission(user.id, permission)
      if (!hasRequiredPermission) {
        return NextResponse.json({ error: `Forbidden - ${permission} permission required` }, { status: 403 })
      }

      return { user, supabase }
    } catch (error) {
      defaultLogger.error(`Error in requirePermission(${permission}):`, error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

/**
 * Check if debug/test endpoints should be enabled
 */
export function isDebugEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && 
         process.env.ENABLE_DEBUG_ENDPOINTS === 'true'
}

/**
 * Check if test endpoints should be enabled
 */
export function isTestEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && 
         process.env.ENABLE_TEST_ENDPOINTS === 'true'
} 