'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ActiveInactiveTabs from '@/components/ui/active-inactive-tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  X,
  Check,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import DynamicIcon from '@/components/ui/dynamic-icon'
import DetailPageHeader from '@/components/crud/DetailPageHeader'

import { defaultLogger as logger } from '@/lib/logger'

interface Category {
  id: string
  name: string
  name_en?: string | null
  name_ar?: string | null
  icon?: string | null
  color?: string | null
  is_active: boolean
}

interface CategoryDetectionRule {
  id: string
  category_id: string
  keyword: string
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
  category?: {
    id: string
    name: string
    icon?: string | null
    color?: string | null
  }
}

export default function CategoryDetectionRulesPage() {
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin')
  const { containerVariant } = useLayout()

  const [rules, setRules] = useState<CategoryDetectionRule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active')
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  
  // Inline editing state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [editingKeyword, setEditingKeyword] = useState('')
  const [editingPriority, setEditingPriority] = useState(0)
  const [editingCategoryId, setEditingCategoryId] = useState<string>('')
  
  // Inline adding state - track which category is in "add mode"
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [newPriority, setNewPriority] = useState(0)
  const [newCategoryId, setNewCategoryId] = useState<string>('')
  
  // Collapse state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true)
      const response = await fetch('/api/categories?includeInactive=true')
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories')
      }

      const data = await response.json()
      setCategories(data.categories || [])
    } catch (error) {
      logger.error('Error fetching categories:', { error: error })
      toast.error('Error', { description: 'Failed to load categories' })
    } finally {
      setCategoriesLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') {
        params.append('category_id', selectedCategory)
      }
      if (activeTab === 'active') {
        params.append('active_only', 'true')
      }

      const response = await fetch(`/api/admin/category-detection-rules?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch rules')
      }

      const data = await response.json()
      setRules(data.rules || [])
      
      // Auto-expand all categories on initial load
      if (expandedCategories.size === 0 && data.rules?.length > 0) {
        const categoryIds = new Set<string>(data.rules.map((r: CategoryDetectionRule) => r.category_id))
        setExpandedCategories(categoryIds)
      }
    } catch (error) {
      logger.error('Error fetching rules:', { error: error })
      toast.error('Error', { description: 'Failed to load category detection rules' })
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, activeTab, toast, expandedCategories.size])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const startEdit = (rule: CategoryDetectionRule) => {
    setEditingRuleId(rule.id)
    setEditingKeyword(rule.keyword)
    setEditingPriority(rule.priority)
    setEditingCategoryId(rule.category_id)
  }

  const cancelEdit = () => {
    setEditingRuleId(null)
    setEditingKeyword('')
    setEditingPriority(0)
    setEditingCategoryId('')
  }

  const saveEdit = async () => {
    if (!editingRuleId) return

    if (!editingKeyword.trim()) {
      toast.error('Error', { description: 'Keyword cannot be empty' })
      return
    }

    try {
      setSaving(prev => ({ ...prev, [editingRuleId]: true }))
      const response = await fetch(`/api/admin/category-detection-rules/${editingRuleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: editingKeyword.trim(),
          priority: editingPriority,
          category_id: editingCategoryId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update rule')
      }

      toast.success('Success', { description: 'Rule updated successfully' })  

      cancelEdit()
      await fetchRules()
    } catch (error) {
      logger.error('Error updating rule:', { error: error })
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to update rule' })
    } finally {
      setSaving(prev => ({ ...prev, [editingRuleId]: false }))
    }
  }

  const handleToggleActive = async (ruleId: string, currentStatus: boolean) => {
    try {
      setSaving(prev => ({ ...prev, [ruleId]: true }))
      const response = await fetch(`/api/admin/category-detection-rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update rule status')
      }

      toast.success('Success', { 
        description: `Rule ${!currentStatus ? 'activated' : 'deactivated'} successfully` 
      })

      await fetchRules()
    } catch (error) {
      logger.error('Error toggling rule status:', { error: error })
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to update rule status' })
    } finally {
      setSaving(prev => ({ ...prev, [ruleId]: false }))
    }
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return
    }

    try {
      setSaving(prev => ({ ...prev, [ruleId]: true }))
      const response = await fetch(`/api/admin/category-detection-rules/${ruleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete rule')
      }

      toast.success('Success', { description: 'Rule deleted successfully' })

      await fetchRules()
    } catch (error) {
      logger.error('Error deleting rule:', { error: error })
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to delete rule' })
    } finally {
      setSaving(prev => ({ ...prev, [ruleId]: false }))
    }
  }

  const startAdd = (categoryId: string) => {
    setAddingToCategory(categoryId)
    setNewKeyword('')
    setNewPriority(0)
    setNewCategoryId(categoryId)
  }

  const cancelAdd = () => {
    setAddingToCategory(null)
    setNewKeyword('')
    setNewPriority(0)
    setNewCategoryId('')
  }

  const saveAdd = async () => {
    if (!newCategoryId || !newKeyword.trim()) {
      toast.error('Validation Error', { description: 'Category and keyword are required' })
      return
    }

    try {
      const addKey = `add-${newCategoryId}`
      setSaving(prev => ({ ...prev, [addKey]: true }))
      const response = await fetch('/api/admin/category-detection-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: newCategoryId,
          keyword: newKeyword.trim(),
          priority: newPriority,
          is_active: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create rule')
      }

      toast.success('Success', { description: 'Rule created successfully' })

      cancelAdd()
      await fetchRules()
    } catch (error) {
      logger.error('Error creating rule:', { error: error })
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to create rule' }) 
    } finally {
      setSaving(prev => ({ ...prev, [`add-${newCategoryId}`]: false }))
    }
  }

  const filteredRules = rules.filter((rule) => {
    // Filter by active/inactive tab
    if (activeTab === 'active' && !rule.is_active) return false
    if (activeTab === 'inactive' && rule.is_active) return false
    
    // Filter by search
    const matchesSearch = searchTerm === '' || 
      rule.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const getCategoryById = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)
  }

  const groupedRules = filteredRules.reduce((acc, rule) => {
    const categoryId = rule.category_id
    if (!acc[categoryId]) {
      acc[categoryId] = []
    }
    acc[categoryId].push(rule)
    return acc
  }, {} as Record<string, CategoryDetectionRule[]>)

  const totalRules = rules.length
  const activeRulesCount = rules.filter(r => r.is_active).length
  const inactiveRulesCount = rules.filter(r => !r.is_active).length

  return (
    <PermissionGuard permission="admin:dashboard">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <DetailPageHeader
            backUrl={`/${locale}/admin`}
            icon={Sparkles}
            title="Category Detection Rules"
            description="Manage keywords used to automatically categorize cases"
            showBackButton={false}
            badge={{
              label: `${totalRules} ${totalRules === 1 ? 'rule' : 'rules'}`,
              variant: 'secondary'
            }}
          />

          {/* Tabs and Filters */}
          <div className="mb-6 space-y-4">
            <ActiveInactiveTabs
              value={activeTab}
              onValueChange={setActiveTab}
              activeCount={activeRulesCount}
              inactiveCount={inactiveRulesCount}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Search keywords..."
            />

            {/* Category Filter */}
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4 sm:p-6">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-10 text-sm w-full sm:w-[300px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories
                      .filter(c => c.is_active || activeTab === 'inactive')
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            {category.icon && <DynamicIcon name={category.icon} className="h-4 w-4" />}
                            <span>{category.name_en || category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Rules List */}
          {loading ? (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="py-12 text-center">
                <div className="inline-block">
                  <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600">Loading rules...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredRules.length === 0 && !Object.keys(groupedRules).length ? (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="py-12 text-center">
                <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rules Found</h3>
                <p className="text-sm text-gray-600">
                  {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding keywords to categories'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {Object.entries(groupedRules).map(([categoryId, categoryRules]) => {
                const firstRule = categoryRules[0]
                const category = firstRule.category || getCategoryById(categoryId)
                const isExpanded = expandedCategories.has(categoryId)
                const isAdding = addingToCategory === categoryId
                const activeRules = categoryRules.filter(r => r.is_active)
                const inactiveRules = categoryRules.filter(r => !r.is_active)

                return (
                  <Card key={categoryId} className="border border-gray-200 bg-white hover:shadow-md transition-all duration-200 overflow-hidden">
                    <CardHeader 
                      className="py-3 sm:py-4 px-4 sm:px-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      onClick={() => toggleCategory(categoryId)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCategory(categoryId)
                          }}
                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {category?.icon && (
                              <div 
                                className="p-1.5 sm:p-2 rounded-lg flex-shrink-0"
                                style={category?.color ? { backgroundColor: category.color + '15' } : { backgroundColor: '#f3f4f6' }}
                              >
                                <DynamicIcon 
                                  name={category.icon} 
                                  className="h-4 w-4 sm:h-5 sm:w-5"
                                  style={category?.color ? { color: category.color } : undefined}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                                {category?.name || 'Unknown Category'}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {categoryRules.length} {categoryRules.length === 1 ? 'keyword' : 'keywords'}
                                {activeRules.length > 0 && inactiveRules.length > 0 && (
                                  <span className="ml-2">
                                    ({activeRules.length} active, {inactiveRules.length} inactive)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="pt-0 pb-4 sm:pb-5 px-4 sm:px-5">
                        {/* Add New Keyword */}
                        {isAdding ? (
                          <div className="mb-4 p-3 sm:p-4 bg-gradient-to-br from-indigo-50/50 to-white rounded-lg border-2 border-dashed border-indigo-300 shadow-sm">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Input
                                placeholder="Enter keyword..."
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveAdd()
                                  } else if (e.key === 'Escape') {
                                    cancelAdd()
                                  }
                                }}
                                className="flex-1 h-9 text-sm"
                                autoFocus
                              />
                              <Input
                                type="number"
                                placeholder="Priority"
                                value={newPriority}
                                onChange={(e) => setNewPriority(parseInt(e.target.value) || 0)}
                                className="w-20 sm:w-24 h-9 text-sm"
                              />
                              <Button
                                size="sm"
                                onClick={saveAdd}
                                disabled={saving[`add-${categoryId}`] || !newKeyword.trim()}
                                className="h-9 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                              >
                                {saving[`add-${categoryId}`] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelAdd}
                                disabled={saving[`add-${categoryId}`]}
                                className="h-9"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startAdd(categoryId)}
                            className="mb-4 w-full sm:w-auto border-dashed border-2 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Keyword
                          </Button>
                        )}

                        {/* Active Keywords */}
                        {activeTab === 'active' && activeRules.length > 0 && (
                          <div className="mb-4">
                            <div className="flex flex-wrap gap-2">
                              {activeRules
                                .sort((a, b) => b.priority - a.priority)
                                .map((rule) => {
                                  const isEditing = editingRuleId === rule.id
                                  const isSaving = saving[rule.id]
                                  const categoryColor = rule.category?.color || category?.color
                                  const hasColor = !!categoryColor

                                  return (
                                    <div
                                      key={rule.id}
                                      className={cn(
                                        "group inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all duration-200",
                                        isEditing 
                                          ? "border-2 border-indigo-500 shadow-lg ring-2 ring-indigo-500/20 bg-white" 
                                          : "border shadow-sm hover:shadow-md",
                                        !hasColor && !isEditing && "bg-white border-gray-200 hover:border-indigo-300"
                                      )}
                                      style={!isEditing && hasColor ? {
                                        backgroundColor: categoryColor + '15',
                                        borderColor: categoryColor + '40',
                                        color: categoryColor,
                                      } : undefined}
                                    >
                                      {isEditing ? (
                                        <>
                                          <Input
                                            value={editingKeyword}
                                            onChange={(e) => setEditingKeyword(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                saveEdit()
                                              } else if (e.key === 'Escape') {
                                                cancelEdit()
                                              }
                                            }}
                                            className="h-7 px-2 text-xs sm:text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                                            style={{ width: `${Math.max(editingKeyword.length * 7 + 20, 80)}px` }}
                                            autoFocus
                                          />
                                          <Input
                                            type="number"
                                            value={editingPriority}
                                            onChange={(e) => setEditingPriority(parseInt(e.target.value) || 0)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                saveEdit()
                                              } else if (e.key === 'Escape') {
                                                cancelEdit()
                                              }
                                            }}
                                            className="h-7 px-1.5 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-14 bg-transparent"
                                            placeholder="P:0"
                                          />
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 hover:bg-green-50 hover:text-green-600"
                                            onClick={saveEdit}
                                            disabled={isSaving}
                                          >
                                            {isSaving ? (
                                              <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                                            ) : (
                                              <Check className="h-3 w-3" />
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 hover:bg-gray-100"
                                            onClick={cancelEdit}
                                            disabled={isSaving}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span 
                                            className={cn(
                                              "text-xs sm:text-sm font-medium cursor-pointer transition-colors",
                                              hasColor ? "" : "text-gray-700 hover:text-indigo-600"
                                            )}
                                            style={hasColor ? {
                                              color: categoryColor
                                            } : undefined}
                                            onClick={() => startEdit(rule)}
                                          >
                                            {rule.keyword}
                                          </span>
                                          {rule.priority > 0 && (
                                            <Badge 
                                              variant="outline" 
                                              className="text-[10px] px-1.5 py-0 h-4 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                              title={`Priority: ${rule.priority}`}
                                            >
                                              {rule.priority}
                                            </Badge>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 rounded-full hover:bg-amber-50 hover:text-amber-600 transition-all"
                                            onClick={() => handleToggleActive(rule.id, rule.is_active)}
                                            disabled={isSaving}
                                            title={rule.is_active ? 'Deactivate keyword' : 'Activate keyword'}
                                          >
                                            {isSaving ? (
                                              <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                                            ) : rule.is_active ? (
                                              <EyeOff className="h-3 w-3" />
                                            ) : (
                                              <Eye className="h-3 w-3" />
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 rounded-full hover:bg-red-50 hover:text-red-600 transition-all"
                                            onClick={() => handleDelete(rule.id)}
                                            disabled={isSaving}
                                            title="Delete keyword"
                                          >
                                            {isSaving ? (
                                              <Loader2 className="h-3 w-3 animate-spin text-red-600" />
                                            ) : (
                                              <X className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        )}

                        {/* Inactive Keywords */}
                        {inactiveRules.length > 0 && activeTab === 'inactive' && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <Label className="text-xs font-medium text-gray-500 mb-3 block">Inactive Keywords</Label>
                            <div className="flex flex-wrap gap-2">
                              {inactiveRules
                                .sort((a, b) => b.priority - a.priority)
                                .map((rule) => {
                                  const isEditing = editingRuleId === rule.id
                                  const isSaving = saving[rule.id]
                                  const categoryColor = rule.category?.color || category?.color
                                  const hasColor = !!categoryColor

                                  return (
                                    <div
                                      key={rule.id}
                                      className={cn(
                                        "group inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all duration-200",
                                        isEditing 
                                          ? "border-2 border-indigo-500 shadow-lg ring-2 ring-indigo-500/20 bg-white opacity-100" 
                                          : "border shadow-sm hover:shadow-md opacity-60",
                                        !hasColor && !isEditing && "bg-white border-gray-200 hover:border-indigo-300"
                                      )}
                                      style={!isEditing && hasColor ? {
                                        backgroundColor: categoryColor + '15',
                                        borderColor: categoryColor + '40',
                                        color: categoryColor,
                                      } : undefined}
                                    >
                                      {isEditing ? (
                                        <>
                                          <Input
                                            value={editingKeyword}
                                            onChange={(e) => setEditingKeyword(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                saveEdit()
                                              } else if (e.key === 'Escape') {
                                                cancelEdit()
                                              }
                                            }}
                                            className="h-7 px-2 text-xs sm:text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                                            style={{ width: `${Math.max(editingKeyword.length * 7 + 20, 80)}px` }}
                                            autoFocus
                                          />
                                          <Input
                                            type="number"
                                            value={editingPriority}
                                            onChange={(e) => setEditingPriority(parseInt(e.target.value) || 0)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                saveEdit()
                                              } else if (e.key === 'Escape') {
                                                cancelEdit()
                                              }
                                            }}
                                            className="h-7 px-1.5 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-14 bg-transparent"
                                            placeholder="P:0"
                                          />
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 hover:bg-green-50 hover:text-green-600"
                                            onClick={saveEdit}
                                            disabled={isSaving}
                                          >
                                            {isSaving ? (
                                              <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                                            ) : (
                                              <Check className="h-3 w-3" />
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 hover:bg-gray-100"
                                            onClick={cancelEdit}
                                            disabled={isSaving}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span 
                                            className={cn(
                                              "text-xs sm:text-sm font-medium cursor-pointer transition-colors",
                                              hasColor ? "" : "text-gray-600 hover:text-indigo-600"
                                            )}
                                            style={hasColor ? {
                                              color: categoryColor
                                            } : undefined}
                                            onClick={() => startEdit(rule)}
                                          >
                                            {rule.keyword}
                                          </span>
                                          {rule.priority > 0 && (
                                            <Badge 
                                              variant="outline" 
                                              className="text-[10px] px-1.5 py-0 h-4 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                                              title={`Priority: ${rule.priority}`}
                                            >
                                              {rule.priority}
                                            </Badge>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 rounded-full hover:bg-amber-50 hover:text-amber-600 transition-all"
                                            onClick={() => handleToggleActive(rule.id, rule.is_active)}
                                            disabled={isSaving}
                                            title={rule.is_active ? 'Deactivate keyword' : 'Activate keyword'}
                                          >
                                            {isSaving ? (
                                              <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                                            ) : rule.is_active ? (
                                              <EyeOff className="h-3 w-3" />
                                            ) : (
                                              <Eye className="h-3 w-3" />
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 rounded-full hover:bg-red-50 hover:text-red-600 transition-all"
                                            onClick={() => handleDelete(rule.id)}
                                            disabled={isSaving}
                                            title="Delete keyword"
                                          >
                                            {isSaving ? (
                                              <Loader2 className="h-3 w-3 animate-spin text-red-600" />
                                            ) : (
                                              <X className="h-3 w-3" />
                                            )}
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </Container>
      </div>
    </PermissionGuard>
  )
}
