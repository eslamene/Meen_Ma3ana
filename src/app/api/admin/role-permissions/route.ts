import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('roleId')

    if (!roleId) {
      return NextResponse.json({ error: 'Role ID required' }, { status: 400 })
    }

    logger.info('Fetching permissions for role:', roleId)

    // Create admin client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch role with permissions
    const { data: role, error: roleError } = await adminClient
      .from('roles')
      .select(`
        *,
        role_permissions(
          permissions(*)
        )
      `)
      .eq('id', roleId)
      .single()

    if (roleError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching role:', roleError)
      throw roleError
    }

    logger.info('Role fetched successfully:', role.name)
    logger.info('Permissions count:', role.role_permissions?.length || 0)

    return NextResponse.json({
      success: true,
      role: role
    })

  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Role permissions API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch role permissions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
