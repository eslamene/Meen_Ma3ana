'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Menu, Edit2, Plus, GripVertical, Save, X, Trash2, AlertTriangle, ChevronDown, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
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
  const [originalMenuItems, setOriginalMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null)
  const [dragOverItem, setDragOverItem] = useState<MenuItem | null>(null)
  const [dropPlaceholderIndex, setDropPlaceholderIndex] = useState<number | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set()) // Track expanded items
  const [hoveredDropZone, setHoveredDropZone] = useState<{ itemId: string; position: 'before' | 'after' } | null>(null) // Track hovered drop zone
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
        setOriginalMenuItems(JSON.parse(JSON.stringify(items))) // Deep copy for comparison
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

  // Expand all items by default when menu loads
  useEffect(() => {
    if (menuItems.length > 0 && expandedItems.size === 0) {
      const allItemIds = new Set(menuItems.map(item => item.id))
      setExpandedItems(allItemIds)
    }
  }, [menuItems, expandedItems.size])

  // Toggle expand/collapse for an item
  const toggleExpand = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  // Expand all items
  const expandAll = useCallback(() => {
    const allItemIds = new Set(menuItems.map(item => item.id))
    setExpandedItems(allItemIds)
  }, [menuItems])

  // Collapse all items
  const collapseAll = useCallback(() => {
    setExpandedItems(new Set())
  }, [])

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

  // Check if item is descendant of another item (to prevent invalid drops)
  const isDescendant = useCallback((parentId: string, childId: string, items: MenuItem[]): boolean => {
    const findItem = (id: string, tree: MenuItem[]): MenuItem | undefined => {
      for (const item of tree) {
        if (item.id === id) return item
        if (item.children) {
          const found = findItem(id, item.children)
          if (found) return found
        }
      }
      return undefined
    }

    const checkDescendants = (item: MenuItem, targetId: string): boolean => {
      if (item.id === targetId) return true
      if (!item.children || item.children.length === 0) return false
      return item.children.some(child => checkDescendants(child, targetId))
    }

    const parent = findItem(parentId, items)
    return parent ? checkDescendants(parent, childId) : false
  }, [])

  // Simple drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: MenuItem) => {
    setDraggedItem(item)
    setDragOverItem(null)
    setDropPlaceholderIndex(null)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.id)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
    setDropPlaceholderIndex(null)
    setHoveredDropZone(null)
  }

  const handleDragOver = (e: React.DragEvent, item: MenuItem, position?: 'before' | 'after' | 'on') => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem.id === item.id) {
      return
    }

    // Prevent dropping parent into its own child
    if (isDescendant(draggedItem.id, item.id, menuTree)) {
      e.dataTransfer.dropEffect = 'none'
      return
    }

    // Store drop position for between-item drops
    if (position && (position === 'before' || position === 'after')) {
      (e.nativeEvent as any).dropPosition = position
    }

    e.dataTransfer.dropEffect = 'move'
    setDragOverItem(item)
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, targetItem: MenuItem) => {
    e.preventDefault()

    if (!draggedItem || draggedItem.id === targetItem.id) {
      handleDragEnd()
      return
    }

    // Prevent dropping parent into its own child
    if (isDescendant(draggedItem.id, targetItem.id, menuTree)) {
      toast({
        title: 'Invalid Operation',
        description: 'Cannot move a parent item into its own child',
        type: 'error'
      })
      handleDragEnd()
      return
    }

    // Check if dropping between items (drop position indicator)
    const dropPosition = (e.nativeEvent as any).dropPosition
    if (dropPosition === 'before' || dropPosition === 'after') {
      // Reorder at same level
      const targetParentId = targetItem.parent_id || null
      const draggedParentId = draggedItem.parent_id || null
      
      // Allow reordering if both items are at the same level
      if (targetParentId === draggedParentId) {
        // Get all siblings at the target level
        const siblings = menuItems.filter(item => {
          const itemParentId = item.parent_id || null
          return itemParentId === targetParentId && item.id !== draggedItem.id
        })
        
        siblings.sort((a, b) => a.sort_order - b.sort_order)
        
        const targetIndex = siblings.findIndex(item => item.id === targetItem.id)
        const insertIndex = dropPosition === 'before' ? targetIndex : targetIndex + 1
        
        const reorderedSiblings = [
          ...siblings.slice(0, insertIndex),
          { ...draggedItem, parent_id: targetParentId || undefined },
          ...siblings.slice(insertIndex)
        ]

        const updatedItems = menuItems.map(item => {
          if (item.id === draggedItem.id) {
            return {
              ...item,
              parent_id: targetParentId || undefined,
              sort_order: insertIndex + 1
            }
          }
          
          const siblingIndex = reorderedSiblings.findIndex(ri => ri.id === item.id)
          if (siblingIndex !== -1) {
            return {
              ...item,
              sort_order: siblingIndex + 1
            }
          }
          
          return item
        })

        setMenuItems(updatedItems)
        setHoveredDropZone(null)
        handleDragEnd()
        return
      }
    }

    // Default: move as child of target (nest)
    const newParentId = targetItem.id

    // Get all items at the target level (children of target)
    const siblings = menuItems.filter(item => {
      const itemParentId = item.parent_id || null
      return itemParentId === newParentId && item.id !== draggedItem.id
    })
    
    // Sort siblings by current sort_order
    siblings.sort((a, b) => a.sort_order - b.sort_order)

    // Place dragged item at end of children
    const reorderedSiblings = [...siblings, { ...draggedItem, parent_id: newParentId || undefined }]

    // Update all items
    const updatedItems = menuItems.map(item => {
      if (item.id === draggedItem.id) {
        return {
          ...item,
          parent_id: newParentId || undefined,
          sort_order: reorderedSiblings.length
        }
      }
      
      const siblingIndex = reorderedSiblings.findIndex(ri => ri.id === item.id)
      if (siblingIndex !== -1) {
        return {
          ...item,
          sort_order: siblingIndex + 1
        }
      }
      
      return item
    })

    setMenuItems(updatedItems)
    handleDragEnd()
  }

  // Handle drop on root placeholder - move item to root level at specific position
  const handleRootPlaceholderDrop = (index: number) => {
    if (!draggedItem || !draggedItem.parent_id) {
      return
    }

    // Get all root items (excluding dragged item)
    const rootItems = menuItems.filter(item => !item.parent_id && item.id !== draggedItem.id)
    rootItems.sort((a, b) => a.sort_order - b.sort_order)

    // Insert dragged item at the specified index
    const reorderedRootItems = [
      ...rootItems.slice(0, index),
      { ...draggedItem, parent_id: undefined },
      ...rootItems.slice(index)
    ]

    // Update all items
    const updatedItems = menuItems.map(item => {
      if (item.id === draggedItem.id) {
        return {
          ...item,
          parent_id: undefined,
          sort_order: index + 1
        }
      }
      
      const rootIndex = reorderedRootItems.findIndex(ri => ri.id === item.id)
      if (rootIndex !== -1) {
        return {
          ...item,
          sort_order: rootIndex + 1
        }
      }
      
      return item
    })

    setMenuItems(updatedItems)
    handleDragEnd()
  }

  // Check if there are unsaved changes by comparing with original
  const hasUnsavedChanges = useMemo(() => {
    if (originalMenuItems.length === 0) return false
    
    const originalMap = new Map(originalMenuItems.map(item => [item.id, item]))
    
    for (const item of menuItems) {
      const original = originalMap.get(item.id)
      if (!original) return true
      
      if (item.parent_id !== original.parent_id || 
          item.sort_order !== original.sort_order) {
        return true
      }
    }
    
    return false
  }, [menuItems, originalMenuItems])

  // Save all changes
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges) return

    setIsSaving(true)
    try {
      // Recalculate sort orders for all items by level
      const updateItemOrders = (items: MenuItem[], parentId: string | null = null): Array<{ id: string; sort_order: number; parent_id: string | null }> => {
        const levelItems = items
          .filter(item => (item.parent_id || null) === parentId)
          .sort((a, b) => a.sort_order - b.sort_order)
        
        const updates: Array<{ id: string; sort_order: number; parent_id: string | null }> = []
        
        levelItems.forEach((item, index) => {
          updates.push({
            id: item.id,
            sort_order: index + 1,
            parent_id: parentId
          })
          
          // Recursively update children
          const childUpdates = updateItemOrders(items, item.id)
          updates.push(...childUpdates)
        })
        
        return updates
      }

      const allUpdates = updateItemOrders(menuItems)

      // Update parent_id and sort_order for all affected items
      const updatePromises = allUpdates.map(update => 
        safeFetch(`/api/admin/menu/${update.id}`, {
        method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            parent_id: update.parent_id,
            sort_order: update.sort_order
          })
        })
      )

      await Promise.all(updatePromises)

      // Also update sort orders via bulk reorder endpoint
      await safeFetch('/api/admin/menu/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          items: allUpdates.map(u => ({ id: u.id, sort_order: u.sort_order }))
        })
      })

        toast({
          title: 'Success',
        description: 'Menu order saved successfully',
          type: 'default'
        })

        await fetchMenuItems()
        await refreshAdmin()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save menu order',
        type: 'error'
      })
    } finally {
      setIsSaving(false)
    }
    }

  // Discard changes
  const handleDiscardChanges = async () => {
    await fetchMenuItems()
    handleDragEnd()
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

        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">
                    You have unsaved changes
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your menu order changes are not saved yet. Click &quot;Save Changes&quot; to apply them.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDiscardChanges}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Discard
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Menu Items</CardTitle>
                <CardDescription>Drag and drop to reorder menu items</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                  className="text-xs"
                >
                  <Maximize2 className="h-3 w-3 mr-1" />
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  className="text-xs"
                >
                  <Minimize2 className="h-3 w-3 mr-1" />
                  Collapse All
                </Button>
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
                {/* Root level drop placeholders - only show when dragging a sub-item */}
                {draggedItem && draggedItem.parent_id && (
                  <>
                    {/* Placeholder at start */}
                    <div
                      className={`
                        h-12 border-2 border-dashed rounded-lg transition-all duration-200
                        ${dropPlaceholderIndex === 0 
                          ? 'border-blue-500 bg-blue-50 border-solid' 
                          : 'border-gray-300 bg-gray-50 opacity-50'
                        }
                      `}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        e.dataTransfer.dropEffect = 'move'
                        setDropPlaceholderIndex(0)
                        setDragOverItem(null)
                      }}
                      onDragLeave={() => {
                        setDropPlaceholderIndex(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRootPlaceholderDrop(0)
                      }}
                    >
                      <div className="flex items-center justify-center h-full">
                        <span className="text-xs text-gray-500">
                          {dropPlaceholderIndex === 0 ? 'Drop here to move to root level' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Placeholders between items */}
                    {filteredTree.map((item, index) => (
                      <div key={`placeholder-${item.id}`}>
                        <MenuItemComponent
                          item={item}
                          allItems={menuItems}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDragEnd={handleDragEnd}
                          onDrop={handleDrop}
                          onEdit={handleEdit}
                          draggedItem={draggedItem}
                          dragOverItem={dragOverItem}
                          level={0}
                          expandedItems={expandedItems}
                          onToggleExpand={toggleExpand}
                          hoveredDropZone={hoveredDropZone}
                          setHoveredDropZone={setHoveredDropZone}
                        />
                        {/* Placeholder after each item */}
                        <div
                          className={`
                            h-12 border-2 border-dashed rounded-lg transition-all duration-200 mt-2
                            ${dropPlaceholderIndex === index + 1 
                              ? 'border-blue-500 bg-blue-50 border-solid' 
                              : 'border-gray-300 bg-gray-50 opacity-50'
                            }
                          `}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            e.dataTransfer.dropEffect = 'move'
                            setDropPlaceholderIndex(index + 1)
                            setDragOverItem(null)
                          }}
                          onDragLeave={() => {
                            setDropPlaceholderIndex(null)
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleRootPlaceholderDrop(index + 1)
                          }}
                        >
                          <div className="flex items-center justify-center h-full">
                            <span className="text-xs text-gray-500">
                              {dropPlaceholderIndex === index + 1 ? 'Drop here to move to root level' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Normal view when not dragging a sub-item */}
                {(!draggedItem || !draggedItem.parent_id) && (
                  <>
                    {filteredTree.map((item, index) => (
                      <React.Fragment key={item.id}>
                        {/* Drop zone before item */}
                        <div
                          className={`
                            h-2 border-t-2 border-dashed transition-all duration-200
                            ${dragOverItem?.id === item.id && dropPlaceholderIndex === index * 2
                              ? 'border-blue-500 bg-blue-50 border-solid h-8' 
                              : draggedItem ? 'border-gray-300 opacity-30' : 'border-transparent'
                            }
                          `}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            e.dataTransfer.dropEffect = 'move'
                            setDropPlaceholderIndex(index * 2)
                            handleDragOver(e, item, 'before')
                          }}
                          onDragLeave={() => {
                            if (dropPlaceholderIndex === index * 2) {
                              setDropPlaceholderIndex(null)
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            ;(e.nativeEvent as any).dropPosition = 'before'
                            handleDrop(e, item)
                            setDropPlaceholderIndex(null)
                          }}
                        />
                        <MenuItemComponent
                          item={item}
                          allItems={menuItems}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDragEnd={handleDragEnd}
                          onDrop={handleDrop}
                          onEdit={handleEdit}
                          draggedItem={draggedItem}
                          dragOverItem={dragOverItem}
                          level={0}
                          expandedItems={expandedItems}
                          onToggleExpand={toggleExpand}
                          hoveredDropZone={hoveredDropZone}
                          setHoveredDropZone={setHoveredDropZone}
                        />
                        {/* Drop zone after item */}
                        <div
                          className={`
                            h-2 border-t-2 border-dashed transition-all duration-200
                            ${dragOverItem?.id === item.id && dropPlaceholderIndex === index * 2 + 1
                              ? 'border-blue-500 bg-blue-50 border-solid h-8' 
                              : draggedItem ? 'border-gray-300 opacity-30' : 'border-transparent'
                            }
                          `}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            e.dataTransfer.dropEffect = 'move'
                            setDropPlaceholderIndex(index * 2 + 1)
                            handleDragOver(e, item, 'after')
                          }}
                          onDragLeave={() => {
                            if (dropPlaceholderIndex === index * 2 + 1) {
                              setDropPlaceholderIndex(null)
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            ;(e.nativeEvent as any).dropPosition = 'after'
                            handleDrop(e, item)
                            setDropPlaceholderIndex(null)
                          }}
                        />
                      </React.Fragment>
                    ))}
                  </>
                )}
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

