import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ProjectCycleManager } from '@/lib/project-cycle-manager'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, projectId } = body

    switch (action) {
      case 'check_and_advance':
        await ProjectCycleManager.checkAndAdvanceCycles()
        return NextResponse.json({ 
          success: true, 
          message: 'Cycle advancement check completed' 
        })

      case 'advance_project':
        if (!projectId) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
        }
        await ProjectCycleManager.advanceProjectCycle(projectId)
        return NextResponse.json({ 
          success: true, 
          message: `Project ${projectId} cycle advanced` 
        })

      case 'pause_project':
        if (!projectId) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
        }
        await ProjectCycleManager.pauseProject(projectId)
        return NextResponse.json({ 
          success: true, 
          message: `Project ${projectId} paused` 
        })

      case 'resume_project':
        if (!projectId) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
        }
        await ProjectCycleManager.resumeProject(projectId)
        return NextResponse.json({ 
          success: true, 
          message: `Project ${projectId} resumed` 
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in project cycle management:', error)
    return NextResponse.json(
      { error: 'Failed to process cycle management request' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const stats = await ProjectCycleManager.getProjectCycleStats(projectId)
    
    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error getting project cycle stats:', error)
    return NextResponse.json(
      { error: 'Failed to get project cycle statistics' },
      { status: 500 }
    )
  }
} 