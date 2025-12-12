import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPermission } from '@/lib/security/rls'
import { AuditService, extractRequestInfo } from '@/lib/services/auditService'
import { createClient } from '@supabase/supabase-js'

import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)

  try {
    logger.info('Starting users fetch...')
    
    // Require admin permission
    const authResult = await requireAdminPermission(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user: adminUser, supabase } = authResult

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
      return NextResponse.json({ 
        error: 'Page must be greater than 0' 
      }, { status: 400 })
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json({ 
        error: 'Limit must be between 1 and 100' 
      }, { status: 400 })
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
    const serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
        const errorDetails: any = {
          code: usersError.code,
          message: usersError.message
        }
        if ((usersError as any).details) {
          errorDetails.details = (usersError as any).details
        }
        if ((usersError as any).hint) {
          errorDetails.hint = (usersError as any).hint
        }
        logger.error('Users fetch error details:', errorDetails)
        throw usersError
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
    let userProfiles: any[] | null = null
    if (userIds.length > 0) {
      const { data, error: profilesError } = await supabase
        .from('users')
        .select('id, first_name, last_name, phone')
        .in('id', userIds)
      
      if (profilesError) {
        logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching user profiles:', profilesError)
        // Don't throw, just log - this allows the API to still return users
      } else {
        userProfiles = data
      }
    }

    // Create a map of user profiles by id
    const profilesByUserId = new Map<string, { first_name: string | null, last_name: string | null, phone: string | null }>()
    if (userProfiles) {
      userProfiles.forEach((profile: any) => {
        profilesByUserId.set(profile.id, {
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone
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
      const rolesErrorDetails: any = {
        code: rolesError.code,
        message: rolesError.message
      }
      if ((rolesError as any).details) {
        rolesErrorDetails.details = (rolesError as any).details
      }
      if ((rolesError as any).hint) {
        rolesErrorDetails.hint = (rolesError as any).hint
      }
      logger.error('User roles error details:', rolesErrorDetails)
      // Don't throw, just return empty array - this allows the API to still return users
    }

    logger.info('User roles fetched:', userRoles?.length || 0)

    // Group roles by user_id
    const rolesByUserId = new Map<string, any[]>()
    if (userRoles) {
      userRoles.forEach((ur: any) => {
        const role = Array.isArray(ur.admin_roles) ? ur.admin_roles[0] : ur.admin_roles
        if (role) {
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
      const profile = profilesByUserId.get(user.id) || { first_name: null, last_name: null, phone: null }
      return {
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
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
      let aValue: any
      let bValue: any

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
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Users API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
