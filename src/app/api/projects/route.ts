import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, projectCycles } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

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
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      )
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
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    // Check if Supabase environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      logger.error('Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
        return NextResponse.json(
          { error: 'Database authentication error. Please check your Supabase configuration.' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      projects: projectList || [],
      pagination: {
        limit,
        offset,
        total: projectList?.length || 0,
      },
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
} 