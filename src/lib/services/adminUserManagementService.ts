/**
 * Admin user listing, creation, detail, update, and safe delete (Auth admin + public.users).
 */

import type { SupabaseClient, User } from '@supabase/supabase-js'
import { defaultLogger } from '@/lib/logger'
import { normalizePhoneNumber, extractCountryCode } from '@/lib/utils/phone'
import { getAppUrl } from '@/lib/utils/app-url'

export class AdminUserManagementError extends Error {
  constructor(
    message: string,
    public readonly apiCode: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR' | 'CONFIGURATION_ERROR',
    public readonly status: number
  ) {
    super(message)
    this.name = 'AdminUserManagementError'
  }
}

export interface AdminUserListParams {
  page: number
  limit: number
  search: string
  roleFilter: string
  sortBy: string
  sortOrder: string
  /** When true, only users with no profile phone (null/empty/whitespace). */
  noPhone?: boolean
}

export interface AdminUserListRow {
  id: string
  email: string | undefined
  display_name: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  notes: string | null
  tags: string[]
  created_at: string | undefined
  updated_at: string | undefined
  email_confirmed_at: string | undefined | null
  last_sign_in_at: string | undefined | null
  roles: Array<{
    id: string
    role_id: string
    name: string
    display_name: string | null
    description: string | null
    assigned_at: string | null
    assigned_by: string | null
  }>
}

export interface CreateAdminUserInput {
  email: string
  password?: string
  first_name?: string
  last_name?: string
  phone?: string
  notes?: string
  tags?: unknown
  role_ids?: string[]
  adminUserId: string
  locale?: string
}

function mapRolesByUserId(
  userRoles: Array<{
    id: string
    user_id: string
    role_id: string
    assigned_at: string | null
    assigned_by: string | null
    admin_roles?: Array<{
      id: string
      name: string
      display_name: string | null
      description: string | null
    }> | {
      id: string
      name: string
      display_name: string | null
      description: string | null
    }
  }> | null
): Map<
  string,
  Array<{
    id: string
    role_id: string
    name: string
    display_name: string | null
    description: string | null
    assigned_at: string | null
    assigned_by: string | null
  }>
> {
  const rolesByUserId = new Map<
    string,
    Array<{
      id: string
      role_id: string
      name: string
      display_name: string | null
      description: string | null
      assigned_at: string | null
      assigned_by: string | null
    }>
  >()
  if (!userRoles) {
    return rolesByUserId
  }
  for (const ur of userRoles) {
    const adminRole = ur.admin_roles
    const role = Array.isArray(adminRole) ? adminRole[0] : adminRole
    if (role && typeof role === 'object' && 'name' in role) {
      if (!rolesByUserId.has(ur.user_id)) {
        rolesByUserId.set(ur.user_id, [])
      }
      rolesByUserId.get(ur.user_id)!.push({
        id: ur.id,
        role_id: ur.role_id,
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        assigned_at: ur.assigned_at,
        assigned_by: ur.assigned_by,
      })
    }
  }
  return rolesByUserId
}

export class AdminUserManagementService {
  /** Paginate through GoTrue admin API (used for list + contributor email generation). */
  static async fetchAllAuthUsers(
    serviceRole: SupabaseClient,
    logger = defaultLogger
  ): Promise<User[]> {
    const allUsers: User[] = []
    let authPage = 1
    const perPage = 1000

    while (true) {
      const { data: authUsersPage, error: usersError } = await serviceRole.auth.admin.listUsers({
        page: authPage,
        perPage,
      })

      if (usersError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching users:', usersError)
        throw new AdminUserManagementError(
          `Failed to fetch users: ${usersError.message}`,
          'INTERNAL_SERVER_ERROR',
          500
        )
      }

      if (!authUsersPage?.users || authUsersPage.users.length === 0) {
        break
      }

      allUsers.push(...authUsersPage.users)

      if (authUsersPage.users.length < perPage) {
        break
      }

      authPage++
    }

    return allUsers
  }

