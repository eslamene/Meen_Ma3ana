/**
 * Communication Service
 * Handles all communication-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'

export interface Communication {
  id: string
  sender_id: string
  recipient_id: string
  subject: string
  message: string
  is_read: boolean
  created_at: string
  updated_at?: string | null
  sender?: {
    first_name?: string | null
    last_name?: string | null
    email?: string
    role?: string | null
  } | null
  recipient?: {
    first_name?: string | null
    last_name?: string | null
    email?: string
    role?: string | null
  } | null
}

export interface CreateCommunicationData {
  sender_id: string
  recipient_id: string
  subject: string
  message: string
}

export class CommunicationService {
  /**
   * Get communications for a user (both sent and received)
   * @param supabase - Supabase client (server-side only)
   * @param userId - User ID
   */
  static async getByUserId(supabase: SupabaseClient, userId: string): Promise<Communication[]> {
    const { data, error } = await supabase
      .from('communications')
      .select(`
        id,
        sender_id,
        recipient_id,
        subject,
        message,
        is_read,
        created_at,
        sender:users!communications_sender_id_fkey(
          first_name,
          last_name,
          email,
          role
        ),
        recipient:users!communications_recipient_id_fkey(
          first_name,
          last_name,
          email,
          role
        )
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      defaultLogger.error('Error fetching communications:', error)
      throw new Error(`Failed to fetch communications: ${error.message}`)
    }

    // Transform the data to normalize nested structures
    return ((data || []) as Array<{
      sender?: unknown
      recipient?: unknown
      [key: string]: unknown
    }>).map((item) => {
      const sender = Array.isArray(item.sender) ? item.sender[0] : item.sender
      const recipient = Array.isArray(item.recipient) ? item.recipient[0] : item.recipient

      return {
        id: item.id as string,
        sender_id: item.sender_id as string,
        recipient_id: item.recipient_id as string,
        subject: item.subject as string,
        message: item.message as string,
        is_read: item.is_read as boolean,
        created_at: item.created_at as string,
        updated_at: (item.updated_at as string | null) || null,
        sender: sender ? {
          first_name: (sender as { first_name?: string | null })?.first_name || null,
          last_name: (sender as { last_name?: string | null })?.last_name || null,
          email: (sender as { email?: string })?.email || '',
          role: (sender as { role?: string | null })?.role || null
        } : null,
        recipient: recipient ? {
          first_name: (recipient as { first_name?: string | null })?.first_name || null,
          last_name: (recipient as { last_name?: string | null })?.last_name || null,
          email: (recipient as { email?: string })?.email || '',
          role: (recipient as { role?: string | null })?.role || null
        } : null
      } as Communication
    })
  }

  /**
   * Get communication by ID
   * @param supabase - Supabase client (server-side only)
   * @param id - Communication ID
   * @param userId - User ID (for authorization check)
   */
  static async getById(supabase: SupabaseClient, id: string, userId?: string): Promise<Communication | null> {
    let query = supabase
      .from('communications')
      .select(`
        *,
        sender:users!communications_sender_id_fkey(
          first_name,
          last_name,
          email,
          role
        ),
        recipient:users!communications_recipient_id_fkey(
          first_name,
          last_name,
          email,
          role
        )
      `)
      .eq('id', id)

    if (userId) {
      query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching communication:', error)
      throw new Error(`Failed to fetch communication: ${error.message}`)
    }

    if (!data) {
      return null
    }

    // Transform the data
    const sender = Array.isArray(data.sender) ? data.sender[0] : data.sender
    const recipient = Array.isArray(data.recipient) ? data.recipient[0] : data.recipient

    return {
      id: data.id,
      sender_id: data.sender_id,
      recipient_id: data.recipient_id,
      subject: data.subject,
      message: data.message,
      is_read: data.is_read,
      created_at: data.created_at,
      updated_at: data.updated_at || null,
      sender: sender ? {
        first_name: sender.first_name || null,
        last_name: sender.last_name || null,
        email: sender.email || '',
        role: sender.role || null
      } : null,
      recipient: recipient ? {
        first_name: recipient.first_name || null,
        last_name: recipient.last_name || null,
        email: recipient.email || '',
        role: recipient.role || null
      } : null
    } as Communication
  }

  /**
   * Create a new communication
   * @param supabase - Supabase client (server-side only)
   * @param data - Communication data
   */
  static async create(supabase: SupabaseClient, data: CreateCommunicationData): Promise<Communication> {
    const { data: communication, error } = await supabase
      .from('communications')
      .insert({
        sender_id: data.sender_id,
        recipient_id: data.recipient_id,
        subject: data.subject.trim(),
        message: data.message.trim(),
        is_read: false,
      })
      .select(`
        *,
        sender:users!communications_sender_id_fkey(
          first_name,
          last_name,
          email,
          role
        ),
        recipient:users!communications_recipient_id_fkey(
          first_name,
          last_name,
          email,
          role
        )
      `)
      .single()

    if (error) {
      defaultLogger.error('Error creating communication:', error)
      throw new Error(`Failed to create communication: ${error.message}`)
    }

    // Transform the data
    const sender = Array.isArray(communication.sender) ? communication.sender[0] : communication.sender
    const recipient = Array.isArray(communication.recipient) ? communication.recipient[0] : communication.recipient

    return {
      id: communication.id,
      sender_id: communication.sender_id,
      recipient_id: communication.recipient_id,
      subject: communication.subject,
      message: communication.message,
      is_read: communication.is_read,
      created_at: communication.created_at,
      updated_at: communication.updated_at || null,
      sender: sender ? {
        first_name: sender.first_name || null,
        last_name: sender.last_name || null,
        email: sender.email || '',
        role: sender.role || null
      } : null,
      recipient: recipient ? {
        first_name: recipient.first_name || null,
        last_name: recipient.last_name || null,
        email: recipient.email || '',
        role: recipient.role || null
      } : null
    } as Communication
  }

  /**
   * Mark communication as read
   * @param supabase - Supabase client (server-side only)
   * @param id - Communication ID
   * @param userId - User ID (must be the recipient)
   */
  static async markAsRead(supabase: SupabaseClient, id: string, userId: string): Promise<Communication> {
    // First verify the user is the recipient
    const communication = await this.getById(supabase, id, userId)
    if (!communication) {
      throw new Error('Communication not found or access denied')
    }

    if (communication.recipient_id !== userId) {
      throw new Error('Only the recipient can mark a communication as read')
    }

    const { data, error } = await supabase
      .from('communications')
      .update({
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        sender:users!communications_sender_id_fkey(
          first_name,
          last_name,
          email,
          role
        ),
        recipient:users!communications_recipient_id_fkey(
          first_name,
          last_name,
          email,
          role
        )
      `)
      .single()

    if (error) {
      defaultLogger.error('Error marking communication as read:', error)
      throw new Error(`Failed to mark communication as read: ${error.message}`)
    }

    // Transform the data
    const sender = Array.isArray(data.sender) ? data.sender[0] : data.sender
    const recipient = Array.isArray(data.recipient) ? data.recipient[0] : data.recipient

    return {
      id: data.id,
      sender_id: data.sender_id,
      recipient_id: data.recipient_id,
      subject: data.subject,
      message: data.message,
      is_read: data.is_read,
      created_at: data.created_at,
      updated_at: data.updated_at || null,
      sender: sender ? {
        first_name: sender.first_name || null,
        last_name: sender.last_name || null,
        email: sender.email || '',
        role: sender.role || null
      } : null,
      recipient: recipient ? {
        first_name: recipient.first_name || null,
        last_name: recipient.last_name || null,
        email: recipient.email || '',
        role: recipient.role || null
      } : null
    } as Communication
  }
}

