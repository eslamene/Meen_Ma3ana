import { createClient } from '@/lib/supabase/server'
import { Role, Permission, UserWithRoles } from './database-rbac'

// Server-side version for API routes
export class ServerDatabaseRBACService {
  private async getSupabase() {
    return await createClient()
  }

  // Get all roles
  async getRoles(): Promise<Role[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('display_name')

    if (error) throw error
    return data || []
  }

  // Get role by name
  async getRoleByName(name: string): Promise<Role | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('name', name)
      .single()

    if (error) return null
    return data
  }

  // Get all permissions
  async getPermissions(): Promise<Permission[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('permissions')
      .select(`
        *,
        permission_modules(
          id,
          name,
          display_name,
          icon,
          color,
          sort_order
        )
      `)
      .order('resource', { ascending: true })
      .order('action', { ascending: true })

    if (error) throw error
    return data || []
  }

  async getPermissionModules(): Promise<any[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('permission_modules')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data || []
  }

  async getPermissionsByModule(): Promise<any> {
    const supabase = await this.getSupabase()
    
    // First get all modules
    const { data: modules, error: modulesError } = await supabase
      .from('permission_modules')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (modulesError) throw modulesError

    // Then get all permissions with their modules
    const { data: permissions, error: permissionsError } = await supabase
      .from('permissions')
      .select(`
        *,
        permission_modules(
          id,
          name,
          display_name,
          icon,
          color,
          sort_order
        )
      `)
      .order('action', { ascending: true })

    if (permissionsError) throw permissionsError

    // Group permissions by module, maintaining module order
    const groupedPermissions: { [key: string]: any } = {}
    
    // Initialize with all modules first to maintain order
    modules.forEach(module => {
      groupedPermissions[module.name] = {
        ...module,
        permissions: []
      }
    })
    
    // Then add permissions to their modules
    permissions?.forEach(permission => {
      const module = permission.permission_modules
      if (module && groupedPermissions[module.name]) {
        groupedPermissions[module.name].permissions.push(permission)
      }
    })

    return groupedPermissions
  }

  // Get role with its permissions
  async getRoleWithPermissions(roleId: string): Promise<any> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions(
          permissions(*)
        )
      `)
      .eq('id', roleId)
      .single()

    if (error) throw error
    return data
  }

  // Get user roles and permissions
  async getUserRolesAndPermissions(userId: string): Promise<UserWithRoles | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        roles!inner(
          *,
          role_permissions!inner(
            permissions(*)
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.now()')

    if (error) {
      console.error('Error fetching user roles:', error)
      return null
    }

    if (!data || data.length === 0) return null

    // Extract unique roles and permissions
    const roles: Role[] = []
    const permissions: Permission[] = []
    const seenRoles = new Set<string>()
    const seenPermissions = new Set<string>()

    data.forEach((userRole: any) => {
      const role = userRole.roles
      if (role && !seenRoles.has(role.id)) {
        roles.push(role)
        seenRoles.add(role.id)
      }

      role?.role_permissions?.forEach((rp: any) => {
        const permission = rp.permissions
        if (permission && !seenPermissions.has(permission.id)) {
          permissions.push(permission)
          seenPermissions.add(permission.id)
        }
      })
    })

    return {
      id: userId,
      email: '', // Will be filled by caller if needed
      roles,
      permissions
    }
  }

  // Check if user has permission
  async userHasPermission(userId: string, permissionName: string): Promise<boolean> {
    const userRolesAndPermissions = await this.getUserRolesAndPermissions(userId)
    if (!userRolesAndPermissions) return false

    return userRolesAndPermissions.permissions.some(p => p.name === permissionName)
  }

  // Check if user has any of the permissions
  async userHasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
    const userRolesAndPermissions = await this.getUserRolesAndPermissions(userId)
    if (!userRolesAndPermissions) return false

    return userRolesAndPermissions.permissions.some(p => permissionNames.includes(p.name))
  }

  // Check if user has role
  async userHasRole(userId: string, roleName: string): Promise<boolean> {
    const userRolesAndPermissions = await this.getUserRolesAndPermissions(userId)
    if (!userRolesAndPermissions) return false

    return userRolesAndPermissions.roles.some(r => r.name === roleName)
  }

  // Assign role to user
  async assignRoleToUser(userId: string, roleId: string, assignedBy?: string): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role_id: roleId,
        assigned_by: assignedBy,
        is_active: true
      }, { onConflict: 'user_id,role_id' })

    if (error) throw error
  }

  // Remove role from user
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)

    if (error) throw error
  }

  // Create role
  async createRole(role: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('roles')
      .insert(role)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Update role
  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('roles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Delete role
  async deleteRole(roleId: string): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId)
      .eq('is_system', false) // Prevent deletion of system roles

    if (error) throw error
  }

  // Create permission
  async createPermission(permission: Omit<Permission, 'id' | 'created_at' | 'updated_at'>): Promise<Permission> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('permissions')
      .insert(permission)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Update permission
  async updatePermission(permissionId: string, updates: Partial<Permission>): Promise<Permission> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('permissions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', permissionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Delete permission
  async deletePermission(permissionId: string): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('permissions')
      .delete()
      .eq('id', permissionId)
      .eq('is_system', false) // Prevent deletion of system permissions

    if (error) throw error
  }

  // Assign permission to role
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('role_permissions')
      .upsert({
        role_id: roleId,
        permission_id: permissionId
      }, { onConflict: 'role_id,permission_id' })

    if (error) throw error
  }

  // Remove permission from role
  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId)

    if (error) throw error
  }
}

export const serverDbRBAC = new ServerDatabaseRBACService()