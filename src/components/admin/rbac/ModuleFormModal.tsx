'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, Info, Eye, Palette, MoveUp, MoveDown } from 'lucide-react'
import { getAvailableIcons, getIcon, IconComponent } from '@/lib/icons/registry'
import { useToast } from '@/hooks/use-toast'
import { slugify } from '@/lib/utils/rbac-helpers'

// Color mapping to prevent Tailwind purging
const COLOR_CLASSES = {
  blue: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-100',
    text: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-500',
    bgLight: 'bg-green-100',
    text: 'text-green-600',
  },
  red: {
    bg: 'bg-red-500',
    bgLight: 'bg-red-100',
    text: 'text-red-600',
  },
  purple: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-100',
    text: 'text-purple-600',
  },
  yellow: {
    bg: 'bg-yellow-500',
    bgLight: 'bg-yellow-100',
    text: 'text-yellow-600',
  },
  indigo: {
    bg: 'bg-indigo-500',
    bgLight: 'bg-indigo-100',
    text: 'text-indigo-600',
  },
  gray: {
    bg: 'bg-gray-500',
    bgLight: 'bg-gray-100',
    text: 'text-gray-600',
  },
  emerald: {
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-100',
    text: 'text-emerald-600',
  },
  orange: {
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-100',
    text: 'text-orange-600',
  },
} as const

const getColorClasses = (color: string) => {
  return COLOR_CLASSES[color as keyof typeof COLOR_CLASSES] || COLOR_CLASSES.gray
}

// Define the module interface
interface Module {
  id?: string
  name: string
  display_name: string
  description?: string
  icon: string
  color: string
  sort_order: number
  is_system?: boolean
  permissions_count?: number
  permissions?: Array<{ name: string; display_name: string }>
}

// Props interface
interface ModuleFormModalProps {
  module?: Module
  onSave: (data: Omit<Module, 'id'>) => Promise<void>
  onClose: () => void
  open: boolean
}

// Form validation schema
const moduleSchema = z.object({
  name: z.string().min(1, 'Name is required').regex(/^[a-z_]+$/, 'Name must be lowercase with underscores'),
  display_name: z.string().min(1, 'Display name is required'),
  description: z.string().optional(),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().min(1, 'Color is required'),
  sort_order: z.number().min(0),
  is_system: z.boolean().optional(),
})

type ModuleFormData = z.infer<typeof moduleSchema>

// Color presets
const COLOR_PRESETS = [
  { name: 'Blue', value: 'blue' },
  { name: 'Green', value: 'green' },
  { name: 'Red', value: 'red' },
  { name: 'Purple', value: 'purple' },
  { name: 'Yellow', value: 'yellow' },
  { name: 'Indigo', value: 'indigo' },
  { name: 'Gray', value: 'gray' },
  { name: 'Emerald', value: 'emerald' },
  { name: 'Orange', value: 'orange' },
]

// Icon categories
const ICON_CATEGORIES = {
  navigation: ['Home', 'Settings', 'Menu', 'ChevronDown', 'ChevronRight'],
  actions: ['Plus', 'Edit', 'Trash2', 'Save', 'Download', 'Upload'],
  objects: ['Folder', 'FileText', 'Package', 'Shield', 'Lock'],
  users: ['User', 'Users', 'UserCheck', 'UserPlus'],
  data: ['BarChart3', 'TrendingUp', 'FileText', 'CreditCard'],
  other: ['Heart', 'Bell', 'Info', 'Mail', 'Globe'],
}

