import { NextRequest, NextResponse } from 'next/server'
import { ProjectCycleManager } from '@/lib/project-cycle-manager'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

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
        throw new ApiError('VALIDATION_ERROR', 'Project ID required', 400)
      }
      await ProjectCycleManager.advanceProjectCycle(projectId)
      return NextResponse.json({ 
        success: true, 
        message: `Project ${projectId} cycle advanced` 
      })

    case 'pause_project':
      if (!projectId) {
        throw new ApiError('VALIDATION_ERROR', 'Project ID required', 400)
      }
      await ProjectCycleManager.pauseProject(projectId)
      return NextResponse.json({ 
        success: true, 
        message: `Project ${projectId} paused` 
      })

    case 'resume_project':
      if (!projectId) {
        throw new ApiError('VALIDATION_ERROR', 'Project ID required', 400)
      }
      await ProjectCycleManager.resumeProject(projectId)
      return NextResponse.json({ 
        success: true, 
        message: `Project ${projectId} resumed` 
      })

    default:
      throw new ApiError('VALIDATION_ERROR', 'Invalid action', 400)
  }
}

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    throw new ApiError('VALIDATION_ERROR', 'Project ID required', 400)
  }

  const stats = await ProjectCycleManager.getProjectCycleStats(projectId)
  
  return NextResponse.json({
    success: true,
    stats
  })
}

export const POST = createPostHandler(postHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/project-cycles' })
export const GET = createGetHandler(getHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/project-cycles' }) 