import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/config/env'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { ProjectService } from '@/lib/services/projectService'

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context

    const body = await request.json()
    const {
      name,
      description,
      category,
      targetAmount,
      cycleDuration,
      cycleDurationDays,
      totalCycles,
      autoProgress,
    } = body

    // Validate required fields
    if (!name || !description || !category || !targetAmount || !cycleDuration) {
      throw new ApiError('VALIDATION_ERROR', 'Missing required fields', 400)
    }

    // Calculate cycle duration in days
    let durationDays = 30 // default to monthly
    if (cycleDuration === 'custom' && cycleDurationDays) {
      durationDays = parseInt(cycleDurationDays)
    } else {
      switch (cycleDuration) {
        case 'weekly':
          durationDays = 7
          break
        case 'monthly':
          durationDays = 30
          break
        case 'quarterly':
          durationDays = 90
          break
        case 'yearly':
          durationDays = 365
          break
      }
    }

    let project: Record<string, unknown>
    try {
      const result = await ProjectService.createWithFirstCycle(supabase, {
        name,
        description,
        category,
        targetAmount,
        cycleDuration,
        cycleDurationDays,
        totalCycles: totalCycles ? parseInt(String(totalCycles), 10) : null,
        autoProgress,
        createdBy: user.id,
        durationDays,
      })
      project = result.project
    } catch (e) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating project:', e)
      if (e instanceof Error && e.message.includes('SASL')) {
        throw new ApiError(
          'CONFIGURATION_ERROR',
          'Database authentication error. Please check your Supabase configuration.',
          500
        )
      }
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create project', 500)
    }

    return NextResponse.json(project)
}

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger } = context

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    logger.error('Missing Supabase environment variables')
    throw new ApiError('CONFIGURATION_ERROR', 'Server configuration error', 500)
  }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let projectList: Awaited<ReturnType<typeof ProjectService.list>>
    try {
      projectList = await ProjectService.list(supabase, { status, category, limit, offset })
    } catch (e) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching projects:', e)
      const err = e as { code?: string }
      if (err.code === 'SASL_SIGNATURE_MISMATCH') {
        throw new ApiError(
          'CONFIGURATION_ERROR',
          'Database authentication error. Please check your Supabase configuration.',
          500
        )
      }
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch projects', 500)
    }

    return NextResponse.json({
      projects: projectList || [],
      pagination: {
        limit,
        offset,
        total: projectList?.length || 0,
      },
    })
}

export const GET = createGetHandler(getHandler, { requireAuth: true, loggerContext: 'api/projects' })
export const POST = createPostHandler(postHandler, { requireAuth: true, loggerContext: 'api/projects' }) 