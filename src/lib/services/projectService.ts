/**
 * Projects table operations (server-side API).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface ProjectListParams {
  status?: string | null
  category?: string | null
  limit?: number
  offset?: number
}

export class ProjectService {
  static async list(supabase: SupabaseClient, params: ProjectListParams = {}) {
    const { status, category, limit = 50, offset = 0 } = params

    let query = supabase.from('projects').select('*').order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (category) query = query.eq('category', category)

    query = query.range(offset, offset + limit - 1)

    const { data: projectList, error } = await query

    if (error) {
      defaultLogger.error('Error fetching projects:', error)
      throw new Error(`Failed to fetch projects: ${error.message}`)
    }

    return projectList || []
  }

  static async createWithFirstCycle(
    supabase: SupabaseClient,
    input: {
      name: string
      description: string
      category: string
      targetAmount: number
      cycleDuration: string
      cycleDurationDays?: number
      totalCycles?: number | null
      autoProgress?: boolean
      createdBy: string
      durationDays: number
    }
  ): Promise<{ project: Record<string, unknown> }> {
    const {
      name,
      description,
      category,
      targetAmount,
      cycleDuration,
      totalCycles,
      autoProgress,
      createdBy,
      durationDays,
    } = input

    const nextCycleDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()

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
        total_cycles: totalCycles != null ? parseInt(String(totalCycles), 10) : null,
        current_cycle_number: 1,
        auto_progress: autoProgress,
        created_by: createdBy,
        next_cycle_date: nextCycleDate,
      })
      .select()
      .single()

    if (projectError || !project) {
      defaultLogger.error('Error creating project:', projectError)
      throw new Error(`Failed to create project: ${projectError?.message || 'unknown'}`)
    }

    const startDate = new Date()
    const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)

    const { error: cycleError } = await supabase.from('project_cycles').insert({
      project_id: (project as { id: string }).id,
      cycle_number: 1,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      target_amount: targetAmount.toString(),
      current_amount: '0',
      status: 'active',
      progress_percentage: '0',
    })

    if (cycleError) {
      defaultLogger.error('Error creating project cycle:', cycleError)
    }

    return { project: project as Record<string, unknown> }
  }
}
