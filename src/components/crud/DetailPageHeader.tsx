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

export interface DetailPageHeaderProps {
  /**
   * Back button navigation URL
   */
  backUrl: string
  
  /**
   * Icon to display next to the title
   */
  icon: LucideIcon
  
  /**
   * Main title of the page (usually the item name)
   */
  title: string
  
  /**
   * Subtitle/description text
   */
  description?: string
  
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
    className?: string
  }
  
  /**
   * Additional metadata to display (e.g., ID, dates)
   */
  metadata?: ReactNode
}

export default function DetailPageHeader({
  backUrl,
  icon: Icon,
  title,
  description,
  menuActions,
  actions,
  backLabel = 'Back',
  showBackButton = true,
  badge,
  metadata,
}: DetailPageHeaderProps) {
  const router = useRouter()

  return (
    <div className="mb-6 sm:mb-8">
      {/* Enhanced Header with Background */}
      <div className="rounded-xl border border-border bg-card bg-gradient-to-br from-meen-50/50 via-card to-ma3ana-50/40 shadow-sm p-4 sm:p-6 dark:from-meen-950/20 dark:via-card dark:to-ma3ana-950/20">
        <div className="flex flex-col gap-4">
          {/* Top Row: Back Button */}
          <div className="flex items-center justify-between gap-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(backUrl)}
                className="-ms-2 flex items-center gap-2 transition-all duration-200 hover:bg-muted hover:shadow-sm"
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
              <div className="rounded-xl bg-gradient-meen p-3 shadow-lg">
                <Icon className="h-6 w-6 text-white sm:h-7 sm:w-7" aria-hidden />
              </div>
              <div className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-card bg-ma3ana" />
            </div>

            {/* Title and Description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
                  {title}
                </h1>
                {badge && (
                  <Badge 
                    variant={badge.variant || 'secondary'} 
                    className={`text-xs font-semibold ${badge.className || ''}`}
                  >
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
                        className="h-8 w-8 p-0 hover:bg-muted"
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
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
                                  ? 'text-destructive focus:bg-destructive/10 focus:text-destructive'
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
                <p className="mb-2 text-sm text-muted-foreground sm:text-base">
                  {description}
                </p>
              )}
              
              {metadata && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {metadata}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

