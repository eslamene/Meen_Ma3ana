/**
 * User Service
 * Handles all user-related database operations
 * Server-side only - accepts Supabase client as parameter
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { defaultLogger } from '@/lib/logger'

export interface User {
  id: string
  email: string
  role: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  address?: string | null
  profile_image?: string | null
  is_active: boolean
  email_verified: boolean
  language: string
  notifications?: string | null
  notes?: string | null
  tags?: string[] | null
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  email: string
  password?: string
  first_name?: string
  last_name?: string
  phone?: string
  notes?: string
  tags?: string[]
  role_ids?: string[]
}

export interface UpdateUserData {
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  address?: string | null
  language?: string
  is_active?: boolean
  notes?: string | null
  tags?: string[] | null
  email?: string
}

export interface UserSearchParams {
  page?: number
  limit?: number
  search?: string
  roleFilter?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface UserListResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export class UserService {
  /**
   * Get service role client for admin operations
   */
  private static getServiceRoleClient(): SupabaseClient {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
    }

    return createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }

  /**
   * Get users with filtering and pagination
   * @param supabase - Supabase client (server-side only)
   */
  static async getUsers(
    supabase: SupabaseClient,
    params: UserSearchParams = {}
  ): Promise<UserListResponse> {
    const {
      page = 1,
      limit = 20,
      search = '',
      roleFilter = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = params

    const offset = (page - 1) * limit

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // Apply role filter
    if (roleFilter) {
      query = query.eq('role', roleFilter)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: users, error, count } = await query

    if (error) {
      defaultLogger.error('Error fetching users:', error)
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    return {
      users: (users || []) as User[],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  }

  /**
   * Get user by ID
   * @param supabase - Supabase client (server-side only)
   */
  static async getById(supabase: SupabaseClient, id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      defaultLogger.error('Error fetching user:', error)
      throw new Error(`Failed to fetch user: ${error.message}`)
    }

    return data as User
  }

  /**
   * Get user by email
   * @param supabase - Supabase client (server-side only)
   */
  static async getByEmail(supabase: SupabaseClient, email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      defaultLogger.error('Error fetching user by email:', error)
      throw new Error(`Failed to fetch user: ${error.message}`)
    }

    return data as User | null
  }

  /**
   * Create a new user (admin only - requires service role)
   * @param supabase - Supabase client (server-side only)
   */
  static async create(supabase: SupabaseClient, data: CreateUserData, createdBy: string): Promise<User> {
    const serviceRoleClient = this.getServiceRoleClient()

    // Check if user already exists
    const existingUser = await this.getByEmail(supabase, data.email.trim())
    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Create auth user
    const createUserOptions: {
      email: string
      password?: string
      email_confirm?: boolean
      user_metadata?: Record<string, unknown>
    } = {
      email: data.email.trim(),
      email_confirm: true,
      user_metadata: {
        created_by_admin: true,
        created_by: createdBy,
        created_at: new Date().toISOString()
      }
    }

    if (data.password && data.password.trim()) {
      createUserOptions.password = data.password.trim()
    }

    const { data: authData, error: authError } = await serviceRoleClient.auth.admin.createUser(createUserOptions)

    if (authError || !authData?.user) {
      defaultLogger.error('Error creating auth user:', authError)
      throw new Error(`Failed to create user: ${authError?.message || 'Unknown error'}`)
    }

    const userId = authData.user.id

    // Create user profile in users table
    const { data: newUser, error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: data.email.trim(),
        first_name: data.first_name?.trim() || null,
        last_name: data.last_name?.trim() || null,
        phone: data.phone?.trim() || null,
        notes: data.notes?.trim() || null,
        tags: data.tags && Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : [],
        role: 'donor',
        language: 'en'
      })
      .select()
      .single()

    if (profileError) {
      // Try to clean up auth user if profile creation fails
      try {
        await serviceRoleClient.auth.admin.deleteUser(userId)
      } catch (cleanupError) {
        defaultLogger.error('Error cleaning up auth user:', cleanupError)
      }
      defaultLogger.error('Error creating user profile:', profileError)
      throw new Error(`Failed to create user profile: ${profileError.message}`)
    }

    // Assign roles if provided
    if (data.role_ids && data.role_ids.length > 0) {
      // This would be handled by a separate role assignment service
      // For now, we'll just log it
      defaultLogger.info('Role assignment requested but not implemented in service', { userId, roleIds: data.role_ids })
    }

    return newUser as User
  }

  /**
   * Update user
   * @param supabase - Supabase client (server-side only)
   */
  static async update(supabase: SupabaseClient, id: string, data: UpdateUserData): Promise<User> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (data.first_name !== undefined) updateData.first_name = data.first_name
    if (data.last_name !== undefined) updateData.last_name = data.last_name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.address !== undefined) updateData.address = data.address
    if (data.language !== undefined) updateData.language = data.language
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.tags !== undefined) updateData.tags = data.tags

    // Update email if provided (requires service role)
    if (data.email && data.email.trim()) {
      const serviceRoleClient = this.getServiceRoleClient()
      const { error: emailError } = await serviceRoleClient.auth.admin.updateUserById(id, {
        email: data.email.trim()
      })

      if (emailError) {
        defaultLogger.error('Error updating user email:', emailError)
        throw new Error(`Failed to update user email: ${emailError.message}`)
      }

      updateData.email = data.email.trim()
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      defaultLogger.error('Error updating user:', error)
      throw new Error(`Failed to update user: ${error.message}`)
    }

    return updatedUser as User
  }

  /**
   * Delete user
   * @param supabase - Supabase client (server-side only)
   */
  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const serviceRoleClient = this.getServiceRoleClient()

    // Delete from users table first
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (profileError) {
      defaultLogger.error('Error deleting user profile:', profileError)
      throw new Error(`Failed to delete user profile: ${profileError.message}`)
    }

    // Delete auth user
    const { error: authError } = await serviceRoleClient.auth.admin.deleteUser(id)
    if (authError) {
      defaultLogger.error('Error deleting auth user:', authError)
      // Don't throw - profile is already deleted
    }
  }

  /**
   * Get total user count
   * @param supabase - Supabase client (server-side only)
   */
  static async getTotalCount(supabase: SupabaseClient): Promise<number> {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (error) {
      defaultLogger.error('Error getting user count:', error)
      throw new Error(`Failed to get user count: ${error.message}`)
    }

    return count || 0
  }
}

