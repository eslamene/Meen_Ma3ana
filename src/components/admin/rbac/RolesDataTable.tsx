'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, Shield, Users, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
    <div className="space-y-3">
      {roles.map((role) => (
        <div
          key={role.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-all duration-200"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-sm shrink-0">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                    {role.display_name}
                  </h3>
                  {role.is_system && (
                    <Badge variant="default" className="text-xs font-semibold shrink-0">
                      System
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                  {role.description || role.name}
                </p>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="font-medium">{role.permissions_count}</span>
                    <span className="hidden sm:inline">{role.permissions_count === 1 ? 'permission' : 'permissions'}</span>
                    <span className="sm:hidden">perms</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="font-medium">{role.users_count}</span>
                    <span className="hidden sm:inline">{role.users_count === 1 ? 'user' : 'users'}</span>
                    <span className="sm:hidden">users</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop: Show all buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAssignPermissions(role)}
                className="h-8 text-xs font-medium"
              >
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Permissions
              </Button>
              {!role.is_system && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(role)}
                    className="h-8 w-8 p-0 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
                    title="Edit Role"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(role)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                    title="Delete Role"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
            
            {/* Mobile: Dropdown menu */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => onAssignPermissions(role)}
                    className="flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Permissions</span>
                  </DropdownMenuItem>
                  {!role.is_system && (
                    <>
                      <DropdownMenuItem
                        onClick={() => onEdit(role)}
                        className="flex items-center gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Edit Role</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(role)}
                        className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Role</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

