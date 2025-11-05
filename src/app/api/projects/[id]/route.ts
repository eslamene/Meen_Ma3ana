import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, projectCycles } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { RouteContext } from '@/types/next-api'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const { id } = await context.params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = id

    // Fetch project with cycles
    const projectData = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (projectData.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = projectData[0]

    // Fetch all cycles for this project
    const cyclesData = await db
      .select()
      .from(projectCycles)
      .where(eq(projectCycles.project_id, projectId))
      .orderBy(asc(projectCycles.cycle_number))

    // Transform the data to match the frontend interface
    const transformedProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      category: project.category,
      targetAmount: project.target_amount,
      currentAmount: project.current_amount,
      status: project.status,
      cycleDuration: project.cycle_duration,
      cycleDurationDays: project.cycle_duration_days,
      currentCycleNumber: project.current_cycle_number,
      totalCycles: project.total_cycles,
      nextCycleDate: project.next_cycle_date?.toISOString(),
      lastCycleDate: project.last_cycle_date?.toISOString(),
      autoProgress: project.auto_progress,
      createdBy: project.created_by,
      createdAt: project.created_at.toISOString(),
      cycles: cyclesData.map(cycle => ({
        id: cycle.id,
        cycleNumber: cycle.cycle_number,
        startDate: cycle.start_date.toISOString(),
        endDate: cycle.end_date.toISOString(),
        targetAmount: cycle.target_amount,
        currentAmount: cycle.current_amount,
        status: cycle.status,
        progressPercentage: cycle.progress_percentage,
        notes: cycle.notes,
        completedAt: cycle.completed_at?.toISOString(),
      })),
    }

    return NextResponse.json(transformedProject)
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const { id } = await context.params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = id
    const body = await request.json()

    // Check if project exists and user has permission to edit
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (existingProject.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Only project creator or admin can edit
    if (existingProject[0].created_by !== user.id) {
      // Check if user is admin
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user?.user_metadata?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Update project
    const [updatedProject] = await db
      .update(projects)
      .set({
        name: body.name,
        description: body.description,
        category: body.category,
        target_amount: body.targetAmount?.toString(),
        status: body.status,
        cycle_duration: body.cycleDuration,
        cycle_duration_days: body.cycleDurationDays,
        total_cycles: body.totalCycles,
        auto_progress: body.autoProgress,
        updated_at: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning()

    return NextResponse.json(updatedProject)
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  try {
    const { id } = await context.params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = id

    // Check if project exists and user has permission to delete
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (existingProject.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Only project creator or admin can delete
    if (existingProject[0].created_by !== user.id) {
      // Check if user is admin
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user?.user_metadata?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Delete project (this will cascade to cycles due to foreign key constraints)
    await db.delete(projects).where(eq(projects.id, projectId))

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
} 