export function ModuleFormModal({ module, onSave, onClose, open }: ModuleFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [customColor, setCustomColor] = useState('')
  const { toast } = useToast()
  const isEdit = !!module

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      name: module?.name || '',
      display_name: module?.display_name || '',
      description: module?.description || '',
      icon: module?.icon || 'Package',
      color: module?.color || 'blue',
      sort_order: module?.sort_order || 0,
      is_system: module?.is_system || false,
    },
  })

  const watchedFields = watch()

  // Auto-slugify name
  useEffect(() => {
    if (!isEdit && watchedFields.display_name) {
      const slugified = slugify(watchedFields.display_name)
      setValue('name', slugified)
    }
  }, [watchedFields.display_name, isEdit, setValue])

  // Reset form when modal opens/closes or module changes
  useEffect(() => {
    if (open) {
      reset({
        name: module?.name || '',
        display_name: module?.display_name || '',
        description: module?.description || '',
        icon: module?.icon || 'Package',
        color: module?.color || 'blue',
        sort_order: module?.sort_order || 0,
        is_system: module?.is_system || false,
      })
      setCustomColor('')
    }
  }, [open, module, reset])

  const onSubmit = async (data: ModuleFormData) => {
    setLoading(true)
    try {
      await onSave(data)
      toast({
        title: 'Success',
        description: `Module ${isEdit ? 'updated' : 'created'} successfully`,
      })
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${isEdit ? 'update' : 'create'} module`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleColorChange = (color: string) => {
    setValue('color', color)
    setCustomColor('')
  }

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color)
    setValue('color', color)
  }

  const renderIconPreview = (iconName: string) => {
    const Icon = getIcon(iconName)
    return Icon ? <Icon className="h-4 w-4" /> : <Package className="h-4 w-4" />
  }

  const renderColorSwatch = (color: string) => {
    const colorClasses = getColorClasses(color)
    return <div className={`w-6 h-6 rounded-full ${colorClasses.bg} border-2 border-white shadow-sm`} />
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Module' : 'Create Module'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the module details below.' : 'Create a new module to organize permissions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="display_name">Display Name *</Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>The human-readable name shown in the menu</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  id="display_name"
                  {...register('display_name')}
                  placeholder="e.g., Cases Management"
                />
                {errors.display_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.display_name.message}</p>
                )}
              </div>

              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="name">Name</Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Auto-generated slug for internal use (lowercase with underscores)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  id="name"
                  {...register('name')}
                  disabled={isEdit}
                  placeholder="e.g., cases_management"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="description">Description</Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Optional description of what this module contains</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe the purpose of this module..."
                  rows={3}
                />
              </div>

              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label>Icon *</Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Choose an icon to represent this module in the menu</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Select value={watchedFields.icon} onValueChange={(value) => setValue('icon', value)}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {renderIconPreview(watchedFields.icon)}
                        {watchedFields.icon}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Object.entries(ICON_CATEGORIES).map(([category, icons]) => (
                      <div key={category}>
                        <div className="px-2 py-1 text-sm font-semibold text-gray-500 uppercase">
                          {category}
                        </div>
                        {icons.map((icon) => (
                          <SelectItem key={icon} value={icon}>
                            <div className="flex items-center gap-2">
                              {renderIconPreview(icon)}
                              {icon}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                {errors.icon && (
                  <p className="text-sm text-red-600 mt-1">{errors.icon.message}</p>
                )}
              </div>

              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label>Color *</Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Choose a color theme for this module</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleColorChange(preset.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                          watchedFields.color === preset.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {renderColorSwatch(preset.value)}
                        {preset.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="custom_color" className="text-sm">Custom:</Label>
                    <Input
                      id="custom_color"
                      type="color"
                      value={customColor || watchedFields.color}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      className="w-12 h-8 p-1 border rounded"
                    />
                  </div>
                </div>
                {errors.color && (
                  <p className="text-sm text-red-600 mt-1">{errors.color.message}</p>
                )}
              </div>

              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="sort_order">Sort Order</Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Position in the menu (lower numbers appear first)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  id="sort_order"
                  type="number"
                  {...register('sort_order', { valueAsNumber: true })}
                  min={0}
                />
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setValue('sort_order', Math.max(0, watchedFields.sort_order - 1))}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setValue('sort_order', watchedFields.sort_order + 1)}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-500">Current position: {watchedFields.sort_order}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_system"
                  {...register('is_system')}
                  disabled={!isEdit || !module?.is_system} // Only allow setting for new modules or if already system
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="is_system" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        System Module
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>System modules cannot be deleted and are managed by the system</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {isEdit && module?.is_system && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This is a system module. Some changes may be restricted.
                  </AlertDescription>
                </Alert>
              )}

              {isEdit && module?.permissions_count !== undefined && (
                <div className="text-sm text-gray-600">
                  <Info className="h-4 w-4 inline mr-1" />
                  This module contains {module.permissions_count} permission(s).
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Live Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Live Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-md ${getColorClasses(watchedFields.color).bgLight} ${getColorClasses(watchedFields.color).text}`}
                      >
                        <IconComponent name={watchedFields.icon} size={20} />
                      </div>
                      <div>
                        <div className="font-medium">{watchedFields.display_name || 'Module Name'}</div>
                        <div className="text-sm text-gray-500">
                          {watchedFields.description || 'Module description'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Permissions Preview */}
              {isEdit && module?.permissions && module.permissions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Permissions Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {module.permissions.slice(0, 5).map((permission) => (
                        <div key={permission.name} className="flex items-center justify-between">
                          <span className="text-sm">{permission.display_name}</span>
                          <Badge variant="outline">{permission.name}</Badge>
                        </div>
                      ))}
                      {module.permissions.length > 5 && (
                        <div className="text-sm text-gray-500">
                          ... and {module.permissions.length - 5} more
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update Module' : 'Create Module'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}