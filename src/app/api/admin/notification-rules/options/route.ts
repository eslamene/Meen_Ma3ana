import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

/**
 * Get available options for notification rule conditions
 * Returns dynamic values from the database using Supabase client
 */
async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  try {
    // Get distinct statuses from cases
    const { data: statusesData, error: statusesError } = await supabase
      .from('cases')
      .select('status')
      .not('status', 'is', null)

    // Get distinct priorities from cases
    const { data: prioritiesData, error: prioritiesError } = await supabase
      .from('cases')
      .select('priority')
      .not('priority', 'is', null)

    // Get distinct types from cases
    const { data: typesData, error: typesError } = await supabase
      .from('cases')
      .select('type')
      .not('type', 'is', null)

    // Get categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('case_categories')
      .select('id, name')
      .eq('is_active', true)

    // Get user roles (from users table)
    const { data: rolesData, error: rolesError } = await supabase
      .from('users')
      .select('role')
      .not('role', 'is', null)

    // Extract unique values and handle errors
    const statuses = statusesError
      ? []
      : [...new Set((statusesData || []).map((c: any) => c.status).filter(Boolean))].sort()

    const priorities = prioritiesError
      ? []
      : [...new Set((prioritiesData || []).map((c: any) => c.priority).filter(Boolean))].sort()

    const types = typesError
      ? []
      : [...new Set((typesData || []).map((c: any) => c.type).filter(Boolean))].sort()

    const categories = categoriesError
      ? []
      : (categoriesData || []).map((c: any) => ({
          id: c.id,
          name: c.name,
        }))

    const roles = rolesError
      ? []
      : [...new Set((rolesData || []).map((u: any) => u.role).filter(Boolean))].sort()

    return NextResponse.json({
      statuses,
      priorities,
      types,
      categories,
      roles,
      fieldTypes: [
        { value: 'status', label: 'Status' },
        { value: 'priority', label: 'Priority' },
        { value: 'type', label: 'Type' },
        { value: 'category', label: 'Category' },
        { value: 'activity', label: 'Activity' },
        { value: 'custom', label: 'Custom Field' },
      ],
      operators: [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
        { value: 'in', label: 'Is One Of' },
        { value: 'not_in', label: 'Is Not One Of' },
        { value: 'changed', label: 'Changed (Any)' },
        { value: 'changed_from', label: 'Changed From' },
        { value: 'changed_to', label: 'Changed To' },
      ],
      events: [
        { value: 'field_changed', label: 'Field Changed' },
        { value: 'case_created', label: 'Case Created' },
        { value: 'case_updated', label: 'Case Updated' },
        { value: 'activity_created', label: 'Activity Created' },
        { value: 'custom', label: 'Custom Event' },
      ],
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching notification rule options:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to load notification rule options', 500)
  }
}

export const GET = createGetHandler(getHandler, {
  requireAuth: true,
  requirePermissions: ['admin:settings'],
  loggerContext: 'api/admin/notification-rules/options',
})

