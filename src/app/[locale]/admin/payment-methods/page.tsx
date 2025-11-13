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
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
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
  const { toast } = useEnhancedToast()
  const { containerVariant } = useLayout()

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
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
      const response = await fetch(`/api/payment-methods?includeInactive=${showInactive}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods')
      }

      const data = await response.json()
      setPaymentMethods(data.paymentMethods || [])
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      toast({
        title: 'Error',
        description: 'Failed to load payment methods',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive])

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

      toast({
        title: 'Success',
        description: `Payment method ${!method.is_active ? 'activated' : 'deactivated'} successfully`,
        variant: 'default'
      })

      fetchPaymentMethods()
    } catch (error: any) {
      console.error('Error toggling payment method:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment method',
        variant: 'destructive'
      })
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

      toast({
        title: 'Success',
        description: 'Order updated successfully',
        variant: 'default'
      })

      fetchPaymentMethods()
    } catch (error: any) {
      console.error('Error updating order:', error)
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCreate = async () => {
    try {
      setSaving(true)

      if (!formData.code) {
        toast({
          title: 'Validation Error',
          description: 'Code is required',
          variant: 'destructive'
        })
        return
      }

      if (!formData.name_en && !formData.name_ar) {
        toast({
          title: 'Validation Error',
          description: 'Please provide at least name_en or name_ar',
          variant: 'destructive'
        })
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

      toast({
        title: 'Success',
        description: 'Payment method created successfully',
        variant: 'default'
      })

      setIsCreateDialogOpen(false)
      fetchPaymentMethods()
    } catch (error: any) {
      console.error('Error creating payment method:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create payment method',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingMethod) return

    try {
      setSaving(true)

      if (!formData.code) {
        toast({
          title: 'Validation Error',
          description: 'Code is required',
          variant: 'destructive'
        })
        return
      }

      if (!formData.name_en && !formData.name_ar) {
        toast({
          title: 'Validation Error',
          description: 'Please provide at least name_en or name_ar',
          variant: 'destructive'
        })
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

      toast({
        title: 'Success',
        description: 'Payment method updated successfully',
        variant: 'default'
      })

      setIsEditDialogOpen(false)
      setEditingMethod(null)
      fetchPaymentMethods()
    } catch (error: any) {
      console.error('Error updating payment method:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment method',
        variant: 'destructive'
      })
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

      toast({
        title: 'Success',
        description: 'Payment method deleted successfully',
        variant: 'default'
      })

      setIsDeleteDialogOpen(false)
      setDeletingMethodId(null)
      fetchPaymentMethods()
    } catch (error: any) {
      console.error('Error deleting payment method:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete payment method',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const filteredMethods = paymentMethods.filter(method => {
    if (!showInactive && !method.is_active) return false
    
    const searchLower = searchTerm.toLowerCase()
    return (
      method.code.toLowerCase().includes(searchLower) ||
      (method.name_en?.toLowerCase().includes(searchLower)) ||
      (method.name_ar?.toLowerCase().includes(searchLower)) ||
      (method.name?.toLowerCase().includes(searchLower)) ||
      (method.description_en?.toLowerCase().includes(searchLower)) ||
      (method.description_ar?.toLowerCase().includes(searchLower))
    )
  })

  const sortedMethods = [...filteredMethods].sort((a, b) => a.sort_order - b.sort_order)

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
        <Container variant={containerVariant}>
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
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Manage Payment Methods
                    </h1>
                    <p className="text-gray-600 text-lg mt-1">
                      Add, edit, delete, and manage payment methods
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleCreate}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              >
                <Plus className="h-5 w-5" />
                Add Payment Method
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
                      placeholder="Search payment methods..."
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

          {/* Payment Methods List */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedMethods.length === 0 ? (
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Payment Methods Found
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first payment method'}
                </p>
                <Button onClick={handleCreate} className="bg-gradient-to-r from-blue-500 to-indigo-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedMethods.map((method, index) => {
                const IconComponent = method.icon ? getPaymentMethodIcon(method.icon) : CreditCard
                return (
                <Card
                  key={method.id}
                  className={`bg-white/90 backdrop-blur-sm border-0 shadow-lg transition-all hover:shadow-xl ${
                    !method.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {method.code}
                          </Badge>
                          <IconComponent className="h-5 w-5 text-gray-600" />
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {method.name_en || method.name}
                          </CardTitle>
                        </div>
                        {method.name_ar && (
                          <p className="text-sm text-gray-600 mb-2" dir="rtl">
                            {method.name_ar}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={method.is_active ? 'default' : 'secondary'}
                        className={method.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {method.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(method.description_en || method.description) && (
                      <p className="text-sm text-gray-600 mb-2">
                        {method.description_en || method.description}
                      </p>
                    )}
                    {method.description_ar && (
                      <p className="text-sm text-gray-600 mb-4" dir="rtl">
                        {method.description_ar}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMoveOrder(method, 'up')}
                          disabled={index === 0 || saving}
                          className="h-8 w-8 p-0"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMoveOrder(method, 'down')}
                          disabled={index === sortedMethods.length - 1 || saving}
                          className="h-8 w-8 p-0"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-gray-500 ml-2">Order: {method.sort_order}</span>
                      </div>
                      <div className="flex-1"></div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(method)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(method)}
                        disabled={saving}
                        className="flex-1"
                      >
                        {method.is_active ? (
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
                        onClick={() => handleDelete(method.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          )}

          {/* Create Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Payment Method</DialogTitle>
                <DialogDescription>
                  Add a new payment method with bilingual support
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="bank_transfer"
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique identifier (e.g., bank_transfer, mobile_wallet)</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name_en">Name (English) *</Label>
                    <Input
                      id="name_en"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      placeholder="Bank Transfer"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name_ar">Name (Arabic)</Label>
                    <Input
                      id="name_ar"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      placeholder="تحويل بنكي"
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
                      placeholder="Direct bank transfer to our account"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description_ar">Description (Arabic)</Label>
                    <Textarea
                      id="description_ar"
                      value={formData.description_ar}
                      onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                      placeholder="تحويل مباشر إلى حسابنا البنكي"
                      rows={3}
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="icon">Icon (Lucide icon name)</Label>
                    <Input
                      id="icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="Building2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Icon name from lucide-react (e.g., Building2, Smartphone)</p>
                  </div>
                  <div>
                    <Label htmlFor="sort_order">Sort Order</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
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
                  {saving ? 'Creating...' : 'Create Payment Method'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Payment Method</DialogTitle>
                <DialogDescription>
                  Update payment method information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit_code">Code *</Label>
                  <Input
                    id="edit_code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="bank_transfer"
                    className="font-mono"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_name_en">Name (English) *</Label>
                    <Input
                      id="edit_name_en"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      placeholder="Bank Transfer"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_name_ar">Name (Arabic)</Label>
                    <Input
                      id="edit_name_ar"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      placeholder="تحويل بنكي"
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
                      placeholder="Direct bank transfer to our account"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_description_ar">Description (Arabic)</Label>
                    <Textarea
                      id="edit_description_ar"
                      value={formData.description_ar}
                      onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                      placeholder="تحويل مباشر إلى حسابنا البنكي"
                      rows={3}
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit_icon">Icon (Lucide icon name)</Label>
                    <Input
                      id="edit_icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="Building2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_sort_order">Sort Order</Label>
                    <Input
                      id="edit_sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
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