  static async listUsers(
    supabase: SupabaseClient,
    serviceRole: SupabaseClient,
    params: AdminUserListParams,
    logger = defaultLogger
  ): Promise<{
    users: AdminUserListRow[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNextPage: boolean
      hasPrevPage: boolean
    }
  }> {
    const { page, limit, search, roleFilter, sortBy, sortOrder, noPhone } = params

    const allUsers = await this.fetchAllAuthUsers(serviceRole, logger)

    logger.info('Users fetched:', allUsers.length)

    const userIds = allUsers.map(u => u.id)
    let userProfiles: Array<{
      id: string
      first_name: string | null
      last_name: string | null
      phone: string | null
      notes: string | null
      tags: string[] | null
    }> | null = null

    if (userIds.length > 0) {
      const { data, error: profilesError } = await supabase
        .from('users')
        .select('id, first_name, last_name, phone, notes, tags')
        .in('id', userIds)

      if (profilesError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user profiles:', profilesError)
      } else {
        userProfiles = data
      }
    }

    const profilesByUserId = new Map<
      string,
      {
        first_name: string | null
        last_name: string | null
        phone: string | null
        notes: string | null
        tags: string[] | null
      }
    >()
    if (userProfiles) {
      for (const profile of userProfiles) {
        profilesByUserId.set(profile.id, {
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          notes: profile.notes,
          tags: profile.tags || [],
        })
      }
    }

    const { data: userRoles, error: rolesError } = await supabase
      .from('admin_user_roles')
      .select(
        `
        id,
        user_id,
        role_id,
        assigned_at,
        assigned_by,
        is_active,
        admin_roles(id, name, display_name, description)
      `
      )
      .eq('is_active', true)

    if (rolesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user roles:', rolesError)
    }

    const rolesByUserId = mapRolesByUserId(userRoles)

    let sanitizedUsers: AdminUserListRow[] = allUsers.map(user => {
      const profile = profilesByUserId.get(user.id) || {
        first_name: null,
        last_name: null,
        phone: null,
        notes: null,
        tags: [] as string[],
      }
      return {
        id: user.id,
        email: user.email,
        display_name:
          (user.user_metadata?.display_name as string | undefined) ||
          user.email?.split('@')[0] ||
          'User',
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        notes: profile.notes,
        tags: profile.tags || [],
        created_at: user.created_at,
        updated_at: user.updated_at,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        roles: rolesByUserId.get(user.id) || [],
      }
    })

    if (search) {
      const searchLower = search.toLowerCase()
      sanitizedUsers = sanitizedUsers.filter(
        user =>
          (user.email?.toLowerCase().includes(searchLower) ?? false) ||
          user.display_name?.toLowerCase().includes(searchLower) ||
          user.first_name?.toLowerCase().includes(searchLower) ||
          user.last_name?.toLowerCase().includes(searchLower) ||
          user.phone?.toLowerCase().includes(searchLower)
      )
    }

    if (roleFilter && roleFilter !== 'all') {
      if (roleFilter === 'no-roles') {
        sanitizedUsers = sanitizedUsers.filter(user => user.roles.length === 0)
      } else {
        sanitizedUsers = sanitizedUsers.filter(user => user.roles.some(r => r.name === roleFilter))
      }
    }

    if (noPhone) {
      sanitizedUsers = sanitizedUsers.filter(
        user => !user.phone || !String(user.phone).trim()
      )
    }

    sanitizedUsers.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case 'email':
          aValue = (a.email || '').toLowerCase()
          bValue = (b.email || '').toLowerCase()
          break
        case 'display_name':
          aValue = (a.display_name || '').toLowerCase()
          bValue = (b.display_name || '').toLowerCase()
          break
        case 'created_at':
          aValue = new Date(a.created_at || 0).getTime()
          bValue = new Date(b.created_at || 0).getTime()
          break
        case 'last_sign_in_at':
          aValue = new Date(a.last_sign_in_at || 0).getTime()
          bValue = new Date(b.last_sign_in_at || 0).getTime()
          break
        default:
          aValue = new Date(a.created_at || 0).getTime()
          bValue = new Date(b.created_at || 0).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      }
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
    })

    const total = sanitizedUsers.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedUsers = sanitizedUsers.slice(offset, offset + limit)

    return {
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }
  }

  static async createUser(
    supabase: SupabaseClient,
    serviceRole: SupabaseClient,
    input: CreateAdminUserInput,
    logger = defaultLogger
  ): Promise<{
    userId: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    message: string
  }> {
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      notes,
      tags,
      role_ids,
      adminUserId,
      locale = 'en',
    } = input

    const trimmedEmail = email.trim()

    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', trimmedEmail)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking existing user:', checkError)
    }

    if (existingUser) {
      throw new AdminUserManagementError(
        'User with this email already exists',
        'VALIDATION_ERROR',
        400
      )
    }

    let normalizedPhone: string | null = null
    if (phone && phone.trim()) {
      const phoneWithoutSpaces = phone.trim().replace(/\s/g, '')
      normalizedPhone = normalizePhoneNumber(phoneWithoutSpaces, '+20')
    }

    if (normalizedPhone) {
      const { data: allUsersWithPhone, error: fetchError } = await supabase
        .from('users')
        .select('id, phone')
        .not('phone', 'is', null)

      if (fetchError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching users with phones:', fetchError)
      } else if (allUsersWithPhone) {
        for (const existing of allUsersWithPhone) {
          if (existing.phone) {
            const existingNormalized = normalizePhoneNumber(existing.phone, '+20')
            if (existingNormalized === normalizedPhone) {
              throw new AdminUserManagementError(
                'Phone number is already in use by another account',
                'VALIDATION_ERROR',
                400
              )
            }
          }
        }
      }

      const { data: exactMatch, error: exactError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle()

      if (exactError && exactError.code !== 'PGRST116') {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking phone exact match:', exactError)
      }

      if (exactMatch) {
        throw new AdminUserManagementError(
          'Phone number is already in use by another account',
          'VALIDATION_ERROR',
          400
        )
      }
    }

    const createUserOptions: {
      email: string
      password?: string
      email_confirm?: boolean
      user_metadata?: Record<string, unknown>
    } = {
      email: trimmedEmail,
      email_confirm: true,
      user_metadata: {
        created_by_admin: true,
        created_by: adminUserId,
        created_at: new Date().toISOString(),
      },
    }

    if (password && password.trim()) {
      createUserOptions.password = password.trim()
    }

    const { data: authData, error: authError } = await serviceRole.auth.admin.createUser(createUserOptions)

    if (authError || !authData?.user) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating auth user:', authError)
      const msg = authError?.message?.toLowerCase() || ''
      if (
        msg.includes('user already registered') ||
        msg.includes('already exists') ||
        authError?.status === 422
      ) {
        throw new AdminUserManagementError(
          'User with this email already exists',
          'VALIDATION_ERROR',
          400
        )
      }
      throw new AdminUserManagementError(
        `Failed to create user: ${authError?.message || 'Unknown error'}`,
        'INTERNAL_SERVER_ERROR',
        500
      )
    }

    const userId = authData.user.id

    const { error: profileError } = await supabase.from('users').insert({
      id: userId,
      email: trimmedEmail,
      first_name: first_name?.trim() || null,
      last_name: last_name?.trim() || null,
      phone: normalizedPhone || null,
      notes: notes?.trim() || null,
      tags: tags && Array.isArray(tags) && tags.length > 0 ? tags : [],
      role: 'donor',
      language: 'en',
    })

    if (profileError) {
      try {
        await serviceRole.auth.admin.deleteUser(userId)
      } catch (deleteError) {
        logger.error('Error cleaning up auth user after profile creation failure:', deleteError)
      }

      if (profileError.code === '23505') {
        if (profileError.message.includes('phone') || profileError.message.includes('users_phone_unique')) {
          throw new AdminUserManagementError(
            'Phone number is already in use by another account',
            'VALIDATION_ERROR',
            400
          )
        }
        if (profileError.message.includes('email') || profileError.message.includes('users_email_unique')) {
          throw new AdminUserManagementError(
            'Email is already in use by another account',
            'VALIDATION_ERROR',
            400
          )
        }
      }

      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating user profile:', profileError)
      throw new AdminUserManagementError(
        `Failed to create user profile: ${profileError.message}`,
        'INTERNAL_SERVER_ERROR',
        500
      )
    }

    let rolesToAssign =
      role_ids && Array.isArray(role_ids) && role_ids.length > 0 ? role_ids : []

    if (rolesToAssign.length === 0) {
      const { data: donorRole, error: donorRoleError } = await supabase
        .from('admin_roles')
        .select('id')
        .eq('name', 'donor')
        .eq('is_active', true)
        .single()

      if (!donorRoleError && donorRole) {
        rolesToAssign = [donorRole.id]
      } else {
        logger.warn('Donor role not found - user created without role assignment')
      }
    }

    if (rolesToAssign.length > 0) {
      const roleAssignments = rolesToAssign.map((roleId: string) => ({
        user_id: userId,
        role_id: roleId,
        assigned_by: adminUserId,
        assigned_at: new Date().toISOString(),
        is_active: true,
      }))

      const { error: rolesError } = await supabase.from('admin_user_roles').insert(roleAssignments)

      if (rolesError) {
        logger.error('Error assigning roles to user:', rolesError)
      }
    }

    if (!password || !password.trim()) {
      try {
        const { getAppUrl } = await import('@/lib/utils/app-url')
        const redirectTo = `${getAppUrl()}/${locale}/auth/reset-password`

        const { error: resetError } = await serviceRole.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo,
        })

        if (resetError) {
          logger.error('Error sending password reset email:', resetError)
        } else {
          logger.info('Password reset email sent to new user', { email: trimmedEmail })
        }
      } catch (resetError) {
        logger.error('Error sending password reset email:', resetError)
      }
    }

    logger.info('User created successfully', { userId, email: trimmedEmail })

    return {
      userId,
      email: trimmedEmail,
      first_name: first_name?.trim() || null,
      last_name: last_name?.trim() || null,
      phone: normalizedPhone,
      message:
        password && password.trim()
          ? 'User created successfully'
          : 'User created successfully. Password reset email will be sent.',
    }
  }

  static async getUserDetail(
    supabase: SupabaseClient,
    serviceRole: SupabaseClient,
    userId: string,
    logger = defaultLogger
  ) {
    const { data: authUser, error: authError } = await serviceRole.auth.admin.getUserById(userId)

    if (authError || !authUser) {
      throw new AdminUserManagementError('User not found', 'NOT_FOUND', 404)
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user profile:', profileError)
      throw new AdminUserManagementError(
        'Failed to fetch user profile',
        'INTERNAL_SERVER_ERROR',
        500
      )
    }

    const { data: userRoles } = await supabase
      .from('admin_user_roles')
      .select(
        `
        id,
        role_id,
        assigned_at,
        assigned_by,
        is_active,
        admin_roles(id, name, display_name, description)
      `
      )
      .eq('user_id', userId)
      .eq('is_active', true)

    const { count: contributionCount } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('donor_id', userId)

    interface UserRoleEntry {
      id: string
      role_id: string
      assigned_at: string | null
      assigned_by: string | null
      admin_roles?:
        | Array<{
            id: string
            name: string
            display_name: string | null
            description: string | null
          }>
        | {
            id: string
            name: string
            display_name: string | null
            description: string | null
          }
    }

    const roles = (userRoles || [])
      .map((ur: UserRoleEntry) => {
        const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
        return role
          ? {
              id: ur.id,
              role_id: ur.role_id,
              name: role.name,
              display_name: role.display_name,
              description: role.description,
              assigned_at: ur.assigned_at,
              assigned_by: ur.assigned_by,
            }
          : null
      })
      .filter(Boolean)

    const emailVerified = authUser.user.email_confirmed_at !== null

    return {
      success: true as const,
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        email_confirmed_at: authUser.user.email_confirmed_at,
        created_at: authUser.user.created_at,
        updated_at: authUser.user.updated_at,
        last_sign_in_at: authUser.user.last_sign_in_at,
        user_metadata: authUser.user.user_metadata,
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        phone: profile?.phone || null,
        address: profile?.address || null,
        profile_image: profile?.profile_image || null,
        role: profile?.role || 'donor',
        language: profile?.language || 'ar',
        is_active: profile?.is_active ?? true,
        email_verified: emailVerified,
        notes: profile?.notes || null,
        tags: profile?.tags || [],
        roles,
        contribution_count: contributionCount || 0,
      },
    }
  }

  static async updateUser(
    supabase: SupabaseClient,
    serviceRole: SupabaseClient,
    userId: string,
    body: Record<string, unknown>,
    logger = defaultLogger
  ) {
    const { data: authUser, error: authError } = await serviceRole.auth.admin.getUserById(userId)

    if (authError || !authUser) {
      throw new AdminUserManagementError('User not found', 'NOT_FOUND', 404)
    }

    const updates = { ...body }

    if (updates.phone !== undefined && updates.phone && String(updates.phone).trim()) {
      const phoneWithoutSpaces = String(updates.phone).trim().replace(/\s/g, '')
      const normalizedPhone = normalizePhoneNumber(phoneWithoutSpaces, '+20')

      const { data: allUsersWithPhone, error: fetchError } = await supabase
        .from('users')
        .select('id, phone')
        .neq('id', userId)
        .not('phone', 'is', null)

      if (fetchError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching users with phones:', fetchError)
      } else if (allUsersWithPhone) {
        for (const user of allUsersWithPhone) {
          if (user.phone) {
            const existingNormalized = normalizePhoneNumber(user.phone, '+20')
            if (existingNormalized === normalizedPhone) {
              throw new AdminUserManagementError(
                'Phone number is already in use by another account',
                'VALIDATION_ERROR',
                400
              )
            }
          }
        }
      }

      const { data: exactMatch, error: exactError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .neq('id', userId)
        .maybeSingle()

      if (exactError && exactError.code !== 'PGRST116') {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking phone exact match:', exactError)
      }

      if (exactMatch) {
        throw new AdminUserManagementError(
          'Phone number is already in use by another account',
          'VALIDATION_ERROR',
          400
        )
      }

      updates.phone = normalizedPhone
    }

    const appUserRoles = ['donor', 'sponsor', 'admin'] as const
    let validatedAppRole: string | undefined

    const profileUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.role !== undefined) {
      const r = String(updates.role)
      if (!appUserRoles.includes(r as (typeof appUserRoles)[number])) {
        throw new AdminUserManagementError('Invalid role', 'VALIDATION_ERROR', 400)
      }
      profileUpdates.role = r
      validatedAppRole = r
    }

    if (updates.first_name !== undefined) {
      profileUpdates.first_name = updates.first_name || null
    }
    if (updates.last_name !== undefined) {
      profileUpdates.last_name = updates.last_name || null
    }
    if (updates.phone !== undefined) {
      profileUpdates.phone = updates.phone || null
    }
    if (updates.address !== undefined) {
      profileUpdates.address = updates.address || null
    }
    if (updates.language !== undefined) {
      profileUpdates.language = updates.language
    }
    if (updates.is_active !== undefined) {
      profileUpdates.is_active = updates.is_active
    }
    if (updates.notes !== undefined) {
      profileUpdates.notes = updates.notes || null
    }
    if (updates.tags !== undefined) {
      profileUpdates.tags = updates.tags || []
    }

    const { data: updatedProfile, error: profileError } = await supabase
      .from('users')
      .update(profileUpdates)
      .eq('id', userId)
      .select()
      .single()

    if (profileError) {
      if (profileError.code === '23505') {
        if (profileError.message.includes('phone') || profileError.message.includes('users_phone_unique')) {
          throw new AdminUserManagementError(
            'Phone number is already in use by another account',
            'VALIDATION_ERROR',
            400
          )
        }
        if (profileError.message.includes('email') || profileError.message.includes('users_email_unique')) {
          throw new AdminUserManagementError(
            'Email is already in use by another account',
            'VALIDATION_ERROR',
            400
          )
        }
      }

      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating user profile:', profileError)
      throw new AdminUserManagementError(
        `Failed to update user profile: ${profileError.message}`,
        'INTERNAL_SERVER_ERROR',
        500
      )
    }

    const authPatch: { email?: string; user_metadata?: Record<string, unknown> } = {}
    if (updates.email !== undefined && updates.email !== authUser.user.email) {
      authPatch.email = updates.email as string
    }
    if (validatedAppRole !== undefined) {
      authPatch.user_metadata = {
        ...((authUser.user.user_metadata || {}) as Record<string, unknown>),
        role: validatedAppRole,
      }
    }

    if (Object.keys(authPatch).length > 0) {
      const { error: authUpdateError } = await serviceRole.auth.admin.updateUserById(userId, authPatch)

      if (authUpdateError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating auth user:', authUpdateError)
      }
    }

    return {
      success: true as const,
      user: {
        ...updatedProfile,
        email: authUser.user.email,
      },
    }
  }

  static async deleteUser(
    supabase: SupabaseClient,
    serviceRole: SupabaseClient,
    userId: string,
    logger = defaultLogger,
    options?: {
      /** Called after safety checks (and optional role deactivation), immediately before DB/auth deletion */
      afterChecksBeforeDelete?: (ctx: {
        userId: string
        email: string | undefined
      }) => Promise<void>
    }
  ): Promise<void> {
    const { data: authUser, error: authError } = await serviceRole.auth.admin.getUserById(userId)

    if (authError || !authUser) {
      throw new AdminUserManagementError('User not found', 'NOT_FOUND', 404)
    }

    const activityChecks = await Promise.all([
      supabase.from('contributions').select('*', { count: 'exact', head: true }).eq('donor_id', userId),
      supabase
        .from('recurring_contributions')
        .select('*', { count: 'exact', head: true })
        .eq('donor_id', userId),
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('assigned_to', userId),
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('sponsored_by', userId),
      supabase.from('case_updates').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      supabase.from('case_status_history').select('*', { count: 'exact', head: true }).eq('changed_by', userId),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('assigned_to', userId),
      supabase.from('sponsorships').select('*', { count: 'exact', head: true }).eq('sponsor_id', userId),
      supabase.from('communications').select('*', { count: 'exact', head: true }).eq('sender_id', userId),
      supabase.from('communications').select('*', { count: 'exact', head: true }).eq('recipient_id', userId),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_id', userId),
      supabase.from('beneficiaries').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      supabase.from('beneficiary_documents').select('*', { count: 'exact', head: true }).eq('uploaded_by', userId),
      supabase.from('category_detection_rules').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      supabase.from('category_detection_rules').select('*', { count: 'exact', head: true }).eq('updated_by', userId),
      supabase.from('landing_stats').select('*', { count: 'exact', head: true }).eq('updated_by', userId),
      supabase.from('system_config').select('*', { count: 'exact', head: true }).eq('updated_by', userId),
      supabase.from('system_content').select('*', { count: 'exact', head: true }).eq('updated_by', userId),
      supabase
        .from('contribution_approval_status')
        .select('*', { count: 'exact', head: true })
        .eq('admin_id', userId),
      supabase.from('admin_user_roles').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('admin_user_roles').select('*', { count: 'exact', head: true }).eq('assigned_by', userId),
    ])

    const activityTypes = [
      { name: 'contributions', field: 'donor_id' },
      { name: 'recurring contributions', field: 'donor_id' },
      { name: 'cases created', field: 'created_by' },
      { name: 'cases assigned', field: 'assigned_to' },
      { name: 'cases sponsored', field: 'sponsored_by' },
      { name: 'case updates', field: 'created_by' },
      { name: 'case status changes', field: 'changed_by' },
      { name: 'projects created', field: 'created_by' },
      { name: 'projects assigned', field: 'assigned_to' },
      { name: 'sponsorships', field: 'sponsor_id' },
      { name: 'messages sent', field: 'sender_id' },
      { name: 'messages received', field: 'recipient_id' },
      { name: 'notifications', field: 'recipient_id' },
      { name: 'beneficiaries created', field: 'created_by' },
      { name: 'beneficiary documents', field: 'uploaded_by' },
      { name: 'category rules created', field: 'created_by' },
      { name: 'category rules updated', field: 'updated_by' },
      { name: 'landing stats updated', field: 'updated_by' },
      { name: 'system config updated', field: 'updated_by' },
      { name: 'system content updated', field: 'updated_by' },
      { name: 'contribution approvals', field: 'admin_id' },
      { name: 'role assignments', field: 'user_id' },
      { name: 'role assignments made', field: 'assigned_by' },
    ]

    const activities = activityChecks
      .map((result, index) => ({
        type: activityTypes[index].name,
        count: result.count || 0,
      }))
      .filter(activity => activity.count > 0)

    const criticalActivities = activities.filter(a => !a.type.includes('role assignments'))
    const roleAssignmentActivities = activities.filter(a => a.type.includes('role assignments'))

    if (criticalActivities.length > 0) {
      const activitySummary = activities.map(a => `${a.count} ${a.type}`).join(', ')
      throw new AdminUserManagementError(
        `User has related activities: ${activitySummary}. Users with activities cannot be deleted to maintain data integrity.`,
        'VALIDATION_ERROR',
        400
      )
    }

    if (roleAssignmentActivities.length > 0) {
      logger.info('Removing role assignments before user deletion', {
        userId,
        roleAssignments: roleAssignmentActivities,
      })

      const { error: removeUserRolesError } = await supabase
        .from('admin_user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)

      if (removeUserRolesError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error removing user roles:', removeUserRolesError)
        throw new AdminUserManagementError(
          `Failed to remove user role assignments: ${removeUserRolesError.message}`,
          'INTERNAL_SERVER_ERROR',
          500
        )
      }

      const { error: removeAssignedRolesError } = await supabase
        .from('admin_user_roles')
        .update({ is_active: false })
        .eq('assigned_by', userId)

      if (removeAssignedRolesError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error removing assigned roles:', removeAssignedRolesError)
        logger.warn('Some role assignments may not have been removed', {
          userId,
          error: removeAssignedRolesError,
        })
      }

      logger.info('Role assignments removed successfully', {
        userId,
        removedUserRoles: roleAssignmentActivities.find(a => a.type === 'role assignments')?.count || 0,
        removedAssignedRoles:
          roleAssignmentActivities.find(a => a.type === 'role assignments made')?.count || 0,
      })
    }

    if (options?.afterChecksBeforeDelete) {
      await options.afterChecksBeforeDelete({
        userId,
        email: authUser.user.email,
      })
    }

    const { error: profileDeleteError } = await supabase.from('users').delete().eq('id', userId)

    if (profileDeleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting user profile:', profileDeleteError)
    }

    const { error: authDeleteError } = await serviceRole.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error deleting auth user:', authDeleteError)
      throw new AdminUserManagementError(
        `Failed to delete user: ${authDeleteError.message}`,
        'INTERNAL_SERVER_ERROR',
        500
      )
    }
  }

  static async getNextContributorEmail(
    serviceRole: SupabaseClient,
    phone: string | null | undefined,
    logger = defaultLogger
  ): Promise<{ email: string; type: 'phone' | 'contributor'; number?: number }> {
    const allUsers = await this.fetchAllAuthUsers(serviceRole, logger)

    if (phone?.trim()) {
      const normalizedPhone = normalizePhoneNumber(phone.trim(), '+20')
      const { countryCode, number } = extractCountryCode(phone.trim(), '+20')

      let phoneForEmail: string
      if (countryCode === '+20') {
        phoneForEmail =
          number.length === 10 && number.startsWith('1')
            ? '0' + number
            : number.startsWith('0')
              ? number
              : '0' + number
      } else {
        phoneForEmail = normalizedPhone.replace(/^\+\d{1,3}/, '')
        phoneForEmail = phoneForEmail.replace(/^0+/, '')
      }

      const phoneEmail = `${phoneForEmail}@ma3ana.org`
      const emailExists = allUsers.some(
        user => user.email && user.email.toLowerCase() === phoneEmail.toLowerCase()
      )

      if (emailExists) {
        throw new AdminUserManagementError(
          `Email ${phoneEmail} already exists`,
          'VALIDATION_ERROR',
          400
        )
      }

      logger.info('Generated phone-based email', { email: phoneEmail, phone })
      return { email: phoneEmail, type: 'phone' }
    }

    const contributorPattern = /^contributor(\d+)@ma3ana\.org$/i
    const numericPattern = /^(\d{4})@ma3ana\.org$/i
    const existingNumbers: number[] = []

    for (const user of allUsers) {
      if (!user.email) {
        continue
      }
      const email = user.email.toLowerCase()
      const contributorMatch = email.match(contributorPattern)
      if (contributorMatch?.[1]) {
        const n = parseInt(contributorMatch[1], 10)
        if (!isNaN(n)) {
          existingNumbers.push(n)
        }
      }
      const numericMatch = email.match(numericPattern)
      if (numericMatch?.[1]) {
        const n = parseInt(numericMatch[1], 10)
        if (!isNaN(n)) {
          existingNumbers.push(n)
        }
      }
    }

    let nextNumber = 1
    if (existingNumbers.length > 0) {
      nextNumber = Math.max(...existingNumbers) + 1
    }

    let formattedNumber = nextNumber.toString().padStart(4, '0')
    let nextEmail = `contributor${formattedNumber}@ma3ana.org`
    let emailExists = allUsers.some(
      user => user.email && user.email.toLowerCase() === nextEmail.toLowerCase()
    )

    while (emailExists) {
      nextNumber++
      formattedNumber = nextNumber.toString().padStart(4, '0')
      nextEmail = `contributor${formattedNumber}@ma3ana.org`
      emailExists = allUsers.some(
        user => user.email && user.email.toLowerCase() === nextEmail.toLowerCase()
      )
    }

    logger.info('Generated next contributor email', { nextEmail, nextNumber })
    return { email: nextEmail, number: nextNumber, type: 'contributor' }
  }

  static async sendAdminPasswordResetEmail(
    serviceRole: SupabaseClient,
    userId: string,
    locale: string,
    logger = defaultLogger
  ): Promise<void> {
    const { data: authUser, error: authError } = await serviceRole.auth.admin.getUserById(userId)

    if (authError || !authUser || !authUser.user.email) {
      throw new AdminUserManagementError('User not found', 'NOT_FOUND', 404)
    }

    const redirectTo = `${getAppUrl()}/${locale}/auth/reset-password`

    const { error: resetError } = await serviceRole.auth.admin.generateLink({
      type: 'recovery',
      email: authUser.user.email,
      options: { redirectTo },
    })

    if (resetError) {
      logger.error('Error generating password reset link:', resetError)
      throw new AdminUserManagementError(
        'Failed to send password reset email',
        'INTERNAL_SERVER_ERROR',
        500
      )
    }

    const { error: emailError } = await serviceRole.auth.resetPasswordForEmail(authUser.user.email, {
      redirectTo,
    })

    if (emailError) {
      logger.error('Error sending password reset email:', emailError)
      throw new AdminUserManagementError(
        'Failed to send password reset email',
        'INTERNAL_SERVER_ERROR',
        500
      )
    }
  }

  static async updateUserEmailFromPhone(
    supabase: SupabaseClient,
    serviceRole: SupabaseClient,
    userId: string,
    newEmail: string,
    logger = defaultLogger
  ): Promise<{ newEmail: string; oldEmail: string | null }> {
    const { data: authUser, error: authError } = await serviceRole.auth.admin.getUserById(userId)

    if (authError || !authUser) {
      throw new AdminUserManagementError('User not found', 'NOT_FOUND', 404)
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('phone, email')
      .eq('id', userId)
      .single()

    if (profileError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user profile:', profileError)
      throw new AdminUserManagementError(
        'Failed to fetch user profile',
        'INTERNAL_SERVER_ERROR',
        500
      )
    }

    const { data: existingEmailUser, error: emailCheckError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', newEmail)
      .neq('id', userId)
      .maybeSingle()

    if (emailCheckError && emailCheckError.code !== 'PGRST116') {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking email uniqueness:', emailCheckError)
    }

    if (existingEmailUser) {
      throw new AdminUserManagementError(
        `Email ${newEmail} is already in use by another account`,
        'VALIDATION_ERROR',
        400
      )
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        email: newEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '23505' && updateError.message.includes('email')) {
        throw new AdminUserManagementError(
          'Email is already in use by another account',
          'VALIDATION_ERROR',
          400
        )
      }
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating user email:', updateError)
      throw new AdminUserManagementError(
        `Failed to update user email: ${updateError.message}`,
        'INTERNAL_SERVER_ERROR',
        500
      )
    }

    const { error: authUpdateError } = await serviceRole.auth.admin.updateUserById(userId, {
      email: newEmail,
    })

    if (authUpdateError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error updating auth email:', authUpdateError)
      throw new AdminUserManagementError(
        `Failed to update auth email: ${authUpdateError.message}`,
        'INTERNAL_SERVER_ERROR',
        500
      )
    }

    logger.info('Successfully updated email from phone', {
      userId,
      oldEmail: userProfile.email,
      newEmail,
      phone: userProfile.phone,
    })

    return { newEmail, oldEmail: userProfile.email }
  }
}
