'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Menu, Edit2, Save, X, Trash2, AlertTriangle, Plus, Copy } from 'lucide-react'
import { EditPageHeader, EditPageFooter } from '@/components/crud'
import { useParams } from 'next/navigation'
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
import IconPicker from '@/components/ui/icon-picker'
import { useAdmin } from '@/lib/admin/hooks'
import { SortableTree, SimpleTreeItemWrapper, TreeItemComponentProps } from 'dnd-kit-sortable-tree'
import type { TreeItems } from 'dnd-kit-sortable-tree'
import DynamicIcon from '@/components/ui/dynamic-icon'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  is_public_nav?: boolean
  nav_metadata?: {
    isHashLink?: boolean
    showOnLanding?: boolean
    showOnOtherPages?: boolean
  }
}

interface Permission {
  id: string
  name: string
  display_name: string
}

// Convert MenuItem to TreeItems format
function convertToTreeItems(items: MenuItem[]): TreeItems<MenuItem> {
  return items.map(item => {
    const { children, ...rest } = item
    return {
      id: item.id,
      // Ensure id is in data as well for easy access
      data: { ...rest, id: item.id } as MenuItem,
      children: children && children.length > 0 ? convertToTreeItems(children) : []
    } as unknown as TreeItems<MenuItem>[0]
  }) as unknown as TreeItems<MenuItem>
}

// Convert TreeItems back to MenuItem format
// Note: sort_order and parent_id will be recalculated in flattenTree based on tree position
function convertFromTreeItems(treeItems: TreeItems<MenuItem>): MenuItem[] {
  return treeItems.map(item => {
    const treeItem = item as any
    // Extract data but don't preserve parent_id or sort_order - they'll be recalculated from tree structure
    const { parent_id, sort_order, ...restData } = treeItem.data
    return {
      id: treeItem.id,
      ...restData,
      children: treeItem.children && treeItem.children.length > 0 ? convertFromTreeItems(treeItem.children) : []
    }
  })
}

// Build tree from flat array - properly handles parent_id and sort_order
function buildTree(items: MenuItem[]): MenuItem[] {
  const itemMap = new Map<string, MenuItem>()
  const roots: MenuItem[] = []

  // Create map of all items
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] })
  })

  // Build tree structure
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

  // Sort items by sort_order at each level
  const sortItems = (items: MenuItem[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order)
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        sortItems(item.children)
      }
    })
  }

  sortItems(roots)
  return roots
}

// Flatten tree to array for saving
// This function recalculates sort_order and parent_id based on the current tree order
function flattenTree(items: MenuItem[], parentId: string | null | undefined = null, result: MenuItem[] = []): MenuItem[] {
  items.forEach((item, index) => {
    // Create flat item with updated sort_order and parent_id based on current tree position
    // Use null for root items (no parent), not undefined
    const flatItem: MenuItem = {
      ...item,
      parent_id: parentId || undefined, // Convert undefined to null for root items
      sort_order: index, // Use index as sort_order (0-based)
      children: undefined // Remove children before saving
    }
    delete flatItem.children
    result.push(flatItem)
    
    // Recursively flatten children with their parent's ID
    if (item.children && item.children.length > 0) {
      flattenTree(item.children, item.id, result)
    }
  })
  return result
}

