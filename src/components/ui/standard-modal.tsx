'use client'

import React, { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

export interface StandardModalSection {
  title: string
  children: ReactNode
}

export interface StandardModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean

  /**
   * Callback when modal open state changes
   */
  onOpenChange: (open: boolean) => void

  /**
   * Modal title
   */
  title: string

  /**
   * Modal description/subtitle
   */
  description?: string

  /**
   * Optional preview section to show at the top
   */
  preview?: ReactNode

  /**
   * Form sections to display
   */
  sections?: StandardModalSection[]

  /**
   * Form content (alternative to sections)
   */
  children?: ReactNode

  /**
   * Primary action button configuration
   */
  primaryAction: {
    label: string
    onClick: () => void
    loading?: boolean
    disabled?: boolean
    variant?: 'default' | 'destructive'
  }

  /**
   * Secondary action button configuration
   */
  secondaryAction?: {
    label: string
    onClick: () => void
    disabled?: boolean
  }

  /**
   * Custom footer content (overrides default footer)
   */
  footer?: ReactNode

  /**
   * Maximum width of the modal
   * @default '3xl'
   */
  maxWidth?: '2xl' | '3xl' | '4xl' | '5xl'

  /**
   * Whether to show loading state
   * @default false
   */
  loading?: boolean
}

/**
 * StandardModal - A reusable modal component with consistent styling and layout
 * 
 * Features:
 * - Organized sections with headers
 * - Optional preview section
 * - Consistent footer with primary/secondary actions
 * - Responsive design
 * - Loading states
 * 
 * @example
 * ```tsx
 * <StandardModal
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Edit Category"
 *   description="Update category information"
 *   preview={<CategoryPreview {...data} />}
 *   sections={[
 *     {
 *       title: "Basic Information",
 *       children: <FormFields />
 *     }
 *   ]}
 *   primaryAction={{
 *     label: "Save Changes",
 *     onClick: handleSave,
 *     loading: saving
 *   }}
 *   secondaryAction={{
 *     label: "Cancel",
 *     onClick: () => setIsOpen(false)
 *   }}
 * />
 * ```
 */
export default function StandardModal({
  open,
  onOpenChange,
  title,
  description,
  preview,
  sections,
  children,
  primaryAction,
  secondaryAction,
  footer,
  maxWidth = '3xl',
  loading = false,
}: StandardModalProps) {
  const maxWidthClass = {
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[maxWidth]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${maxWidthClass} max-h-[90vh] overflow-y-auto p-0`}>
        <div className="p-4 sm:p-6">
          <DialogHeader className="mb-4 sm:mb-6">
            <DialogTitle className="text-xl sm:text-2xl font-bold">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-sm sm:text-base">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-5 sm:space-y-6">
            {/* Preview Section */}
            {preview && (
              <div className="p-4 bg-gradient-to-br from-gray-50 to-indigo-50/30 rounded-lg border border-gray-200">
                {preview}
              </div>
            )}

            {/* Sections */}
            {sections && sections.length > 0 ? (
              sections.map((section, index) => (
                <div key={index} className="space-y-4">
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                  </div>
                  {section.children}
                </div>
              ))
            ) : (
              children
            )}
          </div>
        </div>

        {/* Footer */}
        {footer ? (
          footer
        ) : (
          <DialogFooter className="px-4 sm:px-6 py-4 border-t bg-gray-50/50">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto">
              {secondaryAction && (
                <Button
                  variant="outline"
                  onClick={secondaryAction.onClick}
                  className="w-full sm:w-auto"
                  disabled={loading || secondaryAction.disabled}
                >
                  {secondaryAction.label}
                </Button>
              )}
              <Button
                onClick={primaryAction.onClick}
                disabled={loading || primaryAction.disabled || primaryAction.loading}
                variant={primaryAction.variant || 'default'}
                className={`w-full sm:w-auto ${
                  primaryAction.variant === 'destructive'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'
                }`}
              >
                {primaryAction.loading || loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    {primaryAction.label.replace(/^(Save|Create|Update|Delete)/, '$1ing...')}
                  </>
                ) : (
                  primaryAction.label
                )}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * StandardModalSection - Helper component for creating consistent section headers
 */
export function StandardModalSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="border-b border-gray-200 pb-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

/**
 * StandardModalPreview - Helper component for creating preview sections
 */
export function StandardModalPreview({
  children,
  label = 'Preview',
}: {
  children: ReactNode
  label?: string
}) {
  return (
    <>
      <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3 block">
        {label}
      </Label>
      {children}
    </>
  )
}

/**
 * StandardFormField - Helper component for consistent form field styling
 */
export function StandardFormField({
  label,
  required,
  children,
  description,
  error,
  className,
}: {
  label: string
  required?: boolean
  children: ReactNode
  description?: string
  error?: string
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

/**
 * StandardStatusToggle - Helper component for status toggle sections
 */
export function StandardStatusToggle({
  label,
  description,
  checked,
  onCheckedChange,
  id,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  disabled = false,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id: string
  activeLabel?: string
  inactiveLabel?: string
  disabled?: boolean
}) {
  return (
    <div className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 ${disabled ? 'opacity-60' : ''}`}>
      <div className="space-y-0.5">
        <Label htmlFor={id} className={`text-sm font-medium ${disabled ? '' : 'cursor-pointer'}`}>
          {label}
        </Label>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        id={id}
        disabled={disabled}
      />
    </div>
  )
}

