'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Menu, Edit2, Plus, GripVertical, Save, X, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useAdmin } from '@/lib/admin/hooks'

interface MenuItem {
  id: string
  label: string
  label_ar?: string
  href: string
  icon?: string
  description?: string
  permission_id?: string
  permission?: Permission
  is_active: boolean
  sort_order: number
  parent_id?: string
  children?: MenuItem[]
}

interface Permission {
  id: string
  name: string
  display_name: string
}

export default function AdminMenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({})
  const { toast } = useToast()
  const { permissions, refresh: refreshAdmin } = useAdmin()

  // Fetch menu items
  const fetchMenuItems = useCallback(async () => {
    try {
      setLoading(true)
      const menuRes = await safeFetch('/api/admin/menu?all=true')

      if (menuRes.ok) {
        const items = menuRes.data?.menuItems || []
        setMenuItems(items)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch menu items',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch menu items',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchMenuItems()
  }, [fetchMenuItems])

  // Build menu tree
  const buildMenuTree = useCallback((items: MenuItem[]): MenuItem[] => {
    const itemMap = new Map<string, MenuItem>()
    const roots: MenuItem[] = []

    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] })
    })

    items.forEach(item => {
      const menuItem = itemMap.get(item.id)!
      if (item.parent_id && itemMap.has(item.parent_id)) {
        const parent = itemMap.get(item.parent_id)!
        if (!parent.children) parent.children = []
        parent.children.push(menuItem)
      } else {
        roots.push(menuItem)
      }
    })

    const sortItems = (items: MenuItem[]) => {
      items.sort((a, b) => a.sort_order - b.sort_order)
      items.forEach(item => {
        if (item.children) {
          sortItems(item.children)
        }
      })
    }

    sortItems(roots)
    return roots
  }, [])

  const menuTree = useMemo(() => buildMenuTree(menuItems), [menuItems, buildMenuTree])

  // Filter menu items
  const filteredTree = useMemo(() => {
    if (!searchTerm) return menuTree

    const filterTree = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter(item => 
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.label_ar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.href.toLowerCase().includes(searchTerm.toLowerCase())
  )
        .map(item => ({
          ...item,
          children: item.children ? filterTree(item.children) : []
        }))
    }

    return filterTree(menuTree)
  }, [menuTree, searchTerm])

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, item: MenuItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetItem: MenuItem) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null)
      return
    }

    // Get all items at the same level
    const allItems = draggedItem.parent_id 
      ? menuItems.filter(item => item.parent_id === draggedItem.parent_id)
      : menuItems.filter(item => !item.parent_id)

    const draggedIndex = allItems.findIndex(item => item.id === draggedItem.id)
    const targetIndex = allItems.findIndex(item => item.id === targetItem.id)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null)
      return
    }

    // Reorder items
    const reordered = [...allItems]
    const [removed] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, removed)

    // Update sort orders
    const updates = reordered.map((item, index) => ({
      ...item,
      sort_order: index + 1
    }))

    try {
      // Update all affected items in bulk
      const res = await safeFetch('/api/admin/menu/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          items: updates.map(item => ({ id: item.id, sort_order: item.sort_order }))
        })
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Menu order updated successfully',
          type: 'default'
        })

        // Refresh menu items
        await fetchMenuItems()
        // Refresh sidebar
        await refreshAdmin()
      } else {
        throw new Error('Failed to update menu order')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update menu order',
        type: 'error'
      })
    }

    setDraggedItem(null)
  }

  // Handle edit
  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setEditForm({
      label: item.label,
      label_ar: item.label_ar,
      href: item.href,
      icon: item.icon,
      description: item.description,
      permission_id: item.permission_id,
      is_active: item.is_active,
      parent_id: item.parent_id
    })
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return

    try {
      // Clean up the form data - convert empty strings to null for optional fields
      const cleanedForm: Record<string, any> = {}
      
      if (editForm.label !== undefined) cleanedForm.label = editForm.label
      if (editForm.label_ar !== undefined) cleanedForm.label_ar = editForm.label_ar || null
      if (editForm.href !== undefined) cleanedForm.href = editForm.href
      if (editForm.icon !== undefined) cleanedForm.icon = editForm.icon || null
      if (editForm.description !== undefined) cleanedForm.description = editForm.description || null
      if (editForm.permission_id !== undefined) cleanedForm.permission_id = editForm.permission_id
      if (editForm.is_active !== undefined) cleanedForm.is_active = editForm.is_active
      if (editForm.parent_id !== undefined) cleanedForm.parent_id = editForm.parent_id || null
      if (editForm.sort_order !== undefined) cleanedForm.sort_order = editForm.sort_order

      const res = await safeFetch(`/api/admin/menu/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedForm)
      })

      console.log('Update response:', {
        ok: res.ok,
        status: res.status,
        error: res.error,
        data: res.data
      })

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Menu item updated successfully',
          type: 'default'
        })
        setEditingItem(null)
        await fetchMenuItems()
        await refreshAdmin()
      } else {
        // Extract error message from response - check multiple sources
        let errorMessage = 'Failed to update menu item'
        
        if (res.error) {
          errorMessage = res.error
        } else if (res.data) {
          if (typeof res.data === 'string') {
            errorMessage = res.data
          } else if (res.data.error) {
            errorMessage = res.data.error
          } else if (res.data.details) {
            errorMessage = res.data.details
          } else if (res.data.message) {
            errorMessage = res.data.message
          }
        }
        
        // Add status code if available
        if (res.status) {
          errorMessage += ` (Status: ${res.status})`
        }
        
        console.error('Update error:', {
          status: res.status,
          error: res.error,
          data: res.data,
          errorMessage
        })
        
        toast({
          title: 'Error',
          description: errorMessage,
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Update error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update menu item',
        type: 'error'
      })
    }
  }

  return (
    <PermissionGuard permission="admin:menu">
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">
            Manage menu items and their visibility by role. Drag and drop to reorder.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Menu Items</CardTitle>
                <CardDescription>Drag and drop to reorder menu items</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Menu className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading menu items...</div>
            ) : filteredTree.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No menu items found</div>
            ) : (
              <div className="space-y-2">
                {filteredTree.map(item => (
                  <MenuItemComponent
                    key={item.id}
                    item={item}
                    allItems={menuItems}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onEdit={handleEdit}
                    draggedItem={draggedItem}
                    level={0}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        {editingItem && (
          <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Menu Item</DialogTitle>
                <DialogDescription>
                  Update menu item details and permissions
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="label">Label (English)</Label>
                    <Input
                      id="label"
                      value={editForm.label || ''}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="label_ar">Label (Arabic)</Label>
                    <Input
                      id="label_ar"
                      value={editForm.label_ar || ''}
                      onChange={(e) => setEditForm({ ...editForm, label_ar: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="href">Path</Label>
                  <Input
                    id="href"
                    value={editForm.href || ''}
                    onChange={(e) => setEditForm({ ...editForm, href: e.target.value })}
                    placeholder="/path/to/page"
                  />
                </div>
                <div>
                  <Label htmlFor="icon">Icon (emoji or icon name)</Label>
                  <Input
                    id="icon"
                    value={editForm.icon || ''}
                    onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                    placeholder="🏠 or Home"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="permission">Permission</Label>
                  <Select
                    value={editForm.permission_id || 'none'}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, permission_id: value === 'none' ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select permission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Permission (Public)</SelectItem>
                      {permissions.map(perm => (
                        <SelectItem key={perm.id} value={perm.id}>
                          {perm.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editForm.is_active !== false}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </PermissionGuard>
  )
}

// Menu Item Component with drag and drop
function MenuItemComponent({
  item,
  allItems,
  onDragStart,
  onDragOver,
  onDrop,
  onEdit,
  draggedItem,
  level = 0
}: {
  item: MenuItem
  allItems: MenuItem[]
  onDragStart: (e: React.DragEvent, item: MenuItem) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, item: MenuItem) => void
  onEdit: (item: MenuItem) => void
  draggedItem: MenuItem | null
  level?: number
}) {
  const isDragging = draggedItem?.id === item.id
  const children = item.children || []

  return (
    <div className={`space-y-2 ${level > 0 ? 'ml-6' : ''}`}>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, item)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, item)}
        className={`
          border rounded-lg p-4 cursor-move transition-all
          ${isDragging ? 'opacity-50' : 'hover:shadow-md'}
          ${draggedItem && draggedItem.id !== item.id ? 'border-blue-300' : ''}
        `}
      >
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {item.icon && <span className="text-lg">{item.icon}</span>}
            <span className="font-medium">{item.label}</span>
            {item.label_ar && (
              <span className="text-sm text-muted-foreground">({item.label_ar})</span>
            )}
            {!item.is_active && (
              <Badge variant="secondary">Inactive</Badge>
            )}
            {item.permission && (
              <Badge variant="outline">{item.permission.display_name}</Badge>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          )}
          <div className="flex gap-2 mt-2">
            <Badge variant="outline" className="font-mono text-xs">
              {item.href}
            </Badge>
            <Badge variant="outline">Order: {item.sort_order}</Badge>
          </div>
        </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onEdit(item)}>
          <Edit2 className="h-4 w-4 mr-2" />
          Edit
        </Button>
        </div>
      </div>
      {children.length > 0 && (
        <div className="ml-4 space-y-2 border-l-2 pl-4">
          {children.map(child => (
            <MenuItemComponent
              key={child.id}
              item={child}
              allItems={allItems}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onEdit={onEdit}
              draggedItem={draggedItem}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