// Simple Menu Item Component
function MenuItemComponent({
  item,
  allItems,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  onEdit,
  draggedItem,
  dragOverItem,
  level = 0,
  expandedItems,
  onToggleExpand,
  hoveredDropZone,
  setHoveredDropZone
}: {
  item: MenuItem
  allItems: MenuItem[]
  onDragStart: (e: React.DragEvent, item: MenuItem) => void
  onDragOver: (e: React.DragEvent, item: MenuItem, position?: 'before' | 'after' | 'on') => void
  onDragLeave: () => void
  onDragEnd: () => void
  onDrop: (e: React.DragEvent, item: MenuItem) => void
  onEdit: (item: MenuItem) => void
  draggedItem: MenuItem | null
  dragOverItem: MenuItem | null
  level?: number
  expandedItems: Set<string>
  onToggleExpand: (itemId: string) => void
  hoveredDropZone: { itemId: string; position: 'before' | 'after' } | null
  setHoveredDropZone: (zone: { itemId: string; position: 'before' | 'after' } | null) => void
}) {
  const isDragging = draggedItem?.id === item.id
  const isDragOver = dragOverItem?.id === item.id
  const children = item.children || []
  const hasChildren = children.length > 0
  const isExpanded = expandedItems.has(item.id)

  return (
    <div className={`space-y-2 ${level > 0 ? 'ml-4' : ''}`}>
      <div
        draggable={true}
        data-menu-item={item.id}
        onDragStart={(e) => onDragStart(e, item)}
        onDragOver={(e) => {
          // Only highlight on direct hover (not between items)
          if (!isDragging) {
            onDragOver(e, item, 'on')
          }
        }}
        onDragLeave={onDragLeave}
        onDragEnd={onDragEnd}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation() // Stop propagation to prevent container drop
          ;(e.nativeEvent as any).dropPosition = 'on'
          onDrop(e, item)
        }}
        className={`
          border-2 rounded-lg px-3 py-2 cursor-move transition-all
          ${isDragging ? 'opacity-50' : ''}
          ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <GripVertical 
              className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0"
            />
            {/* Expand/Collapse button */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleExpand(item.id)
                }}
                className="flex-shrink-0 p-0.5 hover:bg-gray-100 rounded transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-5 flex-shrink-0" /> // Spacer for alignment when no children
            )}
            {item.icon && (
              <span className="text-base sm:text-lg flex-shrink-0">{item.icon}</span>
            )}
            <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
              <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
                {item.label_ar && (
                <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline truncate">
                  ({item.label_ar})
                </span>
                )}
              <div className="flex items-center gap-1 flex-shrink-0">
                {!item.is_active && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">Inactive</Badge>
                )}
                {item.permission && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 hidden md:inline-flex">
                    {item.permission.display_name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Badge variant="outline" className="font-mono text-xs px-1.5 py-0 hidden sm:inline-flex">
                  {item.href}
                </Badge>
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                #{item.sort_order}
              </Badge>
              </div>
            </div>
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 px-2 sm:px-3 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(item)
            }}
            type="button"
          >
            <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-4 space-y-2 border-l-2 border-gray-200 pl-4">
          {children.map((child, childIndex) => {
            const beforeZoneId = `${child.id}-before`
            const afterZoneId = `${child.id}-after`
            const isBeforeHovered = hoveredDropZone?.itemId === child.id && hoveredDropZone?.position === 'before'
            const isAfterHovered = hoveredDropZone?.itemId === child.id && hoveredDropZone?.position === 'after'
            
            return (
              <React.Fragment key={child.id}>
                {/* Drop zone before child */}
                <div
                  className={`
                    h-2 border-t-2 border-dashed transition-all duration-200
                    ${isBeforeHovered
                      ? 'border-blue-500 bg-blue-50 border-solid h-8' 
                      : draggedItem ? 'border-gray-300 opacity-50 h-4' : 'border-transparent h-2'
                    }
                  `}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.dataTransfer.dropEffect = 'move'
                    setHoveredDropZone({ itemId: child.id, position: 'before' })
                    onDragOver(e, child, 'before')
                  }}
                  onDragLeave={(e) => {
                    // Only clear if we're actually leaving the drop zone
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const x = e.clientX
                    const y = e.clientY
                    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                      if (hoveredDropZone?.itemId === child.id && hoveredDropZone?.position === 'before') {
                        setHoveredDropZone(null)
                      }
                      onDragLeave()
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    ;(e.nativeEvent as any).dropPosition = 'before'
                    onDrop(e, child)
                    setHoveredDropZone(null)
                  }}
                />
                <MenuItemComponent
                  item={child}
                  allItems={allItems}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDragEnd={onDragEnd}
                  onDrop={onDrop}
                  onEdit={onEdit}
                  draggedItem={draggedItem}
                  dragOverItem={dragOverItem}
                  level={level + 1}
                  expandedItems={expandedItems}
                  onToggleExpand={onToggleExpand}
                />
                {/* Drop zone after child */}
                <div
                  className={`
                    h-2 border-t-2 border-dashed transition-all duration-200
                    ${isAfterHovered
                      ? 'border-blue-500 bg-blue-50 border-solid h-8' 
                      : draggedItem ? 'border-gray-300 opacity-50 h-4' : 'border-transparent h-2'
                    }
                  `}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.dataTransfer.dropEffect = 'move'
                    setHoveredDropZone({ itemId: child.id, position: 'after' })
                    onDragOver(e, child, 'after')
                  }}
                  onDragLeave={(e) => {
                    // Only clear if we're actually leaving the drop zone
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    const x = e.clientX
                    const y = e.clientY
                    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                      if (hoveredDropZone?.itemId === child.id && hoveredDropZone?.position === 'after') {
                        setHoveredDropZone(null)
                      }
                      onDragLeave()
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    ;(e.nativeEvent as any).dropPosition = 'after'
                    onDrop(e, child)
                    setHoveredDropZone(null)
                  }}
                />
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