export default function AdminMenuPage() {
  const { containerVariant } = useLayout()
  const params = useParams()
  const locale = params.locale as string
  const [treeItems, setTreeItems] = useState<TreeItems<MenuItem>>([])
  const [originalTreeItems, setOriginalTreeItems] = useState<TreeItems<MenuItem>>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { permissions, refresh: refreshAdmin } = useAdmin()
  const hasShownUnsavedToast = useRef(false)

  // Fetch menu items - API returns flat list, we build tree structure
  const fetchMenuItems = useCallback(async () => {
    try {
      setLoading(true)
      const menuRes = await safeFetch('/api/admin/menu?all=true')

      if (menuRes.ok) {
        const flatItems = menuRes.data?.menuItems || []
        
        // Build tree structure from flat list
        const tree = buildTree(flatItems)
        
        // Convert to TreeItems format
        const converted = convertToTreeItems(tree)
        setTreeItems(converted)
        setOriginalTreeItems(JSON.parse(JSON.stringify(converted)))
      } else {
        toast.error('Error', {
          description: 'Failed to fetch menu items'
        })
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to fetch menu items'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMenuItems()
  }, [fetchMenuItems])

  // Filter menu items
  const filteredTreeItems = useMemo(() => {
    if (!searchTerm) return treeItems

    const filterTree = (items: TreeItems<MenuItem>): TreeItems<MenuItem> => {
      return items
        .filter(item => {
          const menuItem = item as MenuItem
          return (
            menuItem.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            menuItem.label_ar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            menuItem.href.toLowerCase().includes(searchTerm.toLowerCase())
          )
        })
        .map(item => ({
          ...item,
          children: item.children && item.children.length > 0 ? filterTree(item.children) : []
        }))
    }

    return filterTree(treeItems)
  }, [treeItems, searchTerm])

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(treeItems) !== JSON.stringify(originalTreeItems)
  }, [treeItems, originalTreeItems])

  // Show toast when unsaved changes are detected
  useEffect(() => {
    if (hasUnsavedChanges && !hasShownUnsavedToast.current && !loading) {
      toast.warning('You have unsaved changes', {
        description: 'Your menu order changes are not saved yet. Click "Save Changes" to apply them.',
        duration: 5000,
      })
      hasShownUnsavedToast.current = true
    } else if (!hasUnsavedChanges) {
      // Reset when changes are saved
      hasShownUnsavedToast.current = false
    }
  }, [hasUnsavedChanges, loading])

  // Discard changes
  const handleDiscardChanges = useCallback(() => {
    setTreeItems(JSON.parse(JSON.stringify(originalTreeItems)))
    hasShownUnsavedToast.current = false
    toast('Changes Discarded', {
      description: 'All unsaved changes have been discarded'
    })
  }, [originalTreeItems])

  // Save all changes
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges) return

    try {
      setIsSaving(true)
      
      // Convert TreeItems back to MenuItem tree
      const menuTree = convertFromTreeItems(treeItems)
      
      // Flatten for saving - this recalculates sort_order based on tree position
      const flatItems = flattenTree(menuTree)
      
      // Debug: Log the items being saved with parent_id changes
      console.log('Saving menu items with updated structure:', flatItems.map(item => ({
        id: item.id,
        label: item.label,
        href: item.href,
        parent_id: item.parent_id,
        sort_order: item.sort_order,
        parent_id_type: typeof item.parent_id,
        parent_id_value: item.parent_id
      })))
      
      // Prepare updates: both sort_order and parent_id
      // Ensure parent_id is null (not undefined) for root items
      const updates = flatItems.map(item => ({
        id: item.id,
        sort_order: item.sort_order,
        parent_id: item.parent_id || null // Use null for root items, not undefined
      }))

      // Update all items in parallel
      const updatePromises = updates.map(async (update) => {
        // Always include parent_id (even if null) to ensure parent changes are saved
        const updateBody: { sort_order: number; parent_id: string | null } = {
          sort_order: update.sort_order,
          parent_id: update.parent_id ?? null // Explicitly use null for undefined values
        }
        
        console.log(`Updating menu item ${update.id}:`, updateBody)
        
        const response = await safeFetch(`/api/admin/menu/${update.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody)
        })
        
        if (!response.ok) {
          const errorData = await response.data.error.catch(() => ({}))
          console.error(`Failed to update menu item ${update.id}:`, errorData, 'Update body was:', updateBody)
        }
        
        return response
      })

      const results = await Promise.all(updatePromises)
      
      // Check for errors and log details
      const errors = results.filter(res => !res.ok)
      if (errors.length > 0) {
        const errorDetails = await Promise.all(
          errors.map(async (res) => {
            try {
              return await res.data.error
            } catch {
              return { error: 'Unknown error' }
            }
          })
        )
        console.error('Menu update errors:', errorDetails)
        throw new Error(`Failed to update ${errors.length} menu items. Check console for details.`)
      }

      toast.success('Success', {
        description: 'Menu order and structure saved successfully'
      })
      await fetchMenuItems() // Refresh to get updated data
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save menu order'
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle items changed from SortableTree
  const handleItemsChanged = useCallback((newItems: TreeItems<MenuItem>) => {
    setTreeItems(newItems)
  }, [])

  // Handle add new menu item
  const handleAdd = useCallback(() => {
    setIsAdding(true)
    setEditingItem(null)
    setEditForm({
      label: '',
      label_ar: '',
      href: '',
      icon: '',
      description: '',
      permission_id: undefined,
      is_active: true,
      parent_id: undefined,
      is_public_nav: false,
      nav_metadata: {}
    })
  }, [])

  // Handle duplicate menu item
  const handleDuplicate = useCallback((item: MenuItem) => {
    setIsAdding(true)
    setEditingItem(null)
    setEditForm({
      label: `${item.label} (Copy)`,
      label_ar: item.label_ar ? `${item.label_ar} (نسخة)` : '',
      href: `${item.href}-copy`,
      icon: item.icon || '',
      description: item.description || '',
      permission_id: item.permission_id,
      is_active: item.is_active,
      parent_id: item.parent_id,
      is_public_nav: item.is_public_nav || false,
      nav_metadata: item.nav_metadata ? { ...item.nav_metadata } : {}
    })
  }, [])

  // Handle edit
  const handleEdit = useCallback((item: MenuItem) => {
    setIsAdding(false)
    setEditingItem(item)
    setEditForm({
      label: item.label,
      label_ar: item.label_ar || '',
      href: item.href,
      icon: item.icon || '',
      description: item.description || '',
      permission_id: item.permission_id,
      is_active: item.is_active,
      parent_id: item.parent_id,
      is_public_nav: item.is_public_nav || false,
      nav_metadata: item.nav_metadata || {}
    })
  }, [])

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true)
      
      const cleanedForm: Record<string, any> = {}
      
      if (editForm.label !== undefined) cleanedForm.label = editForm.label
      if (editForm.label_ar !== undefined) cleanedForm.label_ar = editForm.label_ar || null
      if (editForm.href !== undefined) cleanedForm.href = editForm.href
      if (editForm.icon !== undefined) cleanedForm.icon = editForm.icon || null
      if (editForm.description !== undefined) cleanedForm.description = editForm.description || null
      // Handle permission_id: send null explicitly if it's null/empty, otherwise send the value
      if (editForm.permission_id !== undefined) {
        cleanedForm.permission_id = editForm.permission_id || null
      }
      if (editForm.is_active !== undefined) cleanedForm.is_active = editForm.is_active
      if (editForm.parent_id !== undefined) cleanedForm.parent_id = editForm.parent_id || null
      if (editForm.sort_order !== undefined) cleanedForm.sort_order = editForm.sort_order
      if (editForm.is_public_nav !== undefined) cleanedForm.is_public_nav = editForm.is_public_nav || false
      if (editForm.nav_metadata !== undefined) cleanedForm.nav_metadata = editForm.nav_metadata || {}

      if (isAdding) {
        // Create new menu item
        console.log('Creating menu item:', cleanedForm)

        const res = await safeFetch('/api/admin/menu', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(cleanedForm)
        })

        if (res.ok) {
          toast.success('Success', {
            description: 'Menu item created successfully'
          })
          setIsAdding(false)
          setEditingItem(null)
          await fetchMenuItems()
          await refreshAdmin()
        } else {
          const errorMessage = res.error || res.data?.error || res.data?.details || `Failed to create menu item (Status: ${res.status})`
          
          console.error('Menu item creation failed:', {
            status: res.status,
            error: res.error,
            data: res.data,
            fullResponse: res
          })
          
          // Show more detailed error message
          const detailedError = res.data?.details 
            ? `${res.data.error || 'Failed to create menu item'}: ${res.data.details}`
            : errorMessage
          
          throw new Error(detailedError)
        }
      } else {
        // Update existing menu item
        if (!editingItem) return

        console.log('Updating menu item:', {
          id: editingItem.id,
          cleanedForm,
          formKeys: Object.keys(cleanedForm)
        })

        const res = await safeFetch(`/api/admin/menu/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(cleanedForm)
        })

        if (res.ok) {
          toast.success('Success', {
            description: 'Menu item updated successfully'
          })
          setEditingItem(null)
          await fetchMenuItems()
          await refreshAdmin()
        } else {
          // safeFetch returns a custom object with error details
          const errorMessage = res.error || res.data?.error || res.data?.details || `Failed to update menu item (Status: ${res.status})`
          
          // Log full error details for debugging
          console.error('Menu item update failed:', {
            status: res.status,
            error: res.error,
            data: res.data,
            menuItemId: editingItem.id,
            cleanedForm: cleanedForm,
            responseKeys: res.data ? Object.keys(res.data) : []
          })
          
          // Show user-friendly error message
          const userMessage = res.data?.details 
            ? `${res.data.error || 'Failed to update menu item'}: ${res.data.details}`
            : errorMessage
          
          throw new Error(userMessage)
        }
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error', {
        description: error instanceof Error ? error.message : (isAdding ? 'Failed to create menu item' : 'Failed to update menu item')
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete
  const handleDelete = useCallback((item: MenuItem) => {
    // Find item in tree to check for children
    const findInTree = (items: TreeItems<MenuItem>, id: string): TreeItems<MenuItem>[0] | null => {
      for (const treeItem of items) {
        if (treeItem.id === id) return treeItem
        if (treeItem.children) {
          const found = findInTree(treeItem.children, id)
          if (found) return found
        }
      }
      return null
    }

    const treeItem = findInTree(treeItems, item.id)
    if (treeItem?.children && treeItem.children.length > 0) {
      setDeletingItem({ ...item, children: convertFromTreeItems(treeItem.children) })
    } else {
      setDeletingItem(item)
    }
  }, [treeItems])

  // Handle custom events from TreeItemComponent
  useEffect(() => {
    const handleMenuItemEdit = (e: CustomEvent) => {
      handleEdit(e.detail as MenuItem)
    }

    const handleMenuItemDuplicate = (e: CustomEvent) => {
      handleDuplicate(e.detail as MenuItem)
    }

    const handleMenuItemDelete = (e: CustomEvent) => {
      handleDelete(e.detail as MenuItem)
    }

    window.addEventListener('menu-item-edit', handleMenuItemEdit as EventListener)
    window.addEventListener('menu-item-duplicate', handleMenuItemDuplicate as EventListener)
    window.addEventListener('menu-item-delete', handleMenuItemDelete as EventListener)

    return () => {
      window.removeEventListener('menu-item-edit', handleMenuItemEdit as EventListener)
      window.removeEventListener('menu-item-duplicate', handleMenuItemDuplicate as EventListener)
      window.removeEventListener('menu-item-delete', handleMenuItemDelete as EventListener)
    }
  }, [handleEdit, handleDuplicate, handleDelete])

  const handleConfirmDelete = async () => {
    if (!deletingItem) return

    try {
      setIsDeleting(true)
      
      const res = await safeFetch(`/api/admin/menu/${deletingItem.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Success', {
          description: 'Menu item deleted successfully'
        })
        setDeletingItem(null)
        await fetchMenuItems()
        await refreshAdmin()
      } else {
        throw new Error(res.error || 'Failed to delete menu item')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to delete menu item'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <PermissionGuard permission="admin:menu">
      <div className="min-h-screen bg-gray-50">
        <Container variant={containerVariant} className="py-6">
          {/* Header */}
          <EditPageHeader
            backUrl={`/${locale}/admin`}
            icon={Menu}
            title="Menu Management"
            description="Manage menu items and their visibility by role. Drag and drop to reorder."
            showBackButton={true}
            backLabel="Back to Admin"
            badge={hasUnsavedChanges ? {
              label: 'Unsaved Changes',
              variant: 'secondary'
            } : undefined}
            actions={
              <Button onClick={handleAdd} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Menu Item
              </Button>
            }
          />


          {/* Main Content Card */}
          <Card>
            <CardHeader>
              <CardTitle>Menu Items</CardTitle>
              <CardDescription>Drag and drop to reorder menu items</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mb-4">
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading menu items...</div>
              ) : filteredTreeItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No menu items found</div>
              ) : (
                <div className="min-h-[400px] w-full">
                  <SortableTree
                    items={filteredTreeItems}
                    onItemsChanged={handleItemsChanged}
                    TreeItemComponent={TreeItemComponent}
                    indicator
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <EditPageFooter
            primaryAction={{
              label: isSaving ? 'Saving...' : 'Save Changes',
              onClick: handleSaveChanges,
              disabled: isSaving || !hasUnsavedChanges,
              loading: isSaving,
              icon: <Save className="h-4 w-4 mr-2" />
            }}
            secondaryActions={[
              {
                label: 'Discard Changes',
                onClick: handleDiscardChanges,
                variant: 'outline',
                disabled: isSaving || !hasUnsavedChanges,
                icon: <X className="h-4 w-4 mr-2" />
              }
            ]}
            show={hasUnsavedChanges}
          />

          {/* Edit/Add Dialog */}
          {(editingItem || isAdding) && (
            <Dialog open={!!(editingItem || isAdding)} onOpenChange={(open) => {
              if (!open) {
                setEditingItem(null)
                setIsAdding(false)
              }
            }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{isAdding ? 'Add Menu Item' : 'Edit Menu Item'}</DialogTitle>
                  <DialogDescription>
                    {isAdding ? 'Create a new menu item' : 'Update the menu item details'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                  <div>
                    <Label htmlFor="href">Path</Label>
                    <Input
                      id="href"
                      value={editForm.href || ''}
                      onChange={(e) => setEditForm({ ...editForm, href: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="icon">Icon</Label>
                    <IconPicker
                      value={editForm.icon || null}
                      onSelect={(iconName) => setEditForm({ ...editForm, icon: iconName || '' })}
                      placeholder="Select an icon"
                      showClearButton={true}
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
                        <SelectItem value="none">No Permission Required</SelectItem>
                        {permissions.map((perm) => (
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
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  
                  {/* Public Navigation Settings */}
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_public_nav"
                        checked={editForm.is_public_nav || false}
                        onChange={(e) => setEditForm({ ...editForm, is_public_nav: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="is_public_nav">Show in Public Navigation Bar</Label>
                    </div>
                    
                    {editForm.is_public_nav && (
                      <div className="pl-6 space-y-3 border-l-2 border-gray-200">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isHashLink"
                            checked={editForm.nav_metadata?.isHashLink || false}
                            onChange={(e) => setEditForm({ 
                              ...editForm, 
                              nav_metadata: { 
                                ...(editForm.nav_metadata || {}),
                                isHashLink: e.target.checked 
                              } 
                            })}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="isHashLink">Hash Link (e.g., #features, #contact)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="showOnLanding"
                            checked={editForm.nav_metadata?.showOnLanding !== false}
                            onChange={(e) => setEditForm({ 
                              ...editForm, 
                              nav_metadata: { 
                                ...(editForm.nav_metadata || {}),
                                showOnLanding: e.target.checked 
                              } 
                            })}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="showOnLanding">Show on Landing Page</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="showOnOtherPages"
                            checked={editForm.nav_metadata?.showOnOtherPages !== false}
                            onChange={(e) => setEditForm({ 
                              ...editForm, 
                              nav_metadata: { 
                                ...(editForm.nav_metadata || {}),
                                showOnOtherPages: e.target.checked 
                              } 
                            })}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="showOnOtherPages">Show on Other Pages</Label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setEditingItem(null)
                    setIsAdding(false)
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isAdding ? 'Create' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Delete Dialog */}
          {deletingItem && (
            <Dialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete Menu Item</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this menu item? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                {deletingItem.children && deletingItem.children.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          This menu item has {deletingItem.children.length} child item(s).
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Please delete or move child items first before deleting this item.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setDeletingItem(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting || (deletingItem.children && deletingItem.children.length > 0)}
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </Container>
      </div>
    </PermissionGuard>
  )
}

// Basic Tree Item Component using dnd-kit-sortable-tree
const TreeItemComponent = React.forwardRef<HTMLDivElement, TreeItemComponentProps<MenuItem>>(
  ({ item, handleProps, ...props }, ref) => {
    // Access data from tree item structure
    const treeItem = item as any
    // Ensure id is included - it might be in treeItem.id or treeItem.data.id
    const menuItem: MenuItem = {
      ...treeItem.data,
      id: treeItem.id || treeItem.data?.id // Use treeItem.id as primary source, fallback to data.id
    } as MenuItem

    if (!menuItem || !menuItem.id) {
      console.warn('TreeItemComponent: menuItem missing id', { treeItem, menuItem })
      return null
    }

    return (
      <SimpleTreeItemWrapper
        {...props}
        ref={ref}
        handleProps={handleProps}
        item={item}
        className="w-full"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 border rounded-lg hover:bg-gray-50/50 transition-colors w-full">
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            {menuItem.icon && (
              <DynamicIcon name={menuItem.icon} className="h-4 w-4 flex-shrink-0 text-gray-600" />
            )}
            <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
              <span className="font-medium text-gray-900 truncate">{menuItem.label}</span>
              {menuItem.label_ar && (
                <span className="text-sm text-gray-500 hidden sm:inline">({menuItem.label_ar})</span>
              )}
              {!menuItem.is_active && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">Inactive</Badge>
              )}
              {menuItem.permission && (
                <Badge variant="outline" className="text-xs flex-shrink-0 hidden md:inline-flex">
                  {menuItem.permission.display_name}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs font-mono flex-shrink-0 hidden lg:inline-flex">
                {menuItem.href}
              </Badge>
              <Badge variant="outline" className="text-xs flex-shrink-0 hidden xl:inline-flex">
                #{menuItem.sort_order}
              </Badge>
            </div>
          </div>
          <TooltipProvider>
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0 justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.dispatchEvent(new CustomEvent('menu-item-edit', { detail: menuItem }))
                    }}
                    className="h-8 w-8 p-0 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.dispatchEvent(new CustomEvent('menu-item-duplicate', { detail: menuItem }))
                    }}
                    className="h-8 w-8 p-0 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 hover:border-green-300 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Duplicate</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.dispatchEvent(new CustomEvent('menu-item-delete', { detail: menuItem }))
                    }}
                    className="h-8 w-8 p-0 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-300 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </SimpleTreeItemWrapper>
    )
  }
)

TreeItemComponent.displayName = 'TreeItemComponent'
