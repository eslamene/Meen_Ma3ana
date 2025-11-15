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
import { Switch } from '@/components/ui/switch'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import DynamicIcon from '@/components/ui/dynamic-icon'

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
  const [showInactive, setShowInactive] = useState(false)
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
      console.error('Error fetching categories:', error)
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
      if (!showInactive) {
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
      console.error('Error fetching rules:', error)
      toast.error('Error', { description: 'Failed to load category detection rules' })
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, showInactive, toast, expandedCategories.size])

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
      console.error('Error updating rule:', error)
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to update rule' })
    } finally {
      setSaving(prev => ({ ...prev, [editingRuleId]: false }))
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
      console.error('Error deleting rule:', error)
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
      console.error('Error creating rule:', error)
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to create rule' }) 
    } finally {
      setSaving(prev => ({ ...prev, [`add-${newCategoryId}`]: false }))
    }
  }

  const filteredRules = rules.filter((rule) => {
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

  return (
    <PermissionGuard permission="admin:dashboard">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-6">
        <Container variant={containerVariant}>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-[#6B8E7E]" />
                  Category Detection Rules
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage keywords used to automatically categorize cases
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories
                      .filter(c => c.is_active || showInactive)
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
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-inactive"
                    checked={showInactive}
                    onCheckedChange={setShowInactive}
                  />
                  <Label htmlFor="show-inactive" className="cursor-pointer text-sm">
                    Show Inactive
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rules List - Tag Editor Style */}
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B8E7E] mx-auto"></div>
                <p className="mt-4 text-muted-foreground text-sm">Loading rules...</p>
              </CardContent>
            </Card>
          ) : filteredRules.length === 0 && !Object.keys(groupedRules).length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No rules found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedRules).map(([categoryId, categoryRules]) => {
                const firstRule = categoryRules[0]
                const category = firstRule.category || getCategoryById(categoryId)
                const isExpanded = expandedCategories.has(categoryId)
                const isAdding = addingToCategory === categoryId
                const activeRules = categoryRules.filter(r => r.is_active)
                const inactiveRules = categoryRules.filter(r => !r.is_active)

                return (
                  <Card key={categoryId} className="overflow-hidden">
                    <CardHeader 
                      className="py-3 px-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleCategory(categoryId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCategory(categoryId)
                            }}
                            className="flex items-center gap-2 flex-1 min-w-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <Badge 
                              className={cn(
                                "text-xs",
                                category?.color ? '' : 'bg-gray-100 text-gray-800'
                              )}
                              style={category?.color ? { backgroundColor: category.color + '20', color: category.color } : undefined}
                            >
                              {category?.icon && <DynamicIcon name={category.icon} className="h-4 w-4 mr-1" />}
                              {category?.name || 'Unknown Category'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {categoryRules.length} {categoryRules.length === 1 ? 'rule' : 'rules'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="pt-4 pb-4 px-4">
                        {/* Add New Tag Input */}
                        {isAdding ? (
                          <div className="mb-4 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-dashed border-[#6B8E7E] shadow-lg">
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
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
                                  className="flex-1 shadow-sm"
                                  autoFocus
                                />
                                <Input
                                  type="number"
                                  placeholder="Priority"
                                  value={newPriority}
                                  onChange={(e) => setNewPriority(parseInt(e.target.value) || 0)}
                                  className="w-24 shadow-sm"
                                />
                                <Button
                                  size="sm"
                                  onClick={saveAdd}
                                  disabled={saving[`add-${categoryId}`] || !newKeyword.trim()}
                                  className="bg-[#6B8E7E] hover:bg-[#6B8E7E]/90 shadow-md hover:shadow-lg transition-all"
                                >
                                  {saving[`add-${categoryId}`] ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelAdd}
                                  disabled={saving[`add-${categoryId}`]}
                                  className="shadow-sm hover:shadow-md transition-all"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startAdd(categoryId)}
                            className="mb-4 w-full border-dashed border-2 border-gray-300 hover:border-[#6B8E7E] hover:bg-gradient-to-br hover:from-gray-50 hover:to-white transition-all shadow-sm hover:shadow-md"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Keyword
                          </Button>
                        )}

                        {/* Active Tags */}
                        {activeRules.length > 0 && (
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
                                        "group inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200",
                                        isEditing 
                                          ? "border-2 border-[#6B8E7E] shadow-lg ring-2 ring-[#6B8E7E]/20" 
                                          : "border shadow-sm hover:shadow-md hover:scale-105",
                                        !rule.is_active && "opacity-60",
                                        !hasColor && !isEditing && "bg-gradient-to-br from-white to-gray-50 border-gray-200/60 hover:border-[#6B8E7E]/40"
                                      )}
                                      style={!isEditing ? {
                                        ...(hasColor ? {
                                          backgroundColor: categoryColor + '15',
                                          borderColor: categoryColor + '40',
                                          color: categoryColor,
                                          boxShadow: `0 2px 8px ${categoryColor}20, 0 1px 3px rgba(0, 0, 0, 0.1)`
                                        } : {
                                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.1)'
                                        }),
                                        ...(hasColor && {
                                          '--hover-border': categoryColor + '60'
                                        } as React.CSSProperties)
                                      } : {
                                        backgroundColor: hasColor ? categoryColor + '10' : undefined
                                      }}
                                      onMouseEnter={(e) => {
                                        if (hasColor && !isEditing) {
                                          e.currentTarget.style.borderColor = categoryColor + '60'
                                          e.currentTarget.style.boxShadow = `0 4px 12px ${categoryColor}30, 0 2px 4px rgba(0, 0, 0, 0.1)`
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (hasColor && !isEditing) {
                                          e.currentTarget.style.borderColor = categoryColor + '40'
                                          e.currentTarget.style.boxShadow = `0 2px 8px ${categoryColor}20, 0 1px 3px rgba(0, 0, 0, 0.1)`
                                        }
                                      }}
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
                                            className="h-7 px-2 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                            style={{ width: `${Math.max(editingKeyword.length * 8 + 20, 80)}px` }}
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
                                            className="h-7 px-1.5 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-16"
                                            placeholder="P:0"
                                          />
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={saveEdit}
                                            disabled={isSaving}
                                          >
                                            {isSaving ? (
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#6B8E7E]" />
                                            ) : (
                                              <Check className="h-3 w-3 text-green-600" />
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={cancelEdit}
                                            disabled={isSaving}
                                          >
                                            <X className="h-3 w-3 text-gray-500" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span 
                                            className={cn(
                                              "text-sm font-semibold cursor-pointer transition-colors",
                                              hasColor ? "" : "text-gray-700 hover:text-[#6B8E7E]"
                                            )}
                                            style={hasColor ? {
                                              color: categoryColor
                                            } : undefined}
                                            onClick={() => startEdit(rule)}
                                          >
                                            {rule.keyword}
                                          </span>
                                          {rule.priority > 0 && (
                                            <span 
                                              className="text-xs text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                              title={`Priority: ${rule.priority}`}
                                            >
                                              {rule.priority}
                                            </span>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 rounded-full hover:bg-red-100 hover:text-red-600 transition-all hover:scale-110"
                                            onClick={() => handleDelete(rule.id)}
                                            disabled={isSaving}
                                          >
                                            {isSaving ? (
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600" />
                                            ) : (
                                              <X className="h-3.5 w-3.5" />
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

                        {/* Inactive Tags */}
                        {inactiveRules.length > 0 && showInactive && (
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Inactive</Label>
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
                                        "group inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200",
                                        isEditing 
                                          ? "border-2 border-[#6B8E7E] shadow-lg ring-2 ring-[#6B8E7E]/20 opacity-100" 
                                          : "border shadow-sm hover:shadow-md hover:scale-105 opacity-60",
                                        !hasColor && !isEditing && "bg-gradient-to-br from-white to-gray-50 border-gray-200/60 hover:border-[#6B8E7E]/40"
                                      )}
                                      style={!isEditing ? {
                                        ...(hasColor ? {
                                          backgroundColor: categoryColor + '15',
                                          borderColor: categoryColor + '40',
                                          color: categoryColor,
                                          boxShadow: `0 2px 8px ${categoryColor}20, 0 1px 3px rgba(0, 0, 0, 0.1)`
                                        } : {
                                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.1)'
                                        })
                                      } : {
                                        backgroundColor: hasColor ? categoryColor + '10' : undefined
                                      }}
                                      onMouseEnter={(e) => {
                                        if (hasColor && !isEditing) {
                                          e.currentTarget.style.borderColor = categoryColor + '60'
                                          e.currentTarget.style.boxShadow = `0 4px 12px ${categoryColor}30, 0 2px 4px rgba(0, 0, 0, 0.1)`
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (hasColor && !isEditing) {
                                          e.currentTarget.style.borderColor = categoryColor + '40'
                                          e.currentTarget.style.boxShadow = `0 2px 8px ${categoryColor}20, 0 1px 3px rgba(0, 0, 0, 0.1)`
                                        }
                                      }}
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
                                            className="h-7 px-2 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                            style={{ width: `${Math.max(editingKeyword.length * 8 + 20, 80)}px` }}
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
                                            className="h-7 px-1.5 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-16"
                                            placeholder="P:0"
                                          />
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={saveEdit}
                                            disabled={isSaving}
                                          >
                                            {isSaving ? (
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#6B8E7E]" />
                                            ) : (
                                              <Check className="h-3 w-3 text-green-600" />
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={cancelEdit}
                                            disabled={isSaving}
                                          >
                                            <X className="h-3 w-3 text-gray-500" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span 
                                            className={cn(
                                              "text-sm font-semibold cursor-pointer transition-colors",
                                              hasColor ? "" : "text-gray-700 hover:text-[#6B8E7E]"
                                            )}
                                            style={hasColor ? {
                                              color: categoryColor
                                            } : undefined}
                                            onClick={() => startEdit(rule)}
                                          >
                                            {rule.keyword}
                                          </span>
                                          {rule.priority > 0 && (
                                            <span 
                                              className="text-xs text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                              title={`Priority: ${rule.priority}`}
                                            >
                                              {rule.priority}
                                            </span>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 rounded-full hover:bg-red-100 hover:text-red-600 transition-all hover:scale-110"
                                            onClick={() => handleDelete(rule.id)}
                                            disabled={isSaving}
                                          >
                                            {isSaving ? (
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600" />
                                            ) : (
                                              <X className="h-3.5 w-3.5" />
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
