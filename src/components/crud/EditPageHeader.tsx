'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreVertical, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface MenuAction {
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

export interface EditPageHeaderProps {
  /**
   * Back button navigation URL
   */
  backUrl: string
  
  /**
   * Icon to display next to the title
   */
  icon: LucideIcon
  
  /**
   * Main title of the page
   */
  title: string
  
  /**
   * Subtitle/description text
   */
  description?: string
  
  /**
   * Optional item name being edited (e.g., "Editing: John Doe")
   */
  itemName?: string
  
  /**
   * Menu actions to display in the dropdown menu
   */
  menuActions?: MenuAction[]
  
  /**
   * Additional actions to display in the header (legacy support)
   * @deprecated Use menuActions instead
   */
  actions?: ReactNode
  
  /**
   * Custom back button label
   * @default "Back"
   */
  backLabel?: string
  
  /**
   * Whether to show the back button
   * @default true
   */
  showBackButton?: boolean
  
  /**
   * Optional badge/status to display
   */
  badge?: {
    label: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
}

export default function EditPageHeader({
  backUrl,
  icon: Icon,
  title,
  description,
  itemName,
  menuActions,
  actions,
  backLabel = 'Back',
  showBackButton = true,
  badge,
}: EditPageHeaderProps) {
  const router = useRouter()

  return (
    <div className="mb-6 sm:mb-8">
      {/* Enhanced Header with Background */}
      <div className="bg-gradient-to-r from-white via-blue-50/30 to-white rounded-xl border border-gray-200/60 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Top Row: Back Button */}
          <div className="flex items-center justify-between gap-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(backUrl)}
                className="flex items-center gap-2 hover:bg-white hover:shadow-sm transition-all duration-200 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">{backLabel}</span>
              </Button>
            )}
          </div>

          {/* Main Content Row */}
          <div className="flex items-start gap-4">
            {/* Icon with Enhanced Styling */}
            <div className="relative shrink-0">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-400 rounded-full border-2 border-white"></div>
            </div>

            {/* Title and Description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                  {title}
                </h1>
                {badge && (
                  <Badge variant={badge.variant || 'secondary'} className="text-xs font-semibold">
                    {badge.label}
                  </Badge>
                  )}
                </div>
                {(menuActions && menuActions.length > 0) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-600" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {menuActions.map((action, index) => {
                        const ActionIcon = action.icon
                        const isDestructive = action.variant === 'destructive'
                        const prevAction = index > 0 ? menuActions[index - 1] : null
                        const shouldAddSeparator = isDestructive && prevAction && prevAction.variant !== 'destructive'
                        
                        return (
                          <div key={index}>
                            {shouldAddSeparator && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              onClick={action.onClick}
                              disabled={action.disabled}
                              className={`cursor-pointer ${
                                isDestructive
                                  ? 'text-red-600 focus:text-red-700 focus:bg-red-50'
                                  : ''
                              }`}
                            >
                              {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                              <span>{action.label}</span>
                            </DropdownMenuItem>
                          </div>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {!menuActions && actions && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {actions}
                  </div>
                )}
              </div>
              
              {description && (
                <p className="text-sm sm:text-base text-gray-600 mb-2">
                  {description}
                </p>
              )}
              
              {itemName && itemName.trim() && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                    <span className="font-semibold">Editing:</span>
                    <span className="ml-1">{itemName}</span>
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

