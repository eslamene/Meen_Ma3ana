import { db } from './db'
import { createClient } from '@/lib/supabase/server'
import { caseUpdates, users, contributions, contributionApprovalStatus } from '@/drizzle/schema'
import { eq, desc, and, asc, or, like } from 'drizzle-orm'

import { defaultLogger } from '@/lib/logger'

export interface CaseUpdate {
  id: string
  caseId: string
  title: string
  content: string
  updateType: 'progress' | 'milestone' | 'general' | 'emergency'
  isPublic: boolean
  attachments?: string[]
  createdBy: string
  created_at: Date
  updated_at: Date
  createdByUser?: {
    first_name?: string
    last_name?: string
  }
}

export interface CreateCaseUpdateParams {
  caseId: string
  title: string
  content: string
  updateType?: 'progress' | 'milestone' | 'general' | 'emergency'
  isPublic?: boolean
  attachments?: string[]
  createdBy: string
}

export interface UpdateCaseUpdateParams {
  title?: string
  content?: string
  updateType?: 'progress' | 'milestone' | 'general' | 'emergency'
  isPublic?: boolean
  attachments?: string[]
}

export interface CaseUpdateFilters {
  caseId?: string
  updateType?: 'progress' | 'milestone' | 'general' | 'emergency'
  isPublic?: boolean
  createdBy?: string
  limit?: number
  offset?: number
}

export interface UpdateResult {
  success: boolean
  update?: CaseUpdate
  error?: string
}

export interface DeleteResult {
  success: boolean
  error?: string
}

export class CaseUpdateService {
  async createUpdate(params: CreateCaseUpdateParams): Promise<CaseUpdate> {
    const [newUpdate] = await db
      .insert(caseUpdates)
      .values({
        case_id: params.caseId,
        title: params.title,
        content: params.content,
        update_type: params.updateType || 'general',
        is_public: params.isPublic ?? true,
        attachments: params.attachments ? JSON.stringify(params.attachments) : null,
        created_by: params.createdBy,
      })
      .returning()

    return this.mapToCaseUpdate(newUpdate)
  }

  async getUpdates(filters: CaseUpdateFilters = {}): Promise<CaseUpdate[]> {
    let query = db
      .select({
        id: caseUpdates.id,
        caseId: caseUpdates.case_id,
        title: caseUpdates.title,
        content: caseUpdates.content,
        updateType: caseUpdates.update_type,
        isPublic: caseUpdates.is_public,
        attachments: caseUpdates.attachments,
        createdBy: caseUpdates.created_by,
        created_at: caseUpdates.created_at,
        updated_at: caseUpdates.updated_at,
        first_name: users.first_name,
        last_name: users.last_name,
      })
      .from(caseUpdates)
      .leftJoin(users, eq(caseUpdates.created_by, users.id))

    const conditions = []

    if (filters.caseId) {
      conditions.push(eq(caseUpdates.case_id, filters.caseId))
    }

    if (filters.updateType) {
      conditions.push(eq(caseUpdates.update_type, filters.updateType))
    }

    if (filters.isPublic !== undefined) {
      conditions.push(eq(caseUpdates.is_public, filters.isPublic))
    }

    if (filters.createdBy) {
      conditions.push(eq(caseUpdates.created_by, filters.createdBy))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    query = query.orderBy(desc(caseUpdates.created_at))

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.offset(filters.offset)
    }

    const results = await query

    // For contribution-related updates, we need to dynamically check approval status
    const filteredResults = await Promise.all(
      results.map(async (row) => {
        // Check if this is a contribution-related update
        const isContributionUpdate = row.title.includes('Latest Donation') || 
                                   row.title.includes('Donation') ||
                                   row.content.includes('donation') ||
                                   row.content.includes('contributed')
        
        if (isContributionUpdate) {
          // Extract donor email from the content to find the related contribution
          const emailMatch = row.content.match(/[\w.-]+@[\w.-]+\.\w+/)
          if (emailMatch) {
            const donorEmail = emailMatch[0]
            
            // Find the contribution by donor email and check approval status
            const { data: contribution } = await db
              .select({
                id: contributions.id,
                amount: contributions.amount,
                approval_status: contributionApprovalStatus.status
              })
              .from(contributions)
              .leftJoin(contributionApprovalStatus, eq(contributions.id, contributionApprovalStatus.contribution_id))
              .leftJoin(users, eq(contributions.donor_id, users.id))
              .where(eq(users.email, donorEmail))
              .where(eq(contributions.case_id, row.caseId))
              .orderBy(desc(contributions.created_at))
              .limit(1)
            
            // Only include if the contribution is approved
            if (!contribution || contribution.approval_status !== 'approved') {
              return null
            }
          } else {
            // If no email found, check if it's an anonymous donation
            // For anonymous donations, we need to check the most recent anonymous contribution
            const { data: anonymousContribution } = await db
              .select({
                id: contributions.id,
                amount: contributions.amount,
                approval_status: contributionApprovalStatus.status
              })
              .from(contributions)
              .leftJoin(contributionApprovalStatus, eq(contributions.id, contributionApprovalStatus.contribution_id))
              .where(eq(contributions.case_id, row.caseId))
              .where(eq(contributions.anonymous, true))
              .orderBy(desc(contributions.created_at))
              .limit(1)
            
            // Only include if the anonymous contribution is approved
            if (!anonymousContribution || anonymousContribution.approval_status !== 'approved') {
              return null
            }
          }
        }
        
        return row
      })
    )

    return filteredResults
      .filter(Boolean)
      .map((row) => ({
        id: row!.id,
        caseId: row!.caseId,
        title: row!.title,
        content: row!.content,
        updateType: row!.updateType,
        isPublic: row!.isPublic,
        attachments: row!.attachments ? JSON.parse(row!.attachments) : undefined,
        createdBy: row!.createdBy,
        created_at: row!.created_at,
        updated_at: row!.updated_at,
        createdByUser: row!.content.includes('Anonymous Donor') ? {
          first_name: 'Anonymous',
          last_name: 'Donor',
        } : {
          first_name: row!.first_name,
          last_name: row!.last_name,
        },
      }))
  }

