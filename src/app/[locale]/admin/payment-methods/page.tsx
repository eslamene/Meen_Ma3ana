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
import { toast } from 'sonner'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import StandardModal, { StandardFormField, StandardStatusToggle } from '@/components/ui/standard-modal'
import ActiveInactiveTabs from '@/components/ui/active-inactive-tabs'
import { 
  CreditCard, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Building2,
  Smartphone,
  Banknote,
  FileCheck,
  type LucideIcon
} from 'lucide-react'
import TranslationButton from '@/components/translation/TranslationButton'

import { defaultLogger as logger } from '@/lib/logger'

interface PaymentMethod {
  id: string
  code: string
  name: string
  name_en: string | null
  name_ar: string | null
  description: string | null
  description_en: string | null
  description_ar: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function AdminPaymentMethodsPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin')
  const { containerVariant } = useLayout()

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active')
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    code: '',
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    icon: '',
    sort_order: 0,
    is_active: true
  })

  const fetchPaymentMethods = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/payment-methods?includeInactive=true`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods')
      }

      const data = await response.json()
      setPaymentMethods(data.paymentMethods || [])
    } catch (error) {
      logger.error('Error fetching payment methods:', { error: error })
      toast.error('Error', { description: 'Failed to load payment methods' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPaymentMethods()
  }, [fetchPaymentMethods])

  const handleCreate = () => {
    setFormData({
      code: '',
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      icon: '',
      sort_order: paymentMethods.length > 0 ? Math.max(...paymentMethods.map(pm => pm.sort_order)) + 1 : 0,
      is_active: true
    })
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method)
    setFormData({
      code: method.code,
      name_en: method.name_en || method.name || '',
      name_ar: method.name_ar || '',
      description_en: method.description_en || method.description || '',
      description_ar: method.description_ar || '',
      icon: method.icon || '',
      sort_order: method.sort_order,
      is_active: method.is_active
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = (methodId: string) => {
    setDeletingMethodId(methodId)
    setIsDeleteDialogOpen(true)
  }

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/payment-methods/${method.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !method.is_active
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update payment method')
      }

      toast.success('Success', { description: `Payment method ${!method.is_active ? 'activated' : 'deactivated'} successfully` })

      fetchPaymentMethods()
    } catch (error: any) {
      logger.error('Error toggling payment method:', { error: error })
      toast.error('Error', { description: error.message || 'Failed to update payment method' })
    } finally {
      setSaving(false)
    }
  }

  const handleMoveOrder = async (method: PaymentMethod, direction: 'up' | 'down') => {
    const sortedMethods = [...paymentMethods].sort((a, b) => a.sort_order - b.sort_order)
    const currentIndex = sortedMethods.findIndex(pm => pm.id === method.id)
    
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= sortedMethods.length) return

    const targetMethod = sortedMethods[newIndex]
    const newSortOrder = targetMethod.sort_order

    try {
      setSaving(true)
      // Update both methods' sort orders
      await Promise.all([
        fetch(`/api/payment-methods/${method.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: newSortOrder })
        }),
        fetch(`/api/payment-methods/${targetMethod.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: method.sort_order })
        })
      ])

      toast.success('Success', { description: 'Order updated successfully' })

      fetchPaymentMethods()
    } catch (error: any) {
      logger.error('Error updating order:', { error: error })
      toast.error('Error', { description: 'Failed to update order' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCreate = async () => {
    try {
      setSaving(true)

      if (!formData.code) {
        toast.error('Validation Error', { description: 'Code is required' })
        return
      }

      if (!formData.name_en && !formData.name_ar) {
        toast.error('Validation Error', { description: 'Please provide at least name_en or name_ar' })
        return
      }

      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create payment method')
      }

      toast.success('Success', { description: 'Payment method created successfully' })

      setIsCreateDialogOpen(false)
      fetchPaymentMethods()
    } catch (error: any) {
      logger.error('Error creating payment method:', { error: error })
      toast.error('Error', { description: error.message || 'Failed to create payment method' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingMethod) return

    try {
      setSaving(true)

      if (!formData.code) {
        toast.error('Validation Error', { description: 'Code is required' })
        return
      }

      if (!formData.name_en && !formData.name_ar) {
        toast.error('Validation Error', { description: 'Please provide at least name_en or name_ar' })
        return
      }

      const response = await fetch(`/api/payment-methods/${editingMethod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update payment method')
      }

      toast.success('Success', { description: 'Payment method updated successfully' })

      setIsEditDialogOpen(false)
      setEditingMethod(null)
      fetchPaymentMethods()
    } catch (error: any) {
      logger.error('Error updating payment method:', { error: error })
      toast.error('Error', { description: error.message || 'Failed to update payment method' })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingMethodId) return

    try {
      setSaving(true)
      const response = await fetch(`/api/payment-methods/${deletingMethodId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete payment method')
      }

      toast.success('Success', { description: 'Payment method deleted successfully' })

      setIsDeleteDialogOpen(false)
      setDeletingMethodId(null)
      fetchPaymentMethods()
    } catch (error: any) {
      logger.error('Error deleting payment method:', { error: error })
      toast.error('Error', { description: error.message || 'Failed to delete payment method' })
    } finally {
      setSaving(false)
    }
  }

  const filteredMethods = paymentMethods.filter(method => {
    // Filter by active/inactive tab
    if (activeTab === 'active' && !method.is_active) return false
    if (activeTab === 'inactive' && method.is_active) return false
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        method.code.toLowerCase().includes(searchLower) ||
        (method.name_en?.toLowerCase().includes(searchLower)) ||
        (method.name_ar?.toLowerCase().includes(searchLower)) ||
        (method.name?.toLowerCase().includes(searchLower)) ||
        (method.description_en?.toLowerCase().includes(searchLower)) ||
        (method.description_ar?.toLowerCase().includes(searchLower))
      )
    }
    
    return true
  })

  const sortedMethods = [...filteredMethods].sort((a, b) => a.sort_order - b.sort_order)
  
  // Count active and inactive methods
  const activeCount = paymentMethods.filter(m => m.is_active).length
  const inactiveCount = paymentMethods.filter(m => !m.is_active).length

  // Map icon names to Lucide icon components
  const getPaymentMethodIcon = (iconName: string | null | undefined): LucideIcon => {
    if (!iconName) return CreditCard
    
    const iconMap: Record<string, LucideIcon> = {
      'Building2': Building2,
      'Smartphone': Smartphone,
      'Banknote': Banknote,
      'FileCheck': FileCheck,
      'CreditCard': CreditCard,
      // Handle lowercase variations
      'building2': Building2,
      'smartphone': Smartphone,
      'banknote': Banknote,
      'filecheck': FileCheck,
      'creditcard': CreditCard,
    }
    
    return iconMap[iconName] || CreditCard
  }


  return (
    <PermissionGuard permissions={["payment_methods:manage", "admin:dashboard", "cases:manage"]} fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to manage payment methods.</p>
            <Button onClick={() => router.push(`/${locale}/admin`)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <Container variant={containerVariant} className="py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <DetailPageHeader
            backUrl={`/${locale}/admin`}
            icon={CreditCard}
            title="Manage Payment Methods"
            description="Add, edit, delete, and manage payment methods"
            badge={{
              label: `${paymentMethods.length} ${paymentMethods.length === 1 ? 'method' : 'methods'}`,
              variant: 'secondary'
            }}
            menuActions={[
              {
                label: 'Add Payment Method',
                icon: Plus,
                onClick: handleCreate,
              },
            ]}
          />

          {/* Tabs and Search */}
          <ActiveInactiveTabs
            value={activeTab}
            onValueChange={setActiveTab}
            activeCount={activeCount}
            inactiveCount={inactiveCount}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search payment methods..."
          />

          {/* Payment Methods List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Loading payment methods...</p>
              </div>
            </div>
          ) : sortedMethods.length === 0 ? (
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Payment Methods Found
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {searchTerm ? 'Try adjusting your search terms' : `Get started by creating your first ${activeTab === 'active' ? 'active' : 'inactive'} payment method`}
                </p>
                <Button onClick={handleCreate} className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedMethods.map((method, index) => {
                const IconComponent = method.icon ? getPaymentMethodIcon(method.icon) : CreditCard
                return (
                <Card
                  key={method.id}
                  className={`border border-gray-200 bg-white hover:shadow-md transition-all duration-200 ${
                    !method.is_active ? 'opacity-75' : ''
                  }`}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Left: Icon and Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-sm shrink-0">
                          <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">
                              {method.name_en || method.name}
                            </h3>
                            <Badge variant="outline" className="text-xs font-mono shrink-0">
                              {method.code}
                            </Badge>
                            <Badge
                              variant={method.is_active ? 'default' : 'secondary'}
                              className={`text-xs shrink-0 ${
                                method.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}
                            >
                              {method.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {method.name_ar && (
                            <p className="text-xs sm:text-sm text-gray-600 mb-2" dir="rtl">
                              {method.name_ar}
                            </p>
                          )}
                          {(method.description_en || method.description) && (
                            <p className="text-xs sm:text-sm text-gray-600 mb-1 line-clamp-2">
                              {method.description_en || method.description}
                            </p>
                          )}
                          {method.description_ar && (
                            <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2" dir="rtl">
                              {method.description_ar}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                        {/* Order Controls */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMoveOrder(method, 'up')}
                            disabled={index === 0 || saving}
                            className="h-7 w-7 p-0 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
                            title="Move up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMoveOrder(method, 'down')}
                            disabled={index === sortedMethods.length - 1 || saving}
                            className="h-7 w-7 p-0 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
                            title="Move down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-xs text-gray-500 ml-1 hidden sm:inline">#{method.sort_order}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(method)}
                            className="h-8 text-xs sm:text-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
                          >
                            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(method)}
                            disabled={saving}
                            className="h-8 text-xs sm:text-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300"
                          >
                            {method.is_active ? (
                              <>
                                <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                                <span className="hidden sm:inline">Deactivate</span>
                                <span className="sm:hidden">Off</span>
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                                <span className="hidden sm:inline">Activate</span>
                                <span className="sm:hidden">On</span>
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(method.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          )}

          {/* Create Dialog */}
          <StandardModal
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            title="Create New Payment Method"
            description="Add a new payment method with bilingual support"
            sections={[
              {
                title: "Basic Information",
                children: (
                  <div className="space-y-4">
                    <StandardFormField label="Code" required description="Unique identifier (e.g., bank_transfer, mobile_wallet)">
                      <Input
                        id="create_code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        placeholder="bank_transfer"
                        className="font-mono"
                      />
                    </StandardFormField>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <StandardFormField label="Name (English)" required>
                        <div className="relative">
                          <Input
                            id="create_name_en"
                            value={formData.name_en}
                            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                            placeholder="Bank Transfer"
                            className="pr-24"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <TranslationButton
                              sourceText={formData.name_ar || ''}
                              direction="ar-to-en"
                              onTranslate={(translated) => setFormData({ ...formData, name_en: translated })}
                              size="sm"
                              variant="ghost"
                              iconOnly
                              className="h-6 w-6 p-0"
                            />
                          </div>
                        </div>
                      </StandardFormField>
                      <StandardFormField label="Name (Arabic)">
                        <div className="relative">
                          <Input
                            id="create_name_ar"
                            value={formData.name_ar}
                            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                            placeholder="تحويل بنكي"
                            dir="rtl"
                            className="pl-24"
                          />
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <TranslationButton
                              sourceText={formData.name_en || ''}
                              direction="en-to-ar"
                              onTranslate={(translated) => setFormData({ ...formData, name_ar: translated })}
                              size="sm"
                              variant="ghost"
                              iconOnly
                              className="h-6 w-6 p-0"
                            />
                          </div>
                        </div>
                      </StandardFormField>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <StandardFormField label="Description (English)">
                        <div className="relative">
                          <Textarea
                            id="create_description_en"
                            value={formData.description_en}
                            onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                            placeholder="Direct bank transfer to our account"
                            rows={3}
                            className="pr-24"
                          />
                          <div className="absolute right-2 top-2 flex items-center gap-2">
                            <TranslationButton
                              sourceText={formData.description_ar || ''}
                              direction="ar-to-en"
                              onTranslate={(translated) => setFormData({ ...formData, description_en: translated })}
                              size="sm"
                              variant="ghost"
                              iconOnly
                              className="h-6 w-6 p-0"
                            />
                          </div>
                        </div>
                      </StandardFormField>
                      <StandardFormField label="Description (Arabic)">
                        <div className="relative">
                          <Textarea
                            id="create_description_ar"
                            value={formData.description_ar}
                            onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                            placeholder="تحويل مباشر إلى حسابنا البنكي"
                            rows={3}
                            dir="rtl"
                            className="pl-24"
                          />
                          <div className="absolute left-2 top-2 flex items-center gap-2">
                            <TranslationButton
                              sourceText={formData.description_en || ''}
                              direction="en-to-ar"
                              onTranslate={(translated) => setFormData({ ...formData, description_ar: translated })}
                              size="sm"
                              variant="ghost"
                              iconOnly
                              className="h-6 w-6 p-0"
                            />
                          </div>
                        </div>
                      </StandardFormField>
                    </div>
                  </div>
                )
              },
              {
                title: "Display Settings",
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StandardFormField label="Icon" description="Icon name from lucide-react (e.g., Building2, Smartphone)">
                      <Input
                        id="create_icon"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        placeholder="Building2"
                      />
                    </StandardFormField>
                    <StandardFormField label="Sort Order" description="Lower numbers appear first">
                      <Input
                        id="create_sort_order"
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </StandardFormField>
                  </div>
                )
              },
              {
                title: "Status",
                children: (
                  <StandardStatusToggle
                    label="Payment Method Status"
                    description="This payment method is active and visible to users"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    id="create_is_active"
                  />
                )
              }
            ]}
            primaryAction={{
              label: "Create Payment Method",
              onClick: handleSaveCreate,
              loading: saving,
              disabled: saving
            }}
            secondaryAction={{
              label: "Cancel",
              onClick: () => setIsCreateDialogOpen(false),
              disabled: saving
            }}
          />

          {/* Edit Dialog */}
          <StandardModal
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            title="Edit Payment Method"
            description="Update payment method information"
            sections={[
              {
                title: "Basic Information",
                children: (
                  <div className="space-y-4">
                    <StandardFormField label="Code" required description="Unique identifier">
                      <Input
                        id="edit_code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        placeholder="bank_transfer"
                        className="font-mono"
                      />
                    </StandardFormField>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <StandardFormField label="Name (English)" required>
                        <div className="relative">
                          <Input
                            id="edit_name_en"
                            value={formData.name_en}
                            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                            placeholder="Bank Transfer"
                            className="pr-24"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <TranslationButton
                              sourceText={formData.name_ar || ''}
                              direction="ar-to-en"
                              onTranslate={(translated) => setFormData({ ...formData, name_en: translated })}
                              size="sm"
                              variant="ghost"
                              iconOnly
                              className="h-6 w-6 p-0"
                            />
                          </div>
                        </div>
                      </StandardFormField>
                      <StandardFormField label="Name (Arabic)">
                        <div className="relative">
                          <Input
                            id="edit_name_ar"
                            value={formData.name_ar}
                            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                            placeholder="تحويل بنكي"
                            dir="rtl"
                            className="pl-24"
                          />
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <TranslationButton
                              sourceText={formData.name_en || ''}
                              direction="en-to-ar"
                              onTranslate={(translated) => setFormData({ ...formData, name_ar: translated })}
                              size="sm"
                              variant="ghost"
                              iconOnly
                              className="h-6 w-6 p-0"
                            />
                          </div>
                        </div>
                      </StandardFormField>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <StandardFormField label="Description (English)">
                        <div className="relative">
                          <Textarea
                            id="edit_description_en"
                            value={formData.description_en}
                            onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                            placeholder="Direct bank transfer to our account"
                            rows={3}
                            className="pr-24"
                          />
                          <div className="absolute right-2 top-2 flex items-center gap-2">
                            <TranslationButton
                              sourceText={formData.description_ar || ''}
                              direction="ar-to-en"
                              onTranslate={(translated) => setFormData({ ...formData, description_en: translated })}
                              size="sm"
                              variant="ghost"
                              iconOnly
                              className="h-6 w-6 p-0"
                            />
                          </div>
                        </div>
                      </StandardFormField>
                      <StandardFormField label="Description (Arabic)">
                        <div className="relative">
                          <Textarea
                            id="edit_description_ar"
                            value={formData.description_ar}
                            onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                            placeholder="تحويل مباشر إلى حسابنا البنكي"
                            rows={3}
                            dir="rtl"
                            className="pl-24"
                          />
                          <div className="absolute left-2 top-2 flex items-center gap-2">
                            <TranslationButton
                              sourceText={formData.description_en || ''}
                              direction="en-to-ar"
                              onTranslate={(translated) => setFormData({ ...formData, description_ar: translated })}
                              size="sm"
                              variant="ghost"
                              iconOnly
                              className="h-6 w-6 p-0"
                            />
                          </div>
                        </div>
                      </StandardFormField>
                    </div>
                  </div>
                )
              },
              {
                title: "Display Settings",
                children: (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StandardFormField label="Icon" description="Icon name from lucide-react">
                      <Input
                        id="edit_icon"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        placeholder="Building2"
                      />
                    </StandardFormField>
                    <StandardFormField label="Sort Order" description="Lower numbers appear first">
                      <Input
                        id="edit_sort_order"
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </StandardFormField>
                  </div>
                )
              },
              {
                title: "Status",
                children: (
                  <StandardStatusToggle
                    label="Payment Method Status"
                    description="This payment method is active and visible to users"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    id="edit_is_active"
                  />
                )
              }
            ]}
            primaryAction={{
              label: "Save Changes",
              onClick: handleSaveEdit,
              loading: saving,
              disabled: saving
            }}
            secondaryAction={{
              label: "Cancel",
              onClick: () => setIsEditDialogOpen(false),
              disabled: saving
            }}
          />

          {/* Delete Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Payment Method</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this payment method? This action cannot be undone.
                  {deletingMethodId && paymentMethods.find(pm => pm.id === deletingMethodId) && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-red-800 text-sm">
                      Payment Method: {paymentMethods.find(pm => pm.id === deletingMethodId)?.name_en || paymentMethods.find(pm => pm.id === deletingMethodId)?.name}
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
                  {saving ? 'Deleting...' : 'Delete Payment Method'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Container>
      </div>
    </PermissionGuard>
  )
}

