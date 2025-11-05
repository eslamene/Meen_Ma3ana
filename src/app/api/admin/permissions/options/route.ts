import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        data: {
          resources: ['admin', 'cases', 'contributions', 'users', 'profile'],
          actions: ['create', 'read', 'update', 'delete', 'manage']
        }
      }, { status: 401 })
    }

    // Get all permissions to extract unique resources and actions
    const { data: permissions, error } = await supabase
      .from('permissions')
      .select('resource, action')

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Database error:', error)
      throw error
    }

    if (!permissions) {
      throw new Error('No permissions data returned')
    }

    // Extract unique resources and actions
    const resources = [...new Set(permissions.map(p => p.resource).filter(Boolean))].sort()
    const actions = [...new Set(permissions.map(p => p.action).filter(Boolean))].sort()

    // Add common/default options that might not exist yet but are commonly used
    const defaultResources = [
      'admin', 'cases', 'contributions', 'users', 'profile', 'notifications', 
      'reports', 'files', 'payments', 'analytics', 'settings', 'content', 
      'stats', 'rbac', 'messages'
    ]
    
    const defaultActions = [
      'create', 'read', 'update', 'delete', 'manage', 'approve', 'publish', 
      'view', 'export', 'import', 'archive', 'process', 'refund', 'upload',
      'view_public', 'dashboard', 'analytics'
    ]

    // Merge existing with defaults and deduplicate
    const allResources = [...new Set([...resources, ...defaultResources])].sort()
    const allActions = [...new Set([...actions, ...defaultActions])].sort()

    return NextResponse.json({
      success: true,
      data: {
        resources: allResources,
        actions: allActions,
        existing: {
          resources: resources.length,
          actions: actions.length
        },
        total: {
          resources: allResources.length,
          actions: allActions.length
        }
      }
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching permission options:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch permission options',
      data: {
        // Fallback options
        resources: ['admin', 'cases', 'contributions', 'users', 'profile'],
        actions: ['create', 'read', 'update', 'delete', 'manage']
      }
    }, { status: 500 })
  }
}
