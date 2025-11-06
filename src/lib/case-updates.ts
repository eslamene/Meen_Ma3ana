import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'
import { caseUpdates, users, contributions, contributionApprovalStatus } from '@/drizzle/schema'
import { eq, desc, and, asc, or, like, sql } from 'drizzle-orm'

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

// Type for database row structure (snake_case fields)
interface CaseUpdateRow {
  id: string
  case_id: string
  title: string
  content: string
  update_type: 'progress' | 'milestone' | 'general' | 'emergency'
  is_public: boolean
  attachments: string | null
  created_by: string
  created_at: Date
  updated_at: Date
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
    const conditions: ReturnType<typeof eq>[] = []

    if (filters.caseId) {
      conditions.push(eq(caseUpdates.case_id, filters.caseId as string))
    }

    if (filters.updateType) {
      conditions.push(eq(caseUpdates.update_type, filters.updateType as 'progress' | 'milestone' | 'general' | 'emergency'))
    }

    if (filters.isPublic !== undefined) {
      conditions.push(eq(caseUpdates.is_public, filters.isPublic as boolean))
    }

    if (filters.createdBy) {
      conditions.push(eq(caseUpdates.created_by, filters.createdBy as string))
    }

    // Build query with where clause - always required for leftJoin
    const whereCondition = conditions.length > 0 
      ? and(...conditions) 
      : sql`1 = 1`
    
    const query = db
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
      .where(whereCondition)
      .orderBy(desc(caseUpdates.created_at))

    // Apply limit and offset if provided
    const finalQuery = filters.limit 
      ? (filters.offset ? query.limit(filters.limit).offset(filters.offset) : query.limit(filters.limit))
      : (filters.offset ? query.offset(filters.offset) : query)

    const results = await finalQuery

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
            const contributionResults = await db
              .select({
                id: contributions.id,
                amount: contributions.amount,
                approval_status: contributionApprovalStatus.status
              })
              .from(contributions)
              .leftJoin(contributionApprovalStatus, eq(contributions.id, contributionApprovalStatus.contribution_id))
              .leftJoin(users, eq(contributions.donor_id, users.id))
              .where(and(
                eq(users.email, donorEmail),
                eq(contributions.case_id, row.caseId)
              ))
              .orderBy(desc(contributions.created_at))
              .limit(1)
            
            const contribution = contributionResults[0] || null
            
            // Only include if the contribution is approved
            if (!contribution || contribution.approval_status !== 'approved') {
              return null
            }
          } else {
            // If no email found, check if it's an anonymous donation
            // For anonymous donations, we need to check the most recent anonymous contribution
            const anonymousContributionResults = await db
              .select({
                id: contributions.id,
                amount: contributions.amount,
                approval_status: contributionApprovalStatus.status
              })
              .from(contributions)
              .leftJoin(contributionApprovalStatus, eq(contributions.id, contributionApprovalStatus.contribution_id))
              .where(and(
                eq(contributions.case_id, row.caseId),
                eq(contributions.anonymous, true)
              ))
              .orderBy(desc(contributions.created_at))
              .limit(1)
            
            const anonymousContribution = anonymousContributionResults[0] || null
            
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
          first_name: row!.first_name ?? undefined,
          last_name: row!.last_name ?? undefined
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
        first_name: result.first_name ?? undefined,
        last_name: result.last_name ?? undefined,
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
        const user = Array.isArray(contribution.users) ? contribution.users[0] : contribution.users
        const donorName = contribution.anonymous 
          ? 'Anonymous Donor' 
          : user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : user?.email || 'Anonymous Donor'

        const donorEmail = contribution.anonymous ? 'anonymous@donor.com' : user?.email

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
            first_name: contribution.anonymous ? 'Anonymous' : user?.first_name ?? undefined,
            last_name: contribution.anonymous ? 'Donor' : user?.last_name ?? undefined,
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
        first_name: row.first_name ?? undefined,
        last_name: row.last_name ?? undefined,
      },
    }))
  }

  private mapToCaseUpdate(dbUpdate: CaseUpdateRow): CaseUpdate {
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