import { NextRequest, NextResponse } from 'next/server'
import { getCorrelationId } from '@/lib/correlation'
import { Logger } from '@/lib/logger'
import { handleApiError, createApiError } from './api-errors'
import { createClient } from '@/lib/supabase/server'
import { hasPermission } from '@/lib/security/rls'

/**
 * Options for API route wrapper
 */
export interface ApiHandlerOptions {
  /**
   * Require authentication
   */
  requireAuth?: boolean
  
  /**
   * Require admin role
   */
  requireAdmin?: boolean
  
  /**
   * Require super_admin role
   */
  requireSuperAdmin?: boolean
  
  /**
   * Require specific permissions
   */
  requirePermissions?: string[]
  
  /**
   * Custom logger context name
   */
  loggerContext?: string
}

/**
 * Context passed to API handlers
 */
export interface ApiHandlerContext {
  user: { id: string; email?: string }
  supabase: Awaited<ReturnType<typeof createClient>>
  logger: Logger
  correlationId?: string
}

/**
 * API route handler function type
 */
export type ApiHandler = (
  request: NextRequest,
  context: ApiHandlerContext
) => Promise<NextResponse>

/**
 * API route handler function type with RouteContext (for dynamic routes)
 */
export type ApiHandlerWithParams<T extends Record<string, string> = Record<string, string>> = (
  request: NextRequest,
  context: ApiHandlerContext,
  params: T
) => Promise<NextResponse>

/**
 * Wrapper for API route handlers that provides:
 * - Automatic error handling
 * - Authentication checks
 * - Admin role checks
 * - Permission checks
 * - Correlation ID tracking
 * - Structured logging
 * 
 * @example
 * ```typescript
 * export const GET = withApiHandler(async (request, { user, supabase, logger }) => {
 *   // Your handler code
 *   return NextResponse.json({ data: 'success' })
 * }, { requireAuth: true })
 * ```
 */
export function withApiHandler(
  handler: ApiHandler,
  options: ApiHandlerOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const correlationId = getCorrelationId(request)
    const logger = new Logger(correlationId)

    try {
      // Get Supabase client
      const supabase = await createClient()

      // Check authentication if required
      if (options.requireAuth || options.requireAdmin || options.requireSuperAdmin || options.requirePermissions) {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          logger.warn('Unauthorized request', { error: authError })
          return handleApiError(createApiError.unauthorized(), logger, correlationId)
        }

        // Check admin role if required
        if (options.requireAdmin) {
          const { data: adminRoles } = await supabase
            .from('admin_user_roles')
            .select('admin_roles!inner(name)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .in('admin_roles.name', ['admin', 'super_admin'])
            .limit(1)

          const isAdmin = (adminRoles?.length || 0) > 0

          if (!isAdmin) {
            logger.warn('Forbidden: Admin access required', { userId: user.id })
            return handleApiError(createApiError.forbidden('Admin access required'), logger, correlationId)
          }
        }

        // Check super_admin role if required
        if (options.requireSuperAdmin) {
          const { data: adminRoles } = await supabase
            .from('admin_user_roles')
            .select('admin_roles!inner(name)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .eq('admin_roles.name', 'super_admin')
            .limit(1)

          const isSuperAdmin = (adminRoles?.length || 0) > 0

          if (!isSuperAdmin) {
            logger.warn('Forbidden: Super admin access required', { userId: user.id })
            return handleApiError(createApiError.forbidden('Super admin access required'), logger, correlationId)
          }
        }

        // Check permissions if required
        if (options.requirePermissions && options.requirePermissions.length > 0) {
          // Check if user has any of the required permissions (OR logic)
          const permissionChecks = await Promise.all(
            options.requirePermissions.map(permission => hasPermission(user.id, permission))
          )
          
          const hasAnyPermission = permissionChecks.some(has => has === true)
          
          if (!hasAnyPermission) {
            logger.warn('Forbidden: Missing required permissions', {
              userId: user.id,
              requiredPermissions: options.requirePermissions,
            })
            return handleApiError(
              createApiError.forbidden(`Missing required permissions: ${options.requirePermissions.join(', ')}`),
              logger,
              correlationId
            )
          }
          
          logger.debug('Permission check passed', {
            userId: user.id,
            permissions: options.requirePermissions,
          })
        }

        // Create context with authenticated user
        const context: ApiHandlerContext = {
          user: {
            id: user.id,
            email: user.email,
          },
          supabase,
          logger,
          correlationId,
        }

        return await handler(request, context)
      }

      // No auth required - create context without user
      const context: ApiHandlerContext = {
        user: { id: 'anonymous' },
        supabase,
        logger,
        correlationId,
      }

      return await handler(request, context)
    } catch (error) {
      // Convert error to proper Error instance before logging
      let errorToLog: Error
      if (error instanceof Error) {
        errorToLog = error
      } else if (error && typeof error === 'object') {
        const errorObj = error as Record<string, unknown>
        const message = errorObj.message as string | undefined
        const code = errorObj.code as string | undefined
        errorToLog = new Error(message || code || 'Unknown API handler error')
        if (code) {
          (errorToLog as any).code = code
        }
      } else {
        errorToLog = new Error('Unknown API handler error')
      }
      logger.error('API handler error', errorToLog)
      return handleApiError(error, logger, correlationId)
    }
  }
}

