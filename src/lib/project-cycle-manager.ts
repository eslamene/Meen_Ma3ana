import { db } from '@/lib/db'
import { projects, projectCycles } from '@/lib/db'
import { eq, and, lte, gte } from 'drizzle-orm'

import { defaultLogger } from '@/lib/logger'

export class ProjectCycleManager {
  /**
   * Check and advance cycles for all active projects
   */
  static async checkAndAdvanceCycles() {
    try {
      const now = new Date()
      
      // Get all active projects that have auto-progress enabled
      const activeProjects = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.status, 'active'),
            eq(projects.auto_progress, true),
            lte(projects.next_cycle_date, now)
          )
        )

      for (const project of activeProjects) {
        await this.advanceProjectCycle(project.id)
      }

      defaultLogger.info(`Processed ${activeProjects.length} projects for cycle advancement`)
    } catch (error) {
      defaultLogger.error('Error checking and advancing cycles:', error)
      throw error
    }
  }

  /**
   * Advance a specific project to the next cycle
   */
  static async advanceProjectCycle(projectId: string) {
    try {
      // Get the current project
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))

      if (!project) {
        throw new Error(`Project ${projectId} not found`)
      }

      // Check if project has reached total cycles limit
      if (project.total_cycles && project.current_cycle_number >= project.total_cycles) {
        // Mark project as completed
        await db
          .update(projects)
          .set({
            status: 'completed',
            updated_at: new Date(),
          })
          .where(eq(projects.id, projectId))

        defaultLogger.info(`Project ${projectId} completed all cycles`)
        return
      }

      // Get the current active cycle
      const [currentCycle] = await db
        .select()
        .from(projectCycles)
        .where(
          and(
            eq(projectCycles.project_id, projectId),
            eq(projectCycles.status, 'active')
          )
        )

      if (currentCycle) {
        // Complete the current cycle
        await db
          .update(projectCycles)
          .set({
            status: 'completed',
            completed_at: new Date(),
            updated_at: new Date(),
          })
          .where(eq(projectCycles.id, currentCycle.id))
      }

      // Calculate next cycle dates
      const cycleDurationMs = (project.cycle_duration_days || 30) * 24 * 60 * 60 * 1000
      const nextCycleStart = new Date(project.next_cycle_date || new Date())
      const nextCycleEnd = new Date(nextCycleStart.getTime() + cycleDurationMs)

      // Create the next cycle
      const nextCycleNumber = project.current_cycle_number + 1
      
      await db.insert(projectCycles).values({
        project_id: projectId,
        cycle_number: nextCycleNumber,
        start_date: nextCycleStart,
        end_date: nextCycleEnd,
        target_amount: project.target_amount,
        current_amount: '0',
        status: 'active',
        progress_percentage: '0',
      })

      // Update project with new cycle information
      const nextCycleDate = new Date(nextCycleEnd.getTime() + cycleDurationMs)
      
      await db
        .update(projects)
        .set({
          current_cycle_number: nextCycleNumber,
          next_cycle_date: nextCycleDate,
          last_cycle_date: project.next_cycle_date,
          updated_at: new Date(),
        })
        .where(eq(projects.id, projectId))

      defaultLogger.info(`Advanced project ${projectId} to cycle ${nextCycleNumber}`)
    } catch (error) {
      defaultLogger.error(`Error advancing cycle for project ${projectId}:`, error)
      throw error
    }
  }

  /**
   * Update cycle progress based on contributions
   */
  static async updateCycleProgress(cycleId: string) {
    try {
      // Get the cycle
      const [cycle] = await db
        .select()
        .from(projectCycles)
        .where(eq(projectCycles.id, cycleId))

      if (!cycle) {
        throw new Error(`Cycle ${cycleId} not found`)
      }

      // Calculate progress percentage
      const currentAmount = parseFloat(cycle.current_amount)
      const targetAmount = parseFloat(cycle.target_amount)
      const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0

      // Update cycle progress
      await db
        .update(projectCycles)
        .set({
          progress_percentage: progressPercentage.toString(),
          updated_at: new Date(),
        })
        .where(eq(projectCycles.id, cycleId))

      // Update project total amount
      await this.updateProjectTotalAmount(cycle.project_id)
    } catch (error) {
      defaultLogger.error(`Error updating cycle progress for cycle ${cycleId}:`, error)
      throw error
    }
  }

  /**
   * Update project total amount based on all cycles
   */
  static async updateProjectTotalAmount(projectId: string) {
    try {
      // Get all cycles for the project
      const cycles = await db
        .select()
        .from(projectCycles)
        .where(eq(projectCycles.project_id, projectId))

      // Calculate total current amount
      const totalAmount = cycles.reduce((sum, cycle) => {
        return sum + parseFloat(cycle.current_amount)
      }, 0)

      // Update project
      await db
        .update(projects)
        .set({
          current_amount: totalAmount.toString(),
          updated_at: new Date(),
        })
        .where(eq(projects.id, projectId))
    } catch (error) {
      defaultLogger.error(`Error updating project total amount for project ${projectId}:`, error)
      throw error
    }
  }

  /**
   * Pause a project (stop auto-progression)
   */
  static async pauseProject(projectId: string) {
    try {
      await db
        .update(projects)
        .set({
          status: 'paused',
          auto_progress: false,
          updated_at: new Date(),
        })
        .where(eq(projects.id, projectId))

      defaultLogger.info(`Project ${projectId} paused`)
    } catch (error) {
      defaultLogger.error(`Error pausing project ${projectId}:`, error)
      throw error
    }
  }

  /**
   * Resume a project (enable auto-progression)
   */
  static async resumeProject(projectId: string) {
    try {
      await db
        .update(projects)
        .set({
          status: 'active',
          auto_progress: true,
          updated_at: new Date(),
        })
        .where(eq(projects.id, projectId))

      defaultLogger.info(`Project ${projectId} resumed`)
    } catch (error) {
      defaultLogger.error(`Error resuming project ${projectId}:`, error)
      throw error
    }
  }

  /**
   * Get project cycle statistics
   */
  static async getProjectCycleStats(projectId: string) {
    try {
      const cycles = await db
        .select()
        .from(projectCycles)
        .where(eq(projectCycles.project_id, projectId))

      const totalCycles = cycles.length
      const completedCycles = cycles.filter(c => c.status === 'completed').length
      const activeCycles = cycles.filter(c => c.status === 'active').length
      const totalRaised = cycles.reduce((sum, cycle) => {
        return sum + parseFloat(cycle.current_amount)
      }, 0)

      return {
        totalCycles,
        completedCycles,
        activeCycles,
        totalRaised,
      }
    } catch (error) {
      defaultLogger.error(`Error getting cycle stats for project ${projectId}:`, error)
      throw error
    }
  }
} 