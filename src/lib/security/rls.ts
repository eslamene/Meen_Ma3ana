import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { users, cases, contributions, sponsorships, communications } from '@/lib/db'
import { eq } from 'drizzle-orm'

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
      // Set JWT claims for RLS policies
      await db.execute(`
        SET LOCAL "request.jwt.claims" = '{"sub": "${userId}", "role": "${userRole}"}';
      `)
    } catch (error) {
      console.error('Error setting security context:', error)
      throw new Error('Failed to set security context')
    }
  }

  /**
   * Clear the security context
   */
  static async clearSecurityContext() {
    try {
      await db.execute(`
        RESET "request.jwt.claims";
      `)
    } catch (error) {
      console.error('Error clearing security context:', error)
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
      console.error('Error getting user role:', error)
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
      console.error('Error checking resource access:', error)
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
            .orderBy(cases.createdAt)
          return casesResult

        case 'contributions':
          const contributionsResult = await db
            .select({ id: contributions.id, amount: contributions.amount, status: contributions.status })
            .from(contributions)
            .orderBy(contributions.createdAt)
          return contributionsResult

        case 'sponsorships':
          const sponsorshipsResult = await db
            .select({ id: sponsorships.id, amount: sponsorships.amount, status: sponsorships.status })
            .from(sponsorships)
            .orderBy(sponsorships.createdAt)
          return sponsorshipsResult

        default:
          return []
      }
    } catch (error) {
      console.error('Error getting accessible resources:', error)
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
      console.log('Security Audit:', {
        userId,
        action,
        resourceType,
        resourceId,
        details,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error auditing action:', error)
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