import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, projectCycles } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'
import { RouteContext } from '@/types/next-api'
import { createGetHandlerWithParams, createPutHandlerWithParams, createDeleteHandlerWithParams, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params

    const projectId = id

    // Fetch project with cycles
    const projectData = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (projectData.length === 0) {
      throw new ApiError('NOT_FOUND', 'Project not found', 404)
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
}

async function putHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params

    const projectId = id
    const body = await request.json()

    // Check if project exists and user has permission to edit
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (existingProject.length === 0) {
      throw new ApiError('NOT_FOUND', 'Project not found', 404)
    }

    // Only project creator or admin can edit
    if (existingProject[0].created_by !== user.id) {
      // Check if user is admin
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user?.user_metadata?.role !== 'admin') {
        throw new ApiError('FORBIDDEN', 'Forbidden', 403)
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
}

async function deleteHandler(
  request: NextRequest,
  context: ApiHandlerContext,
  params: { id: string }
) {
  const { supabase, logger, user } = context
  const { id } = params

    const projectId = id

    // Check if project exists and user has permission to delete
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (existingProject.length === 0) {
      throw new ApiError('NOT_FOUND', 'Project not found', 404)
    }

    // Only project creator or admin can delete
    if (existingProject[0].created_by !== user.id) {
      // Check if user is admin
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user?.user_metadata?.role !== 'admin') {
        throw new ApiError('FORBIDDEN', 'Forbidden', 403)
      }
    }

    // Delete project (this will cascade to cycles due to foreign key constraints)
    await db.delete(projects).where(eq(projects.id, projectId))

    return NextResponse.json({ success: true })
}

export const GET = createGetHandlerWithParams<{ id: string }>(getHandler, { requireAuth: true, loggerContext: 'api/projects/[id]' })
export const PUT = createPutHandlerWithParams<{ id: string }>(putHandler, { requireAuth: true, loggerContext: 'api/projects/[id]' })
export const DELETE = createDeleteHandlerWithParams<{ id: string }>(deleteHandler, { requireAuth: true, loggerContext: 'api/projects/[id]' }) 