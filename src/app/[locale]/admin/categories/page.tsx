'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useEnhancedToast } from '@/hooks/use-enhanced-toast'
import { 
  Tag, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react'

interface Category {
  id: string
  name: string
  name_en: string | null
  name_ar: string | null
  description: string | null
  description_en: string | null
  description_ar: string | null
  icon: string | null
  color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function AdminCategoriesPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin')
  const { toast } = useEnhancedToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    icon: '',
    color: '',
    is_active: true
  })

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/categories?includeInactive=${showInactive}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }

      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [showInactive, toast])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleCreate = () => {
    setFormData({
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      icon: '',
      color: '',
      is_active: true
    })
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name_en: category.name_en || category.name || '',
      name_ar: category.name_ar || '',
      description_en: category.description_en || category.description || '',
      description_ar: category.description_ar || '',
      icon: category.icon || '',
      color: category.color || '',
      is_active: category.is_active
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = (categoryId: string) => {
    setDeletingCategoryId(categoryId)
    setIsDeleteDialogOpen(true)
  }

  const handleToggleActive = async (category: Category) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !category.is_active
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update category')
      }

      toast({
        title: 'Success',
        description: `Category ${!category.is_active ? 'activated' : 'deactivated'} successfully`,
        variant: 'default'
      })

      fetchCategories()
    } catch (error: any) {
      console.error('Error toggling category:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update category',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCreate = async () => {
    try {
      setSaving(true)

      if (!formData.name_en && !formData.name_ar) {
        toast({
          title: 'Validation Error',
          description: 'Please provide at least name_en or name_ar',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create category')
      }

      toast({
        title: 'Success',
        description: 'Category created successfully',
        variant: 'default'
      })

      setIsCreateDialogOpen(false)
      fetchCategories()
    } catch (error: any) {
      console.error('Error creating category:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create category',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingCategory) return

    try {
      setSaving(true)

      if (!formData.name_en && !formData.name_ar) {
        toast({
          title: 'Validation Error',
          description: 'Please provide at least name_en or name_ar',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update category')
      }

      toast({
        title: 'Success',
        description: 'Category updated successfully',
        variant: 'default'
      })

      setIsEditDialogOpen(false)
      setEditingCategory(null)
      fetchCategories()
    } catch (error: any) {
      console.error('Error updating category:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update category',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingCategoryId) return

    try {
      setSaving(true)
      const response = await fetch(`/api/categories/${deletingCategoryId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete category')
      }

      toast({
        title: 'Success',
        description: 'Category deleted successfully',
        variant: 'default'
      })

      setIsDeleteDialogOpen(false)
      setDeletingCategoryId(null)
      fetchCategories()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete category',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredCategories = categories.filter(category => {
    if (!showInactive && !category.is_active) return false
    
    const searchLower = searchTerm.toLowerCase()
    return (
      (category.name_en?.toLowerCase().includes(searchLower)) ||
      (category.name_ar?.toLowerCase().includes(searchLower)) ||
      (category.name?.toLowerCase().includes(searchLower)) ||
      (category.description_en?.toLowerCase().includes(searchLower)) ||
      (category.description_ar?.toLowerCase().includes(searchLower))
    )
  })

  return (
    <PermissionGuard permissions={["admin:manage"]} fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to manage categories.</p>
            <Button onClick={() => router.push(`/${locale}/admin`)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${locale}/admin`)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Admin
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
                    <Tag className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Manage Categories
                    </h1>
                    <p className="text-gray-600 text-lg mt-1">
                      Add, edit, delete, and manage case categories
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleCreate}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              >
                <Plus className="h-5 w-5" />
                Add Category
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      placeholder="Search categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showInactive}
                    onCheckedChange={setShowInactive}
                    id="show-inactive"
                  />
                  <Label htmlFor="show-inactive" className="cursor-pointer">
                    Show Inactive
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categories List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Tag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Categories Found
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first category'}
                </p>
                <Button onClick={handleCreate} className="bg-gradient-to-r from-blue-500 to-indigo-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <Card
                  key={category.id}
                  className={`bg-white/90 backdrop-blur-sm border-0 shadow-lg transition-all hover:shadow-xl ${
                    !category.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                          {category.name_en || category.name}
                        </CardTitle>
                        {category.name_ar && (
                          <p className="text-sm text-gray-600 mb-2" dir="rtl">
                            {category.name_ar}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={category.is_active ? 'default' : 'secondary'}
                        className={category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(category.description_en || category.description) && (
                      <p className="text-sm text-gray-600 mb-4">
                        {category.description_en || category.description}
                      </p>
                    )}
                    {category.description_ar && (
                      <p className="text-sm text-gray-600 mb-4" dir="rtl">
                        {category.description_ar}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-4">
                      {category.icon && (
                        <span className="text-2xl">{category.icon}</span>
                      )}
                      {category.color && (
                        <div
                          className="w-6 h-6 rounded-full border-2 border-gray-300"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(category)}
                        disabled={saving}
                        className="flex-1"
                      >
                        {category.is_active ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Add a new case category with bilingual support
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name_en">Name (English) *</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      placeholder="Medical Support"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name_ar">Name (Arabic)</Label>
                    <Input
                      id="name_ar"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      placeholder="الدعم الطبي"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="description_en">Description (English)</Label>
                    <Textarea
                      id="description_en"
                      value={formData.description_en}
                      onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                      placeholder="Emergency medical expenses, treatments..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description_ar">Description (Arabic)</Label>
                    <Textarea
                      id="description_ar"
                      value={formData.description_ar}
                      onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                      placeholder="النفقات الطبية الطارئة والعلاجات..."
                      rows={3}
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="icon">Icon (Emoji)</Label>
                    <Input
                      id="icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="🏥"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Color (Hex)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder="#ef4444"
                      />
                      {formData.color && (
                        <div
                          className="w-10 h-10 rounded border-2 border-gray-300"
                          style={{ backgroundColor: formData.color }}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    id="is_active_create"
                  />
                  <Label htmlFor="is_active_create" className="cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCreate} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Category'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Category</DialogTitle>
                <DialogDescription>
                  Update category information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_name_en">Name (English) *</Label>
                    <Input
                      id="edit_name_en"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      placeholder="Medical Support"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_name_ar">Name (Arabic)</Label>
                    <Input
                      id="edit_name_ar"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      placeholder="الدعم الطبي"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_description_en">Description (English)</Label>
                    <Textarea
                      id="edit_description_en"
                      value={formData.description_en}
                      onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                      placeholder="Emergency medical expenses, treatments..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_description_ar">Description (Arabic)</Label>
                    <Textarea
                      id="edit_description_ar"
                      value={formData.description_ar}
                      onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                      placeholder="النفقات الطبية الطارئة والعلاجات..."
                      rows={3}
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_icon">Icon (Emoji)</Label>
                    <Input
                      id="edit_icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="🏥"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_color">Color (Hex)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="edit_color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder="#ef4444"
                      />
                      {formData.color && (
                        <div
                          className="w-10 h-10 rounded border-2 border-gray-300"
                          style={{ backgroundColor: formData.color }}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    id="is_active_edit"
                  />
                  <Label htmlFor="is_active_edit" className="cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Category</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this category? This action cannot be undone.
                  {deletingCategoryId && categories.find(c => c.id === deletingCategoryId) && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-red-800 text-sm">
                      Category: {categories.find(c => c.id === deletingCategoryId)?.name_en || categories.find(c => c.id === deletingCategoryId)?.name}
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={saving}
                >
                  {saving ? 'Deleting...' : 'Delete Category'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </PermissionGuard>
  )
}

