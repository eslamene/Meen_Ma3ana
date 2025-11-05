import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

import { defaultLogger } from '@/lib/logger'

export interface CaseProgressUpdate {
  caseId: string
  currentAmount: number
  targetAmount: number
  progressPercentage: number
  lastContribution?: {
    amount: number
    donorName: string
    timestamp: string
  }
}

export interface CaseUpdateNotification {
  id: string
  caseId: string
  title: string
  content: string
  updateType: 'progress' | 'milestone' | 'general' | 'emergency'
  createdAt: string
  createdBy: string
  createdByUser?: {
    firstName?: string
    lastName?: string
  }
}

export class RealtimeCaseUpdates {
  private supabase = createClient()
  private channels: Map<string, RealtimeChannel> = new Map()

  /**
   * Subscribe to case progress updates
   */
  subscribeToCaseProgress(
    caseId: string,
    onProgressUpdate: (update: CaseProgressUpdate) => void,
    onError?: (error: any) => void
  ) {
    const channelKey = `case-progress-${caseId}`
    
    if (this.channels.has(channelKey)) {
      return () => this.unsubscribeFromCaseProgress(caseId)
    }

    const channel = this.supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cases',
          filter: `id=eq.${caseId}`
        },
        (payload) => {
          const caseData = payload.new as any
          const update: CaseProgressUpdate = {
            caseId: caseData.id,
            currentAmount: parseFloat(caseData.current_amount || 0),
            targetAmount: parseFloat(caseData.target_amount || 0),
            progressPercentage: caseData.target_amount > 0 
              ? (parseFloat(caseData.current_amount || 0) / parseFloat(caseData.target_amount)) * 100 
              : 0
          }
          onProgressUpdate(update)
        }
      )

    this.channels.set(channelKey, channel)
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        const err = new Error('Realtime channel error')
        defaultLogger.error('Realtime case progress error:', err)
        onError?.(err)
      }
    })

    return () => this.unsubscribeFromCaseProgress(caseId)
  }

  /**
   * Subscribe to case updates (timeline)
   */
  subscribeToCaseUpdates(
    caseId: string,
    onUpdateCreated: (update: CaseUpdateNotification) => void,
    onUpdateUpdated?: (update: CaseUpdateNotification) => void,
    onUpdateDeleted?: (updateId: string) => void,
    onError?: (error: any) => void
  ) {
    const channelKey = `case-updates-${caseId}`
    
    if (this.channels.has(channelKey)) {
      return () => this.unsubscribeFromCaseUpdates(caseId)
    }

    const channel = this.supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'case_updates',
          filter: `case_id=eq.${caseId}`
        },
        (payload) => {
          const updateData = payload.new as any
          const update: CaseUpdateNotification = {
            id: updateData.id,
            caseId: updateData.case_id,
            title: updateData.title,
            content: updateData.content,
            updateType: updateData.update_type,
            createdAt: updateData.created_at,
            createdBy: updateData.created_by
          }
          onUpdateCreated(update)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'case_updates',
          filter: `case_id=eq.${caseId}`
        },
        (payload) => {
          const updateData = payload.new as any
          const update: CaseUpdateNotification = {
            id: updateData.id,
            caseId: updateData.case_id,
            title: updateData.title,
            content: updateData.content,
            updateType: updateData.update_type,
            createdAt: updateData.created_at,
            createdBy: updateData.created_by
          }
          onUpdateUpdated?.(update)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'case_updates',
          filter: `case_id=eq.${caseId}`
        },
        (payload) => {
          const updateData = payload.old as any
          onUpdateDeleted?.(updateData.id)
        }
      )

    this.channels.set(channelKey, channel)
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        const err = new Error('Realtime channel error')
        defaultLogger.error('Realtime case updates error:', err)
        onError?.(err)
      }
    })

    return () => this.unsubscribeFromCaseUpdates(caseId)
  }

  /**
   * Subscribe to contributions for a case
   */
  subscribeToCaseContributions(
    caseId: string,
    onContributionAdded: (contribution: any) => void,
    onContributionUpdated?: (contribution: any) => void,
    onError?: (error: any) => void
  ) {
    const channelKey = `case-contributions-${caseId}`
    
    if (this.channels.has(channelKey)) {
      return () => this.unsubscribeFromCaseContributions(caseId)
    }

    const channel = this.supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contributions',
          filter: `case_id=eq.${caseId}`
        },
        (payload) => {
          onContributionAdded(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contributions',
          filter: `case_id=eq.${caseId}`
        },
        (payload) => {
          onContributionUpdated?.(payload.new)
        }
      )

    this.channels.set(channelKey, channel)
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        const err = new Error('Realtime case update changes error')
        defaultLogger.error('Realtime case update changes error:', err)
        onError?.(err)
      }
    })

    return () => this.unsubscribeFromCaseContributions(caseId)
  }

  /**
   * Unsubscribe from case progress updates
   */
  unsubscribeFromCaseProgress(caseId: string) {
    const channelKey = `case-progress-${caseId}`
    const channel = this.channels.get(channelKey)
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(channelKey)
    }
  }

  /**
   * Unsubscribe from case updates
   */
  unsubscribeFromCaseUpdates(caseId: string) {
    const channelKey = `case-updates-${caseId}`
    const channel = this.channels.get(channelKey)
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(channelKey)
    }
  }

  /**
   * Unsubscribe from case contributions
   */
  unsubscribeFromCaseContributions(caseId: string) {
    const channelKey = `case-contributions-${caseId}`
    const channel = this.channels.get(channelKey)
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(channelKey)
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      channel.unsubscribe()
    })
    this.channels.clear()
  }

  /**
   * Get current case progress
   */
  async getCaseProgress(caseId: string): Promise<CaseProgressUpdate | null> {
    try {
      const { data, error } = await this.supabase
        .from('cases')
        .select('id, current_amount, target_amount')
        .eq('id', caseId)
        .single()

      if (error) throw error

      if (!data) return null

      return {
        caseId: data.id,
        currentAmount: parseFloat(data.current_amount || 0),
        targetAmount: parseFloat(data.target_amount || 0),
        progressPercentage: data.target_amount > 0 
          ? (parseFloat(data.current_amount || 0) / parseFloat(data.target_amount)) * 100 
          : 0
      }
    } catch (error) {
      defaultLogger.error('Error getting case progress:', error)
      return null
    }
  }
}

export const realtimeCaseUpdates = new RealtimeCaseUpdates() 