  async getUpdateById(id: string): Promise<CaseUpdate | null> {
    const [result] = await db
      .select({
        id: caseUpdates.id,
        caseId: caseUpdates.case_id,
        title: caseUpdates.title,
        content: caseUpdates.content,
        updateType: caseUpdates.update_type,
        isPublic: caseUpdates.is_public,
        attachments: caseUpdates.attachments,
        createdBy: caseUpdates.created_by,
        created_at: caseUpdates.created_at,
        updated_at: caseUpdates.updated_at,
        first_name: users.first_name,
        last_name: users.last_name,
      })
      .from(caseUpdates)
      .leftJoin(users, eq(caseUpdates.created_by, users.id))
      .where(eq(caseUpdates.id, id))

    if (!result) return null

    return {
      id: result.id,
      caseId: result.caseId,
      title: result.title,
      content: result.content,
      updateType: result.updateType,
      isPublic: result.isPublic,
      attachments: result.attachments ? JSON.parse(result.attachments) : undefined,
      createdBy: result.createdBy,
      created_at: result.created_at,
      updated_at: result.updated_at,
      createdByUser: result.createdBy === '00000000-0000-0000-0000-000000000000' ? {
        first_name: 'Anonymous',
        last_name: 'Donor',
      } : {
        first_name: result.first_name,
        last_name: result.last_name,
      },
    }
  }

  /**
   * Get dynamic case updates that include both static updates and dynamic contribution updates
   */
  async getDynamicUpdates(filters: CaseUpdateFilters = {}): Promise<CaseUpdate[]> {
    // Get static updates (non-contribution updates)
    const staticUpdates = await this.getUpdates(filters)
    
    // Get dynamic contribution updates for the case
    if (filters.caseId) {
      const dynamicContributionUpdates = await this.generateContributionUpdates(filters.caseId)
      return [...dynamicContributionUpdates, ...staticUpdates].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    
    return staticUpdates
  }

  /**
   * Clean up old static contribution updates from the database
   * This should be run periodically to remove outdated contribution updates
   */
  async cleanupOldContributionUpdates(): Promise<void> {
    try {
      // Delete old contribution-related updates
      await db
        .delete(caseUpdates)
        .where(
          or(
            like(caseUpdates.title, '%Latest Donation%'),
            like(caseUpdates.title, '%Donation%'),
            like(caseUpdates.content, '%donation%'),
            like(caseUpdates.content, '%contributed%')
          )
        )
      
      defaultLogger.info('Cleaned up old contribution updates')
    } catch (error) {
      defaultLogger.error('Error cleaning up old contribution updates:', error)
    }
  }

  /**
   * Generate dynamic contribution updates based on approved contributions
   */
  private async generateContributionUpdates(caseId: string): Promise<CaseUpdate[]> {
    try {
      // Use Supabase client instead of Drizzle ORM
      const supabase = await createClient()
      
      // Get all approved contributions for this case
      const { data: approvedContributions, error } = await supabase
        .from('contributions')
        .select(`
          id,
          amount,
          created_at,
          anonymous,
          notes,
          users:donor_id(
            first_name,
            last_name,
            email
          ),
          approval_status:contribution_approval_status!contribution_id(status)
        `)
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        defaultLogger.error('Error fetching approved contributions:', error)
        return []
      }

      // Filter to only include approved contributions
      const filteredContributions = approvedContributions?.filter(contribution => {
        const approvalStatus = contribution.approval_status
        return Array.isArray(approvalStatus) && approvalStatus.length > 0 && approvalStatus[0]?.status === 'approved'
      }) || []

      if (filteredContributions.length === 0) {
        return []
      }

      // Generate dynamic updates for each approved contribution
      return filteredContributions.map((contribution) => {
        const donorName = contribution.anonymous 
          ? 'Anonymous Donor' 
          : contribution.users?.first_name && contribution.users?.last_name
            ? `${contribution.users.first_name} ${contribution.users.last_name}`
            : contribution.users?.email || 'Anonymous Donor'

        const donorEmail = contribution.anonymous ? 'anonymous@donor.com' : contribution.users?.email

        return {
          id: `dynamic-${contribution.id}`,
          caseId,
          title: `Latest Donation: EGP ${contribution.amount} Received`,
          content: `Another generous donation of EGP ${contribution.amount} has been received! ${donorEmail} wished to support this cause. Thank you for your kindness!`,
          updateType: 'progress' as const,
          isPublic: true,
          attachments: undefined,
          createdBy: contribution.id, // Use contribution ID as createdBy for dynamic updates
          created_at: contribution.created_at,
          updated_at: contribution.created_at,
          createdByUser: {
            first_name: contribution.anonymous ? 'Anonymous' : contribution.users?.first_name,
            last_name: contribution.anonymous ? 'Donor' : contribution.users?.last_name,
          },
        }
      })
    } catch (error) {
      defaultLogger.error('Error generating contribution updates:', error)
      return []
    }
  }

