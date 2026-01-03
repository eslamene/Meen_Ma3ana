import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/config/env'
import { normalizePhoneNumber } from '@/lib/utils/phone'

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
  const { user: adminUser, supabase, logger } = context

  try {
    logger.info('Starting users fetch...')

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100) // Max 100 per page
    const search = searchParams.get('search') || ''
    const roleFilter = searchParams.get('role') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Validate pagination
    if (page < 1) {
      throw new ApiError('VALIDATION_ERROR', 'Page must be greater than 0', 400)
    }

    if (limit < 1 || limit > 100) {
      throw new ApiError('VALIDATION_ERROR', 'Limit must be between 1 and 100', 400)
    }

    // Log the admin access
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      adminUser.id,
      'admin_users_access',
      'user',
      undefined,
      { endpoint: '/api/admin/users', page, limit, search, roleFilter },
      ipAddress,
      userAgent
    )

    logger.info('Admin user authenticated', { userId: adminUser.id, page, limit, search, roleFilter })

    // Create service role client for admin operations (listUsers requires service role key)
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
      throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
    }
    
    const serviceRoleClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch all users (Supabase Auth doesn't support server-side filtering/search)
    // We'll filter in memory after fetching
    const allUsers = []
    let authPage = 1
    const perPage = 1000
    
    while (true) {
      const { data: authUsersPage, error: usersError } = await serviceRoleClient.auth.admin.listUsers({
        page: authPage,
        perPage
      })
      
      if (usersError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching users:', usersError)
        throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to fetch users: ${usersError.message}`, 500)
      }

      if (!authUsersPage?.users || authUsersPage.users.length === 0) {
        break
      }
      
      allUsers.push(...authUsersPage.users)
      
      // If we got fewer than perPage, we've reached the end
      if (authUsersPage.users.length < perPage) {
        break
      }
      
      authPage++
    }
    
    logger.info('Users fetched:', allUsers.length)

    // Fetch user profile data from users table
    const userIds = allUsers.map(u => u.id)
    let userProfiles: Array<{ id: string; first_name: string | null; last_name: string | null; phone: string | null; notes: string | null; tags: string[] | null }> | null = null
    if (userIds.length > 0) {
      const { data, error: profilesError } = await supabase
        .from('users')
        .select('id, first_name, last_name, phone, notes, tags')
        .in('id', userIds)
      
      if (profilesError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user profiles:', profilesError)
        // Don't throw, just log - this allows the API to still return users
      } else {
        userProfiles = data
      }
    }

    // Create a map of user profiles by id
    const profilesByUserId = new Map<string, { first_name: string | null, last_name: string | null, phone: string | null, notes: string | null, tags: string[] | null }>()
    if (userProfiles) {
      userProfiles.forEach((profile) => {
        profilesByUserId.set(profile.id, {
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          notes: profile.notes,
          tags: profile.tags || []
        })
      })
    }

    // Fetch user roles from admin_user_roles table
    const { data: userRoles, error: rolesError } = await supabase
      .from('admin_user_roles')
      .select(`
        id,
        user_id,
        role_id,
        assigned_at,
        assigned_by,
        is_active,
        admin_roles(id, name, display_name, description)
      `)
      .eq('is_active', true)

    if (rolesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user roles:', rolesError)
      const rolesErrorDetails: { code?: string; message?: string; details?: string; hint?: string } = {
        code: rolesError.code,
        message: rolesError.message
      }
      const errorObj = rolesError as { details?: string; hint?: string }
      if (errorObj.details) {
        rolesErrorDetails.details = errorObj.details
      }
      if (errorObj.hint) {
        rolesErrorDetails.hint = errorObj.hint
      }
      logger.error('User roles error details:', rolesErrorDetails)
      // Don't throw, just return empty array - this allows the API to still return users
    }

    logger.info('User roles fetched:', userRoles?.length || 0)

    // Group roles by user_id
    type UserRoleEntry = {
      id: string
      role_id: string
      name: string
      display_name: string | null
      description: string | null
      assigned_at: string | null
      assigned_by: string | null
    }
    const rolesByUserId = new Map<string, UserRoleEntry[]>()
    if (userRoles) {
      userRoles.forEach((ur: { 
        id: string
        user_id: string
        role_id: string
        assigned_at: string | null
        assigned_by: string | null
        admin_roles?: Array<{ id: string; name: string; display_name: string | null; description: string | null }> | { id: string; name: string; display_name: string | null; description: string | null }
      }) => {
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
            assigned_by: ur.assigned_by
          })
        }
      })
    }

    // Sanitize user data and attach roles and profile data
    let sanitizedUsers = allUsers.map(user => {
      const profile = profilesByUserId.get(user.id) || { first_name: null, last_name: null, phone: null, notes: null, tags: [] }
      return {
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        notes: profile.notes,
        tags: profile.tags || [],
      created_at: user.created_at,
      updated_at: user.updated_at,
      email_confirmed_at: user.email_confirmed_at,
      last_sign_in_at: user.last_sign_in_at,
      roles: rolesByUserId.get(user.id) || []
      }
    })

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      sanitizedUsers = sanitizedUsers.filter(user => 
        (user.email?.toLowerCase().includes(searchLower) ?? false) ||
        user.display_name?.toLowerCase().includes(searchLower) ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower)
      )
    }

    // Apply role filter
    if (roleFilter && roleFilter !== 'all') {
      if (roleFilter === 'no-roles') {
        sanitizedUsers = sanitizedUsers.filter(user => user.roles.length === 0)
      } else {
        sanitizedUsers = sanitizedUsers.filter(user => 
          user.roles.some(r => r.name === roleFilter)
        )
      }
    }

    // Apply sorting
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
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

    // Calculate pagination
    const total = sanitizedUsers.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const paginatedUsers = sanitizedUsers.slice(offset, offset + limit)

    logger.info('Users filtered and paginated', { 
      total, 
      page, 
      limit, 
      totalPages, 
      returned: paginatedUsers.length 
    })

    return NextResponse.json({
      success: true,
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error
    }
    // Wrap other errors
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Users API error:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch users', 500)
  }
}

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { user: adminUser, supabase, logger } = context

  try {
    const body = await request.json()
    const { email, password, first_name, last_name, phone, notes, tags, role_ids } = body

    // Validate required fields
    if (!email || !email.trim()) {
      throw new ApiError('VALIDATION_ERROR', 'Email is required', 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid email format', 400)
    }

    // Log the admin action
    const { ipAddress, userAgent } = extractRequestInfo(request)
    await AuditService.logAdminAction(
      adminUser.id,
      'admin_user_create',
      'user',
      undefined,
      { email: email.trim() },
      ipAddress,
      userAgent
    )

    logger.info('Creating new user', { email: email.trim(), adminUserId: adminUser.id })

    // Create service role client for admin operations
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
      throw new ApiError('CONFIGURATION_ERROR', 'Service configuration error', 500)
    }

    const serviceRoleClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if user already exists by querying the users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim())
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking existing user:', checkError)
    }

    if (existingUser) {
      throw new ApiError('VALIDATION_ERROR', 'User with this email already exists', 400)
    }

    // Normalize phone number if provided
    let normalizedPhone: string | null = null
    if (phone && phone.trim()) {
      // Remove all spaces from phone number before processing
      const phoneWithoutSpaces = phone.trim().replace(/\s/g, '')
      normalizedPhone = normalizePhoneNumber(phoneWithoutSpaces, '+20')
    }

    // Check if phone number is already in use (check normalized uniqueness)
    if (normalizedPhone) {
      // Get all users with phone numbers to check normalized uniqueness
      const { data: allUsersWithPhone, error: fetchError } = await supabase
        .from('users')
        .select('id, phone')
        .not('phone', 'is', null)

      if (fetchError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching users with phones:', fetchError)
      } else if (allUsersWithPhone) {
        // Check if normalized phone matches any existing normalized phone
        for (const existingUser of allUsersWithPhone) {
          if (existingUser.phone) {
            const existingNormalized = normalizePhoneNumber(existingUser.phone, '+20')
            if (existingNormalized === normalizedPhone) {
              throw new ApiError('VALIDATION_ERROR', 'Phone number is already in use by another account', 400)
            }
          }
        }
      }

      // Also check exact match
      const { data: exactMatch, error: exactError } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle()

      if (exactError && exactError.code !== 'PGRST116') {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error checking phone exact match:', exactError)
      }

      if (exactMatch) {
        throw new ApiError('VALIDATION_ERROR', 'Phone number is already in use by another account', 400)
      }
    }

    // Create auth user
    const createUserOptions: {
      email: string
      password?: string
      email_confirm?: boolean
      user_metadata?: Record<string, unknown>
    } = {
      email: email.trim(),
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        created_by_admin: true,
        created_by: adminUser.id,
        created_at: new Date().toISOString()
      }
    }

    // Add password if provided, otherwise user will need to reset password
    if (password && password.trim()) {
      createUserOptions.password = password.trim()
    }

    const { data: authData, error: authError } = await serviceRoleClient.auth.admin.createUser(createUserOptions)

    if (authError || !authData?.user) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating auth user:', authError)
      
      // Check if error is due to duplicate email
      if (authError?.message?.toLowerCase().includes('user already registered') || 
          authError?.message?.toLowerCase().includes('already exists') ||
          authError?.status === 422) {
        throw new ApiError('VALIDATION_ERROR', 'User with this email already exists', 400)
      }
      
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to create user: ${authError?.message || 'Unknown error'}`, 500)
    }

    const userId = authData.user.id

    // Create user profile in users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email.trim(),
        first_name: first_name?.trim() || null,
        last_name: last_name?.trim() || null,
        phone: normalizedPhone || null,
        notes: notes?.trim() || null,
        tags: tags && Array.isArray(tags) && tags.length > 0 ? tags : [],
        role: 'donor', // Default role
        language: 'en'
      })

    if (profileError) {
      // If profile creation fails, try to clean up auth user
      try {
        await serviceRoleClient.auth.admin.deleteUser(userId)
      } catch (deleteError) {
        logger.error('Error cleaning up auth user after profile creation failure:', deleteError)
      }

      // Check if error is due to duplicate phone or email (unique constraint violation)
      if (profileError.code === '23505') {
        if (profileError.message.includes('phone') || profileError.message.includes('users_phone_unique')) {
          throw new ApiError('VALIDATION_ERROR', 'Phone number is already in use by another account', 400)
        }
        if (profileError.message.includes('email') || profileError.message.includes('users_email_unique')) {
          throw new ApiError('VALIDATION_ERROR', 'Email is already in use by another account', 400)
        }
      }

      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating user profile:', profileError)
      throw new ApiError('INTERNAL_SERVER_ERROR', `Failed to create user profile: ${profileError.message}`, 500)
    }

    // Assign roles - if provided, use them; otherwise assign donor role by default
    let rolesToAssign = role_ids && Array.isArray(role_ids) && role_ids.length > 0 
      ? role_ids 
      : []

    // If no roles provided, assign donor role by default
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
        assigned_by: adminUser.id,
        assigned_at: new Date().toISOString(),
        is_active: true
      }))

      const { error: rolesError } = await supabase
        .from('admin_user_roles')
        .insert(roleAssignments)

      if (rolesError) {
        logger.error('Error assigning roles to user:', rolesError)
        // Don't fail user creation if role assignment fails - user can be assigned roles later
      }
    }

    // If no password was provided, send password reset email
    if (!password || !password.trim()) {
      try {
        // Get locale from request or default to 'en'
        const { searchParams } = new URL(request.url)
        const locale = searchParams.get('locale') || 'en'
        
        // Import getAppUrl dynamically to avoid circular dependencies
        const { getAppUrl } = await import('@/lib/utils/app-url')
        const redirectTo = `${getAppUrl()}/${locale}/auth/reset-password`
        
        // Send password reset email
        const { error: resetError } = await serviceRoleClient.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo
          }
        )

        if (resetError) {
          logger.error('Error sending password reset email:', resetError)
          // Don't fail - user can request password reset later
        } else {
          logger.info('Password reset email sent to new user', { email: email.trim() })
        }
      } catch (resetError) {
        logger.error('Error sending password reset email:', resetError)
        // Don't fail - user can request password reset later
      }
    }

    logger.info('User created successfully', { userId, email: email.trim() })

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: email.trim(),
        first_name: first_name?.trim() || null,
        last_name: last_name?.trim() || null,
        phone: normalizedPhone
      },
      message: password && password.trim()
        ? 'User created successfully'
        : 'User created successfully. Password reset email will be sent.'
    })

  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error
    }
    // Wrap other errors
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Create user API error:', error)
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to create user', 500)
  }
}

export const GET = createGetHandler(getHandler, { 
  requireAdmin: true, 
  loggerContext: 'api/admin/users' 
})

export const POST = createPostHandler(postHandler, {
  requireAdmin: true,
  loggerContext: 'api/admin/users'
})
