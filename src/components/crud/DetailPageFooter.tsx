'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export interface DetailPageFooterAction {
  /**
   * Label for the action button
   */
  label: string
  
  /**
   * Click handler
   */
  onClick: () => void
  
  /**
   * Button variant
   * @default "outline"
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  
  /**
   * Whether the action is disabled
   * @default false
   */
  disabled?: boolean
  
  /**
   * Icon to display in the button
   */
  icon?: ReactNode
}

export interface DetailPageFooterProps {
  /**
   * Primary action (usually Edit)
   */
  primaryAction?: {
    label: string
    onClick: () => void
    disabled?: boolean
    icon?: ReactNode
  }
  
  /**
   * Secondary actions (e.g., Delete, Export)
   */
  secondaryActions?: DetailPageFooterAction[]
  
  /**
   * Custom footer content (overrides default layout)
   */
  children?: ReactNode
  
  /**
   * Whether to show the footer
   * @default true
   */
  show?: boolean
  
  /**
   * Additional className for the footer container
   */
  className?: string
  
  /**
   * Whether to show a separator above the footer
   * @default true
   */
  showSeparator?: boolean
}

export default function DetailPageFooter({
  primaryAction,
  secondaryActions = [],
  children,
  show = true,
  className = '',
  showSeparator = true,
}: DetailPageFooterProps) {
  if (!show) return null

  // If custom children provided, use them
  if (children) {
    return (
      <div className={`mt-8 ${className}`}>
        {showSeparator && <Separator className="mb-6" />}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          {children}
        </div>
      </div>
    )
  }

  // If no actions provided, don't render
  if (!primaryAction && secondaryActions.length === 0) {
    return null
  }

  // Separate destructive actions from other secondary actions
  const destructiveActions = secondaryActions.filter(action => action.variant === 'destructive')
  const otherSecondaryActions = secondaryActions.filter(action => action.variant !== 'destructive')

  return (
    <div className={`mt-8 ${className}`}>
      {showSeparator && <Separator className="mb-6" />}
      
      {/* Footer Actions Container */}
      <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-xl border border-gray-200/60 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          {/* Secondary Actions */}
          {otherSecondaryActions.length > 0 && (
            <>
              {otherSecondaryActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="min-w-[100px] transition-all duration-200 hover:shadow-md"
                  size="default"
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </>
          )}
          
          {/* Separator if we have both types of actions */}
          {otherSecondaryActions.length > 0 && (destructiveActions.length > 0 || primaryAction) && (
            <div className="hidden sm:block w-px h-6 bg-gray-300 mx-1" />
          )}
          
          {/* Destructive actions */}
          {destructiveActions.map((action, index) => (
            <Button
              key={`destructive-${index}`}
              variant="destructive"
              onClick={action.onClick}
              disabled={action.disabled}
              className="min-w-[100px] transition-all duration-200 hover:shadow-md hover:bg-red-700"
              size="default"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
          
          {/* Primary Action */}
          {primaryAction && (
            <>
              {destructiveActions.length > 0 && (
                <div className="hidden sm:block w-px h-6 bg-gray-300 mx-1" />
              )}
              <Button
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className="min-w-[180px] w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                size="lg"
              >
                {primaryAction.icon}
                {primaryAction.label}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

