'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, Shield, Users } from 'lucide-react'

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  is_system: boolean
  permissions_count: number
  users_count: number
}

interface RolesDataTableProps {
  roles: Role[]
  loading?: boolean
  onEdit: (role: Role) => void
  onDelete: (role: Role) => void
  onAssignPermissions: (role: Role) => void
}

export function RolesDataTable({
  roles,
  loading = false,
  onEdit,
  onDelete,
  onAssignPermissions
}: RolesDataTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (roles.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No roles found</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {roles.map((role) => (
        <div
          key={role.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium flex items-center gap-2">
                  {role.display_name}
                  {role.is_system && (
                    <Badge variant="default" className="text-xs">
                      System
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {role.description || role.name}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {role.permissions_count} permissions
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {role.users_count} users
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAssignPermissions(role)}
              title="Assign Permissions"
            >
              <Shield className="h-4 w-4 mr-2" />
              Permissions
            </Button>
            {!role.is_system && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(role)}
                  title="Edit Role"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(role)}
                  title="Delete Role"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