/**
 * Helper to create GET handler
 */
export function createGetHandler(
  handler: ApiHandler,
  options?: ApiHandlerOptions
) {
  return withApiHandler(handler, options)
}

/**
 * Helper to create POST handler
 */
export function createPostHandler(
  handler: ApiHandler,
  options?: ApiHandlerOptions
) {
  return withApiHandler(handler, options)
}

/**
 * Helper to create PUT handler
 */
export function createPutHandler(
  handler: ApiHandler,
  options?: ApiHandlerOptions
) {
  return withApiHandler(handler, options)
}

/**
 * Helper to create PATCH handler
 */
export function createPatchHandler(
  handler: ApiHandler,
  options?: ApiHandlerOptions
) {
  return withApiHandler(handler, options)
}

/**
 * Helper to create DELETE handler
 */
export function createDeleteHandler(
  handler: ApiHandler,
  options?: ApiHandlerOptions
) {
  return withApiHandler(handler, options)
}

/**
 * Wrapper for API route handlers with RouteContext (dynamic routes)
 * Extracts params from RouteContext and passes them to the handler
 */
export function withApiHandlerWithParams<T extends Record<string, string> = Record<string, string>>(
  handler: ApiHandlerWithParams<T>,
  options: ApiHandlerOptions = {}
): (request: NextRequest, routeContext: { params: Promise<T> }) => Promise<NextResponse> {
  return async (request: NextRequest, routeContext: { params: Promise<T> }) => {
    const correlationId = getCorrelationId(request)
    const logger = new Logger(correlationId)

    try {
      // Extract params from RouteContext
      const params = await routeContext.params

      // Get Supabase client
      const supabase = await createClient()

      // Check authentication if required
      if (options.requireAuth || options.requireAdmin || options.requireSuperAdmin || options.requirePermissions) {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          logger.warn('Unauthorized request', { error: authError })
          return handleApiError(createApiError.unauthorized(), logger, correlationId)
        }

        // Check admin role if required
        if (options.requireAdmin) {
          const { data: adminRoles } = await supabase
            .from('admin_user_roles')
            .select('admin_roles!inner(name)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .in('admin_roles.name', ['admin', 'super_admin'])
            .limit(1)

          const isAdmin = (adminRoles?.length || 0) > 0

          if (!isAdmin) {
            logger.warn('Forbidden: Admin access required', { userId: user.id })
            return handleApiError(createApiError.forbidden('Admin access required'), logger, correlationId)
          }
        }

        // Check super_admin role if required
        if (options.requireSuperAdmin) {
          const { data: adminRoles } = await supabase
            .from('admin_user_roles')
            .select('admin_roles!inner(name)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .eq('admin_roles.name', 'super_admin')
            .limit(1)

          const isSuperAdmin = (adminRoles?.length || 0) > 0

          if (!isSuperAdmin) {
            logger.warn('Forbidden: Super admin access required', { userId: user.id })
            return handleApiError(createApiError.forbidden('Super admin access required'), logger, correlationId)
          }
        }

        // Check permissions if required
        if (options.requirePermissions && options.requirePermissions.length > 0) {
          // Check if user has any of the required permissions (OR logic)
          const permissionChecks = await Promise.all(
            options.requirePermissions.map(permission => hasPermission(user.id, permission))
          )
          
          const hasAnyPermission = permissionChecks.some(has => has === true)
          
          if (!hasAnyPermission) {
            logger.warn('Forbidden: Missing required permissions', {
              userId: user.id,
              requiredPermissions: options.requirePermissions,
            })
            return handleApiError(
              createApiError.forbidden(`Missing required permissions: ${options.requirePermissions.join(', ')}`),
              logger,
              correlationId
            )
          }
          
          logger.debug('Permission check passed', {
            userId: user.id,
            permissions: options.requirePermissions,
          })
        }

        // Create context with authenticated user
        const context: ApiHandlerContext = {
          user: {
            id: user.id,
            email: user.email,
          },
          supabase,
          logger,
          correlationId,
        }

        return await handler(request, context, params)
      }

      // No auth required - create context without user
      const context: ApiHandlerContext = {
        user: { id: 'anonymous' },
        supabase,
        logger,
        correlationId,
      }

      return await handler(request, context, params)
    } catch (error) {
      // Convert error to proper Error instance before logging
      let errorToLog: Error
      if (error instanceof Error) {
        errorToLog = error
      } else if (error && typeof error === 'object') {
        const errorObj = error as Record<string, unknown>
        const message = errorObj.message as string | undefined
        const code = errorObj.code as string | undefined
        errorToLog = new Error(message || code || 'Unknown API handler error')
        if (code) {
          (errorToLog as any).code = code
        }
      } else {
        errorToLog = new Error('Unknown API handler error')
      }
      logger.error('API handler error', errorToLog)
      return handleApiError(error, logger, correlationId)
    }
  }
}

/**
 * Helper to create GET handler with RouteContext
 */
export function createGetHandlerWithParams<T extends Record<string, string> = Record<string, string>>(
  handler: ApiHandlerWithParams<T>,
  options?: ApiHandlerOptions
) {
  return withApiHandlerWithParams(handler, options)
}

/**
 * Helper to create POST handler with RouteContext
 */
export function createPostHandlerWithParams<T extends Record<string, string> = Record<string, string>>(
  handler: ApiHandlerWithParams<T>,
  options?: ApiHandlerOptions
) {
  return withApiHandlerWithParams(handler, options)
}

/**
 * Helper to create PUT handler with RouteContext
 */
export function createPutHandlerWithParams<T extends Record<string, string> = Record<string, string>>(
  handler: ApiHandlerWithParams<T>,
  options?: ApiHandlerOptions
) {
  return withApiHandlerWithParams(handler, options)
}

/**
 * Helper to create PATCH handler with RouteContext
 */
export function createPatchHandlerWithParams<T extends Record<string, string> = Record<string, string>>(
  handler: ApiHandlerWithParams<T>,
  options?: ApiHandlerOptions
) {
  return withApiHandlerWithParams(handler, options)
}

/**
 * Helper to create DELETE handler with RouteContext
 */
export function createDeleteHandlerWithParams<T extends Record<string, string> = Record<string, string>>(
  handler: ApiHandlerWithParams<T>,
  options?: ApiHandlerOptions
) {
  return withApiHandlerWithParams(handler, options)
}