  async updateUpdate(id: string, params: UpdateCaseUpdateParams): Promise<UpdateResult> {
    try {
      const [updatedUpdate] = await db
        .update(caseUpdates)
        .set({
          title: params.title,
          content: params.content,
          update_type: params.updateType,
          is_public: params.isPublic,
          attachments: params.attachments ? JSON.stringify(params.attachments) : null,
          updated_at: new Date(),
        })
        .where(eq(caseUpdates.id, id))
        .returning()

      if (!updatedUpdate) {
        return { success: false, error: 'Update not found' }
      }

      return { success: true, update: this.mapToCaseUpdate(updatedUpdate) }
    } catch (error) {
      defaultLogger.error('Error updating case update:', error)
      return { success: false, error: 'Failed to update case update' }
    }
  }

  async deleteUpdate(id: string): Promise<DeleteResult> {
    try {
      const [deletedUpdate] = await db
        .delete(caseUpdates)
        .where(eq(caseUpdates.id, id))
        .returning()

      if (!deletedUpdate) {
        return { success: false, error: 'Update not found' }
      }

      return { success: true }
    } catch (error) {
      defaultLogger.error('Error deleting case update:', error)
      return { success: false, error: 'Failed to delete case update' }
    }
  }

  async getPublicUpdates(caseId: string, limit: number = 10): Promise<CaseUpdate[]> {
    const results = await db
      .select({
        id: caseUpdates.id,
        caseId: caseUpdates.case_id,
        title: caseUpdates.title,
        content: caseUpdates.content,
        updateType: caseUpdates.update_type,
        isPublic: caseUpdates.is_public,
        attachments: caseUpdates.attachments,
        createdBy: caseUpdates.created_by,
        created_at: caseUpdates.created_at,
        updated_at: caseUpdates.updated_at,
        first_name: users.first_name,
        last_name: users.last_name,
      })
      .from(caseUpdates)
      .leftJoin(users, eq(caseUpdates.created_by, users.id))
      .where(and(eq(caseUpdates.case_id, caseId), eq(caseUpdates.is_public, true)))
      .orderBy(desc(caseUpdates.created_at))
      .limit(limit)

    return results.map((row) => ({
      id: row.id,
      caseId: row.caseId,
      title: row.title,
      content: row.content,
      updateType: row.updateType,
      isPublic: row.isPublic,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      createdBy: row.createdBy,
      created_at: row.created_at,
      updated_at: row.updated_at,
      createdByUser: row.content.includes('Anonymous Donor') ? {
        first_name: 'Anonymous',
        last_name: 'Donor',
      } : {
        first_name: row.first_name,
        last_name: row.last_name,
      },
    }))
  }

  private mapToCaseUpdate(dbUpdate: any): CaseUpdate {
    return {
      id: dbUpdate.id,
      caseId: dbUpdate.case_id,
      title: dbUpdate.title,
      content: dbUpdate.content,
      updateType: dbUpdate.update_type,
      isPublic: dbUpdate.is_public,
      attachments: dbUpdate.attachments ? JSON.parse(dbUpdate.attachments) : undefined,
      createdBy: dbUpdate.created_by,
      created_at: dbUpdate.created_at,
      updated_at: dbUpdate.updated_at,
    }
  }
}

export const caseUpdateService = new CaseUpdateService() 