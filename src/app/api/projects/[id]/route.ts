import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, projectCycles } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(
  request: NextRequest,
  {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id

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
      .where(eq(projectCycles.projectId, projectId))
      .orderBy(asc(projectCycles.cycleNumber))

    // Transform the data to match the frontend interface
    const transformedProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      category: project.category,
      targetAmount: project.targetAmount,
      currentAmount: project.currentAmount,
      status: project.status,
      cycleDuration: project.cycleDuration,
      cycleDurationDays: project.cycleDurationDays,
      currentCycleNumber: project.currentCycleNumber,
      totalCycles: project.totalCycles,
      nextCycleDate: project.nextCycleDate?.toISOString(),
      lastCycleDate: project.lastCycleDate?.toISOString(),
      autoProgress: project.autoProgress,
      createdBy: project.createdBy,
      createdAt: project.createdAt.toISOString(),
      cycles: cyclesData.map(cycle => ({
        id: cycle.id,
        cycleNumber: cycle.cycleNumber,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        targetAmount: cycle.targetAmount,
        currentAmount: cycle.currentAmount,
        status: cycle.status,
        progressPercentage: cycle.progressPercentage,
        notes: cycle.notes,
        completedAt: cycle.completedAt?.toISOString(),
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
  {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id
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
    if (existingProject[0].createdBy !== user.id) {
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
        targetAmount: body.targetAmount?.toString(),
        status: body.status,
        cycleDuration: body.cycleDuration,
        cycleDurationDays: body.cycleDurationDays,
        totalCycles: body.totalCycles,
        autoProgress: body.autoProgress,
        updatedAt: new Date(),
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
  {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
 params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id

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
    if (existingProject[0].createdBy !== user.id) {
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