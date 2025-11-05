import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../supabase/server';
import { hasPermission, isAdminUser } from './rls';
import { Logger, defaultLogger } from '../logger';
import { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Server-side guard utilities for API routes
 * Provides reusable functions to check user permissions and roles
 */

export interface GuardResult {
  user: User;
  supabase: SupabaseClient;
}

/**
 * Require a specific permission for the authenticated user
 * @param permission - The permission to check (e.g., 'manage:rbac', 'view:admin_dashboard')
 * @returns Guard function that can be used in API routes
 */
export function requirePermission(permission: string) {
  return async (request: NextRequest): Promise<GuardResult | NextResponse> => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        defaultLogger.warn('Unauthenticated request to protected endpoint', { 
          path: request.nextUrl.pathname,
          error: authError?.message 
        });
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      const hasRequiredPermission = await hasPermission(user.id, permission);
      
      if (!hasRequiredPermission) {
        defaultLogger.warn('Unauthorized request - missing permission', {
          userId: user.id,
          permission,
          path: request.nextUrl.pathname
        });
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      defaultLogger.debug('Permission check passed', {
        userId: user.id,
        permission,
        path: request.nextUrl.pathname
      });

      return { user, supabase };
    } catch (error) {
      defaultLogger.error('Error in permission guard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permission,
        path: request.nextUrl.pathname
      });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Require any of the specified permissions
 * @param permissions - Array of permissions to check
 * @returns Guard function that passes if user has any of the permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return async (request: NextRequest): Promise<GuardResult | NextResponse> => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        defaultLogger.warn('Unauthenticated request to protected endpoint', { 
          path: request.nextUrl.pathname,
          error: authError?.message 
        });
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check if user has any of the required permissions
      const permissionChecks = await Promise.all(
        permissions.map(permission => hasPermission(user.id, permission))
      );
      
      const hasAnyPermission = permissionChecks.some(hasPermission => hasPermission);
      
      if (!hasAnyPermission) {
        defaultLogger.warn('Unauthorized request - missing any required permission', {
          userId: user.id,
          permissions,
          path: request.nextUrl.pathname
        });
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      defaultLogger.debug('Any permission check passed', {
        userId: user.id,
        permissions,
        path: request.nextUrl.pathname
      });

      return { user, supabase };
    } catch (error) {
      defaultLogger.error('Error in any permission guard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissions,
        path: request.nextUrl.pathname
      });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Require all of the specified permissions
 * @param permissions - Array of permissions to check
 * @returns Guard function that passes if user has all permissions
 */
export function requireAllPermissions(permissions: string[]) {
  return async (request: NextRequest): Promise<GuardResult | NextResponse> => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        defaultLogger.warn('Unauthenticated request to protected endpoint', { 
          path: request.nextUrl.pathname,
          error: authError?.message 
        });
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check if user has all required permissions
      const permissionChecks = await Promise.all(
        permissions.map(permission => hasPermission(user.id, permission))
      );
      
      const hasAllPermissions = permissionChecks.every(hasPermission => hasPermission);
      
      if (!hasAllPermissions) {
        defaultLogger.warn('Unauthorized request - missing required permissions', {
          userId: user.id,
          permissions,
          path: request.nextUrl.pathname
        });
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      defaultLogger.debug('All permissions check passed', {
        userId: user.id,
        permissions,
        path: request.nextUrl.pathname
      });

      return { user, supabase };
    } catch (error) {
      defaultLogger.error('Error in all permissions guard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        permissions,
        path: request.nextUrl.pathname
      });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Require a specific role
 * @param role - The role to check (e.g., 'admin', 'moderator')
 * @returns Guard function that passes if user has the role
 */
export function requireRole(role: string) {
  return async (request: NextRequest): Promise<GuardResult | NextResponse> => {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        defaultLogger.warn('Unauthenticated request to protected endpoint', { 
          path: request.nextUrl.pathname,
          error: authError?.message 
        });
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check if user has the required role
      const { data: userRoles } = await supabase
        .from('rbac_user_role_assignments')
        .select(`
          rbac_roles!inner(name)
        `)
        .eq('user_id', user.id)
        .eq('rbac_roles.name', role);

      const hasRequiredRole = userRoles && userRoles.length > 0;
      
      if (!hasRequiredRole) {
        defaultLogger.warn('Unauthorized request - missing required role', {
          userId: user.id,
          role,
          path: request.nextUrl.pathname
        });
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      defaultLogger.debug('Role check passed', {
        userId: user.id,
        role,
        path: request.nextUrl.pathname
      });

      return { user, supabase };
    } catch (error) {
      defaultLogger.error('Error in role guard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        role,
        path: request.nextUrl.pathname
      });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Require admin role (convenience function)
 * @returns Guard function that passes if user is admin
 */
export function requireAdmin() {
  return requireRole('admin');
}

/**
 * Example usage in API routes:
 * 
 * // In a route handler:
 * export async function GET(request: NextRequest) {
 *   const guardResult = await requirePermission('manage:rbac')(request);
 *   if (guardResult instanceof NextResponse) {
 *     return guardResult; // Error response
 *   }
 *   
 *   const { user, supabase } = guardResult;
 *   // Continue with your logic...
 * }
 */
