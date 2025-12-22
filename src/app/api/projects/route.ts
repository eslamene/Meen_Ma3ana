import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, projectCycles } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { env } from '@/config/env'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

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

    // Create project using Supabase client
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        category,
        target_amount: targetAmount.toString(),
        current_amount: '0',
        status: 'active',
        cycle_duration: cycleDuration,
        cycle_duration_days: durationDays,
        total_cycles: totalCycles ? parseInt(totalCycles) : null,
        current_cycle_number: 1,
        auto_progress: autoProgress,
        created_by: user.id,
        next_cycle_date: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (projectError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating project:', projectError)
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create project', 500)
    }

    // Create first cycle
    const startDate = new Date()
    const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
    
    const { error: cycleError } = await supabase
      .from('project_cycles')
      .insert({
        project_id: project.id,
        cycle_number: 1,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        target_amount: targetAmount.toString(),
        current_amount: '0',
        status: 'active',
        progress_percentage: '0',
      })

    if (cycleError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating project cycle:', cycleError)
      // Don't fail the request if cycle creation fails
    }

    return NextResponse.json(project)
}

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { supabase, logger, user } = context
  
  // Check if Supabase environment variables are set
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    logger.error('Missing Supabase environment variables')
    throw new ApiError('CONFIGURATION_ERROR', 'Server configuration error', 500)
  }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query using Supabase client instead of Drizzle
    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.eq('category', category)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: projectList, error } = await query

    if (error) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching projects:', error)
      
      // Handle specific database connection errors
      if (error.code === 'SASL_SIGNATURE_MISMATCH') {
        throw new ApiError('CONFIGURATION_ERROR', 'Database authentication error. Please check your Supabase configuration.', 500)
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