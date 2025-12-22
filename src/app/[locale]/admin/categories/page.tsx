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
import ActiveInactiveTabs from '@/components/ui/active-inactive-tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import IconPicker from '@/components/ui/icon-picker'
import DynamicIcon from '@/components/ui/dynamic-icon'
import { toast } from 'sonner'
import { HexColorPicker } from 'react-colorful'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import { defaultLogger as logger } from '@/lib/logger'

import StandardModal, { 
  StandardModalPreview, 
  StandardFormField, 
  StandardStatusToggle 
} from '@/components/ui/standard-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Tag, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  ArrowLeft,
  AlertTriangle,
  Eye,
  EyeOff,
  Palette,
  MoreVertical,
  CheckCircle,
  XCircle
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
  const { containerVariant } = useLayout()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showColorPickerCreate, setShowColorPickerCreate] = useState(false)
  const [showColorPickerEdit, setShowColorPickerEdit] = useState(false)

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
      // Always fetch all categories (both active and inactive)
      const response = await fetch(`/api/categories?includeInactive=true`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }

      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      logger.error('Error fetching categories:', { error: error })
      toast.error('Error', { description: 'Failed to load categories' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Reset picker states when dialogs close
  useEffect(() => {
    if (!isCreateDialogOpen) {
      setShowColorPickerCreate(false)
    }
  }, [isCreateDialogOpen])

  useEffect(() => {
    if (!isEditDialogOpen) {
      setShowColorPickerEdit(false)
    }
  }, [isEditDialogOpen])

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

      toast.success('Success', { description: `Category ${!category.is_active ? 'activated' : 'deactivated'} successfully` })

      fetchCategories()
    } catch (error: any) {
      logger.error('Error toggling category:', { error: error })
      toast.error('Error', { description: error.message || 'Failed to update category' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCreate = async () => {
    try {
      setSaving(true)

      if (!formData.name_en && !formData.name_ar) {
        toast.error('Validation Error', { description: 'Please provide at least name_en or name_ar' })
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

      toast.success('Success', { description: 'Category created successfully' })

      setIsCreateDialogOpen(false)
      fetchCategories()
    } catch (error: any) {
      logger.error('Error creating category:', { error: error })
      toast.error('Error', { description: error.message || 'Failed to create category' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingCategory) return

    try {
      setSaving(true)

      if (!formData.name_en && !formData.name_ar) {
        toast.error('Validation Error', { description: 'Please provide at least name_en or name_ar' })
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

      toast.success('Success', { description: 'Category updated successfully' })

      setIsEditDialogOpen(false)
      setEditingCategory(null)
      fetchCategories()
    } catch (error: any) {
      logger.error('Error updating category:', { error: error })
      toast.error('Error', { description: error.message || 'Failed to update category' })
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

      toast.success('Success', { description: 'Category deleted successfully' })

      setIsDeleteDialogOpen(false)
      setDeletingCategoryId(null)
      fetchCategories()
    } catch (error: any) {
      logger.error('Error deleting category:', { error: error })
      toast.error('Error', { description: error.message || 'Failed to delete category' })
    } finally {
      setSaving(false)
    }
  }

  const filteredCategories = React.useMemo(() => {
    return categories.filter(category => {
      // Filter by active/inactive based on current tab
      if (activeTab === 'active' && !category.is_active) return false
      if (activeTab === 'inactive' && category.is_active) return false
      
      // Filter by search term
      const searchLower = searchTerm.toLowerCase()
      return (
        (category.name_en?.toLowerCase().includes(searchLower)) ||
        (category.name_ar?.toLowerCase().includes(searchLower)) ||
        (category.name?.toLowerCase().includes(searchLower)) ||
        (category.description_en?.toLowerCase().includes(searchLower)) ||
        (category.description_ar?.toLowerCase().includes(searchLower))
      )
    })
  }, [categories, activeTab, searchTerm])

  // Count categories for badges
  const activeCount = categories.filter(c => c.is_active).length
  const inactiveCount = categories.filter(c => !c.is_active).length

  return (
    <PermissionGuard permissions={["cases:manage"]} fallback={
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-4 sm:py-6 md:py-8">
        <Container variant={containerVariant}>
          {/* Header */}
          <DetailPageHeader
            backUrl={`/${locale}/admin`}
            icon={Tag}
            title="Manage Categories"
            description="Add, edit, delete, and manage case categories"
            actions={
              <Button
                onClick={handleCreate}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white h-9 sm:h-10 px-3 sm:px-4"
                size="sm"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Add Category</span>
                <span className="sm:hidden">Add</span>
              </Button>
            }
            badge={filteredCategories.length > 0 ? {
              label: `${filteredCategories.length} ${filteredCategories.length === 1 ? 'category' : 'categories'}`,
              variant: 'secondary',
              className: activeTab === 'active' 
                ? 'bg-green-100 text-green-700 border-green-200' 
                : 'bg-gray-100 text-gray-700 border-gray-200'
            } : undefined}
          />

          {/* Tabs and Search */}
          <ActiveInactiveTabs
            value={activeTab}
            onValueChange={setActiveTab}
            activeCount={activeCount}
            inactiveCount={inactiveCount}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search categories..."
          />

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
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-sm">
              <CardContent className="p-8 sm:p-12 text-center">
                {activeTab === 'active' ? (
                  <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                ) : (
                  <XCircle className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
                )}
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  No {activeTab === 'active' ? 'Active' : 'Inactive'} Categories Found
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-6">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : activeTab === 'active'
                      ? 'Get started by creating your first category'
                      : 'No inactive categories at the moment'}
                </p>
                {activeTab === 'active' && (
                  <Button onClick={handleCreate} className="bg-gradient-to-r from-indigo-500 to-indigo-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredCategories.map((category) => (
                <Card
                  key={category.id}
                  className={`group relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-indigo-200/50 transition-all duration-200 overflow-hidden ${
                    !category.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                        {/* Icon and Color */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {category.icon && (
                            <div className="p-1.5 sm:p-2 rounded-lg bg-gray-50 group-hover:bg-indigo-50 transition-colors">
                              <DynamicIcon 
                                name={category.icon} 
                                className="h-4 w-4 sm:h-5 sm:w-5"
                                style={category.color ? { color: category.color } : undefined}
                              />
                            </div>
                          )}
                          {category.color && !category.icon && (
                            <div
                              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg border-2 border-gray-200 group-hover:border-indigo-200 transition-colors"
                              style={{ backgroundColor: category.color }}
                            />
                          )}
                        </div>
                        {/* Title and Badge */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <CardTitle className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                              {category.name_en || category.name}
                            </CardTitle>
                            <Badge
                              variant={category.is_active ? 'default' : 'secondary'}
                              className={`text-[9px] sm:text-[10px] font-medium py-0 px-1.5 sm:px-2 ${
                                category.is_active 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              {category.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {category.name_ar && (
                            <p className="text-xs sm:text-sm text-gray-600 truncate mb-1" dir="rtl">
                              {category.name_ar}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Action Menu - Desktop */}
                      <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(category)}
                          title="Edit"
                          className="h-7 w-7 p-0 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(category)}
                          disabled={saving}
                          title={category.is_active ? 'Deactivate' : 'Activate'}
                          className="h-7 w-7 p-0 border-gray-200 hover:border-green-300 hover:bg-green-50 hover:text-green-600 transition-all"
                        >
                          {category.is_active ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                          title="Delete"
                          className="h-7 w-7 p-0 border-gray-200 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {/* Action Menu - Mobile */}
                      <div className="relative sm:hidden flex-shrink-0 self-start">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 border-gray-200"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => handleEdit(category)}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-3.5 w-3.5" />
                              <span className="text-xs">Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(category)}
                              disabled={saving}
                              className="cursor-pointer"
                            >
                              {category.is_active ? (
                                <>
                                  <EyeOff className="mr-2 h-3.5 w-3.5" />
                                  <span className="text-xs">Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-3.5 w-3.5" />
                                  <span className="text-xs">Activate</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(category.id)}
                              className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              <span className="text-xs">Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                    {(category.description_en || category.description) && (
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                        {category.description_en || category.description}
                      </p>
                    )}
                    {category.description_ar && (
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2" dir="rtl">
                        {category.description_ar}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
              <div className="p-4 sm:p-6">
                <DialogHeader className="mb-4 sm:mb-6">
                  <DialogTitle className="text-xl sm:text-2xl font-bold">Create New Category</DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    Add a new case category with bilingual support
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 sm:space-y-6">
                  {/* Preview Section */}
                  <div className="p-4 bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-lg border border-gray-200">
                    <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3 block">Preview</Label>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div 
                        className="p-3 rounded-xl shadow-sm border-2 border-white"
                        style={{ 
                          backgroundColor: formData.color || '#6366f1',
                          color: 'white'
                        }}
                      >
                        {formData.icon ? (
                          <DynamicIcon name={formData.icon} className="h-6 w-6 sm:h-8 sm:w-8" />
                        ) : (
                          <Tag className="h-6 w-6 sm:h-8 sm:w-8" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {formData.name_en || formData.name_ar || 'Category Name'}
                        </div>
                        {formData.name_ar && (
                          <div className="text-xs sm:text-sm text-gray-600 truncate mt-0.5" dir="rtl">
                            {formData.name_ar}
                          </div>
                        )}
                        {(formData.description_en || formData.description_ar) && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {formData.description_en || formData.description_ar}
                          </div>
                        )}
                      </div>
                      <Badge 
                        variant={formData.is_active ? 'default' : 'secondary'}
                        className={formData.is_active 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                        }
                      >
                        {formData.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div className="border-b border-gray-200 pb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name_en" className="text-sm font-medium">
                          Name (English) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name_en"
                          value={formData.name_en}
                          onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                          placeholder="Medical Support"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name_ar" className="text-sm font-medium">Name (Arabic)</Label>
                        <Input
                          id="name_ar"
                          value={formData.name_ar}
                          onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                          placeholder="الدعم الطبي"
                          dir="rtl"
                          className="h-10"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="description_en" className="text-sm font-medium">Description (English)</Label>
                        <Textarea
                          id="description_en"
                          value={formData.description_en}
                          onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                          placeholder="Emergency medical expenses, treatments..."
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description_ar" className="text-sm font-medium">Description (Arabic)</Label>
                        <Textarea
                          id="description_ar"
                          value={formData.description_ar}
                          onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                          placeholder="النفقات الطبية الطارئة والعلاجات..."
                          rows={3}
                          dir="rtl"
                          className="resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visual Appearance */}
                  <div className="space-y-4">
                    <div className="border-b border-gray-200 pb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Visual Appearance</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="icon" className="text-sm font-medium">Icon</Label>
                        <IconPicker
                          value={formData.icon || null}
                          onSelect={(iconName) => setFormData({ ...formData, icon: iconName || '' })}
                          placeholder="Select an icon"
                          showClearButton={true}
                        />
                        {formData.icon && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <DynamicIcon name={formData.icon} className="h-4 w-4" />
                            <span>Selected: {formData.icon}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="color" className="text-sm font-medium">Color</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="color"
                              value={formData.color}
                              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                              placeholder="#ef4444"
                              className="h-10 pl-10"
                            />
                            {formData.color && (
                              <div
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded border border-gray-300"
                                style={{ backgroundColor: formData.color }}
                              />
                            )}
                          </div>
                          <Popover open={showColorPickerCreate} onOpenChange={setShowColorPickerCreate}>
                            <PopoverTrigger asChild>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon"
                                className="h-10 w-10"
                                title="Open color picker"
                              >
                                <Palette className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4" align="start">
                              <div className="space-y-3">
                                <Label className="text-xs font-semibold text-gray-700">Pick a color</Label>
                                <HexColorPicker
                                  color={formData.color || '#ef4444'}
                                  onChange={(color) => setFormData({ ...formData, color })}
                                />
                                <div className="flex items-center gap-2 pt-2 border-t">
                                  <div
                                    className="w-8 h-8 rounded border-2 border-gray-300"
                                    style={{ backgroundColor: formData.color || '#ef4444' }}
                                  />
                                  <Input
                                    value={formData.color || '#ef4444'}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="h-8 text-xs font-mono"
                                    placeholder="#ef4444"
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          {formData.color && (
                            <div
                              className="w-10 h-10 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-indigo-400 transition-colors shadow-sm"
                              style={{ backgroundColor: formData.color }}
                              onClick={() => setShowColorPickerCreate(true)}
                              title="Click to change color"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-4">
                    <div className="border-b border-gray-200 pb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Status</h3>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="space-y-0.5">
                        <Label htmlFor="is_active_create" className="text-sm font-medium cursor-pointer">
                          Category Status
                        </Label>
                        <p className="text-xs text-gray-500">
                          {formData.is_active 
                            ? 'This category will be visible and can be used for cases' 
                            : 'This category will be hidden and cannot be used for new cases'}
                        </p>
                      </div>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        id="is_active_create"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-4 sm:px-6 py-4 border-t bg-gray-50/50">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="w-full sm:w-auto"
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveCreate} 
                    disabled={saving || (!formData.name_en && !formData.name_ar)}
                    className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Creating...
                      </>
                    ) : (
                      'Create Category'
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
              <div className="p-4 sm:p-6">
                <DialogHeader className="mb-4 sm:mb-6">
                  <DialogTitle className="text-xl sm:text-2xl font-bold">Edit Category</DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    Update category information and visual appearance
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 sm:space-y-6">
                  {/* Preview Section */}
                  <div className="p-4 bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-lg border border-gray-200">
                    <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3 block">Preview</Label>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div 
                        className="p-3 rounded-xl shadow-sm border-2 border-white"
                        style={{ 
                          backgroundColor: formData.color || '#6366f1',
                          color: 'white'
                        }}
                      >
                        {formData.icon ? (
                          <DynamicIcon name={formData.icon} className="h-6 w-6 sm:h-8 sm:w-8" />
                        ) : (
                          <Tag className="h-6 w-6 sm:h-8 sm:w-8" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {formData.name_en || formData.name_ar || 'Category Name'}
                        </div>
                        {formData.name_ar && (
                          <div className="text-xs sm:text-sm text-gray-600 truncate mt-0.5" dir="rtl">
                            {formData.name_ar}
                          </div>
                        )}
                        {(formData.description_en || formData.description_ar) && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {formData.description_en || formData.description_ar}
                          </div>
                        )}
                      </div>
                      <Badge 
                        variant={formData.is_active ? 'default' : 'secondary'}
                        className={formData.is_active 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                        }
                      >
                        {formData.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div className="border-b border-gray-200 pb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_name_en" className="text-sm font-medium">
                          Name (English) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="edit_name_en"
                          value={formData.name_en}
                          onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                          placeholder="Medical Support"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_name_ar" className="text-sm font-medium">Name (Arabic)</Label>
                        <Input
                          id="edit_name_ar"
                          value={formData.name_ar}
                          onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                          placeholder="الدعم الطبي"
                          dir="rtl"
                          className="h-10"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_description_en" className="text-sm font-medium">Description (English)</Label>
                        <Textarea
                          id="edit_description_en"
                          value={formData.description_en}
                          onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                          placeholder="Emergency medical expenses, treatments..."
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_description_ar" className="text-sm font-medium">Description (Arabic)</Label>
                        <Textarea
                          id="edit_description_ar"
                          value={formData.description_ar}
                          onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                          placeholder="النفقات الطبية الطارئة والعلاجات..."
                          rows={3}
                          dir="rtl"
                          className="resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visual Appearance */}
                  <div className="space-y-4">
                    <div className="border-b border-gray-200 pb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Visual Appearance</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit_icon" className="text-sm font-medium">Icon</Label>
                        <IconPicker
                          value={formData.icon || null}
                          onSelect={(iconName) => setFormData({ ...formData, icon: iconName || '' })}
                          placeholder="Select an icon"
                          showClearButton={true}
                        />
                        {formData.icon && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <DynamicIcon name={formData.icon} className="h-4 w-4" />
                            <span>Selected: {formData.icon}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit_color" className="text-sm font-medium">Color</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="edit_color"
                              value={formData.color}
                              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                              placeholder="#ef4444"
                              className="h-10 pl-10"
                            />
                            {formData.color && (
                              <div
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded border border-gray-300"
                                style={{ backgroundColor: formData.color }}
                              />
                            )}
                          </div>
                          <Popover open={showColorPickerEdit} onOpenChange={setShowColorPickerEdit}>
                            <PopoverTrigger asChild>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon"
                                className="h-10 w-10"
                                title="Open color picker"
                              >
                                <Palette className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4" align="start">
                              <div className="space-y-3">
                                <Label className="text-xs font-semibold text-gray-700">Pick a color</Label>
                                <HexColorPicker
                                  color={formData.color || '#ef4444'}
                                  onChange={(color) => setFormData({ ...formData, color })}
                                />
                                <div className="flex items-center gap-2 pt-2 border-t">
                                  <div
                                    className="w-8 h-8 rounded border-2 border-gray-300"
                                    style={{ backgroundColor: formData.color || '#ef4444' }}
                                  />
                                  <Input
                                    value={formData.color || '#ef4444'}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="h-8 text-xs font-mono"
                                    placeholder="#ef4444"
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          {formData.color && (
                            <div
                              className="w-10 h-10 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-indigo-400 transition-colors shadow-sm"
                              style={{ backgroundColor: formData.color }}
                              onClick={() => setShowColorPickerEdit(true)}
                              title="Click to change color"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-4">
                    <div className="border-b border-gray-200 pb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Status</h3>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="space-y-0.5">
                        <Label htmlFor="is_active_edit" className="text-sm font-medium cursor-pointer">
                          Category Status
                        </Label>
                        <p className="text-xs text-gray-500">
                          {formData.is_active 
                            ? 'This category is visible and can be used for cases' 
                            : 'This category is hidden and cannot be used for new cases'}
                        </p>
                      </div>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        id="is_active_edit"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-4 sm:px-6 py-4 border-t bg-gray-50/50">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                    className="w-full sm:w-auto"
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveEdit} 
                    disabled={saving || (!formData.name_en && !formData.name_ar)}
                    className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
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
        </Container>
      </div>
    </PermissionGuard>
  )
}
