'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// DropdownMenu and Tooltip components not available - using alternatives
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Shield, 
  Edit2, 
  Trash2, 
  Key, 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Plus, 
  Eye, 
  Copy,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
  onEdit: (role: Role) => void
  onDelete: (role: Role) => void
  onAssignPermissions: (role: Role) => void
  loading: boolean
}

const ITEMS_PER_PAGE = 10

export function RolesDataTable({ roles, onEdit, onDelete, onAssignPermissions, loading }: RolesDataTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'system' | 'custom'>('all')
  const [sortColumn, setSortColumn] = useState<keyof Role>('display_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [quickViewRole, setQuickViewRole] = useState<Role | null>(null)
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)

  const filteredAndSortedRoles = useMemo(() => {
    let filtered = roles.filter(role => {
      const matchesSearch = role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           role.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filter === 'all' || 
                           (filter === 'system' && role.is_system) || 
                           (filter === 'custom' && !role.is_system)
      return matchesSearch && matchesFilter
    })

    filtered.sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }
      return 0
    })

    return filtered
  }, [roles, searchTerm, filter, sortColumn, sortDirection])

  const paginatedRoles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSortedRoles.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredAndSortedRoles, currentPage])

  const totalPages = Math.ceil(filteredAndSortedRoles.length / ITEMS_PER_PAGE)

  const handleSort = (column: keyof Role) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(paginatedRoles.map(role => role.id)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const handleSelectRow = (roleId: string, checked: boolean) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(roleId)
    } else {
      newSelected.delete(roleId)
    }
    setSelectedRows(newSelected)
  }

  const handleBulkDelete = () => {
    selectedRows.forEach(roleId => {
      const role = roles.find(r => r.id === roleId)
      if (role) onDelete(role)
    })
    setSelectedRows(new Set())
  }

  const handleExportCSV = () => {
    const csvContent = [
      ['Name', 'Display Name', 'Description', 'System', 'Permissions Count', 'Users Count'],
      ...filteredAndSortedRoles.map(role => [
        role.name,
        role.display_name,
        role.description,
        role.is_system ? 'Yes' : 'No',
        role.permissions_count.toString(),
        role.users_count.toString()
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'roles.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleQuickView = (role: Role) => {
    setQuickViewRole(role)
    setIsQuickViewOpen(true)
  }

  const handleDuplicate = (role: Role) => {
    // Implement duplicate logic, perhaps call onEdit with a copy
    const duplicatedRole = { ...role, id: '', name: `${role.name}_copy`, display_name: `${role.display_name} (Copy)` }
    onEdit(duplicatedRole)
  }

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="p-4">
              <Checkbox
                checked={selectedRows.size === paginatedRoles.length && paginatedRoles.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </th>
            <th className="p-4 text-left cursor-pointer" onClick={() => handleSort('name')}>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role Name
                {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </div>
            </th>
            <th className="p-4 text-left cursor-pointer" onClick={() => handleSort('display_name')}>
              Display Name
              {sortColumn === 'display_name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="p-4 text-left">Description</th>
            <th className="p-4 text-center cursor-pointer" onClick={() => handleSort('permissions_count')}>
              Permissions
              {sortColumn === 'permissions_count' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="p-4 text-center cursor-pointer" onClick={() => handleSort('users_count')}>
              Users
              {sortColumn === 'users_count' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="p-4 text-center">Type</th>
            <th className="p-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedRoles.map(role => (
            <tr key={role.id} className="border-b hover:bg-gray-50">
              <td className="p-4">
                <Checkbox
                  checked={selectedRows.has(role.id)}
                  onCheckedChange={(checked) => handleSelectRow(role.id, checked as boolean)}
                />
              </td>
              <td className="p-4">
                <button
                  onClick={() => handleQuickView(role)}
                  className="text-blue-600 hover:underline"
                >
                  {role.name}
                </button>
              </td>
              <td className="p-4">{role.display_name}</td>
              <td className="p-4">
                <span className="truncate max-w-xs block" title={role.description}>{role.description}</span>
              </td>
              <td className="p-4 text-center">
                <Badge variant="secondary">{role.permissions_count}</Badge>
              </td>
              <td className="p-4 text-center">
                <Badge variant="secondary">{role.users_count}</Badge>
              </td>
              <td className="p-4 text-center">
                <Badge variant={role.is_system ? 'default' : 'outline'}>
                  {role.is_system ? 'System' : 'Custom'}
                </Badge>
              </td>
              <td className="p-4 text-center">
                <div className="flex gap-1 justify-center">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(role)} title="Edit Role">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(role)} title="Delete Role">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onAssignPermissions(role)} title="Assign Permissions">
                    <Key className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleQuickView(role)} title="View Details">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDuplicate(role)} title="Duplicate Role">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderCards = () => (
    <div className="grid gap-4 md:hidden">
      {paginatedRoles.map(role => (
        <Card key={role.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedRows.has(role.id)}
                  onCheckedChange={(checked) => handleSelectRow(role.id, checked as boolean)}
                />
                <Shield className="h-4 w-4" />
                <button
                  onClick={() => handleQuickView(role)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {role.display_name}
                </button>
              </div>
              <Badge variant={role.is_system ? 'default' : 'outline'}>
                {role.is_system ? 'System' : 'Custom'}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{role.description}</p>
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Badge variant="secondary">
                  <Key className="h-3 w-3 mr-1" />
                  {role.permissions_count}
                </Badge>
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {role.users_count}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(role)} title="Edit Role">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(role)} title="Delete Role">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onAssignPermissions(role)} title="Assign Permissions">
                  <Key className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleQuickView(role)} title="View Details">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDuplicate(role)} title="Duplicate Role">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
      <p className="text-gray-500 mb-4">Get started by creating your first role.</p>
      <Button onClick={() => onEdit({} as Role)}>
        <Plus className="h-4 w-4 mr-2" />
        Create First Role
      </Button>
    </div>
  )

  const renderPagination = () => (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-gray-700">
        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedRoles.length)} of {filteredAndSortedRoles.length} results
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm">Page {currentPage} of {totalPages}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filter} onValueChange={(value: 'all' | 'system' | 'custom') => setFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {selectedRows.size > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete Selected ({selectedRows.size})
            </Button>
          )}
        </div>

        {loading ? renderLoadingSkeleton() : filteredAndSortedRoles.length === 0 ? renderEmptyState() : (
          <>
            <div className="hidden md:block">
              {renderTable()}
            </div>
            <div className="md:hidden">
              {renderCards()}
            </div>
            {renderPagination()}
          </>
        )}

        <Dialog open={isQuickViewOpen} onOpenChange={setIsQuickViewOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {quickViewRole?.display_name}
              </DialogTitle>
            </DialogHeader>
            {quickViewRole && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Role Name</label>
                  <p className="text-sm text-gray-600">{quickViewRole.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-gray-600">{quickViewRole.description}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="text-sm font-medium">Permissions</label>
                    <Badge variant="secondary">{quickViewRole.permissions_count}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Users</label>
                    <Badge variant="secondary">{quickViewRole.users_count}</Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Badge variant={quickViewRole.is_system ? 'default' : 'outline'}>
                      {quickViewRole.is_system ? 'System' : 'Custom'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}