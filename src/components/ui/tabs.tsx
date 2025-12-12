'use client'

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"
import { brandColors } from "@/lib/theme"
import { Badge } from "@/components/ui/badge"
import { LucideIcon } from "lucide-react"

const Tabs = TabsPrimitive.Root

// Generate gradient colors for each tab based on brand colors
const getTabColors = (index: number) => {
  const colors = [
    {
      // First tab uses Meen (olive-green) gradient
      activeFrom: brandColors.meen[500],
      activeTo: brandColors.meen[600],
      inactive: brandColors.meen[500],
      hoverBg: brandColors.meen[100] + '80', // 50% opacity
      shadow: 'rgba(107, 142, 126, 0.3)',
      overlayFrom: 'rgba(107, 142, 126, 0.2)',
      overlayTo: 'rgba(90, 122, 107, 0.2)',
    },
    {
      // Second tab uses Ma3ana (vibrant red) gradient
      activeFrom: brandColors.ma3ana[500],
      activeTo: brandColors.ma3ana[600],
      inactive: brandColors.ma3ana[500],
      hoverBg: brandColors.ma3ana[100] + '80', // 50% opacity
      shadow: 'rgba(231, 76, 60, 0.3)',
      overlayFrom: 'rgba(231, 76, 60, 0.2)',
      overlayTo: 'rgba(192, 57, 43, 0.2)',
    },
  ]
  // Cycle through colors for additional tabs
  return colors[index % colors.length]
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: 'default' | 'branded'
    dir?: 'ltr' | 'rtl'
  }
>(({ className, variant = 'branded', dir, ...props }, ref) => {
  const isRTL = dir === 'rtl' || (typeof document !== 'undefined' && document.documentElement.dir === 'rtl')
  
  if (variant === 'branded') {
    return (
      <div className={cn(
        'mb-4 sm:mb-6 md:mb-8 rounded-lg sm:rounded-xl bg-gradient-brand-subtle p-0.5 sm:p-1 md:p-1.5 border border-meen/20 shadow-sm',
        'w-full',
        className
      )}>
        <TabsPrimitive.List
          ref={ref}
          className={cn(
            "flex h-auto p-0 bg-transparent w-full gap-1 sm:gap-1.5 md:gap-2 flex-wrap sm:flex-nowrap",
            isRTL ? "justify-start" : "justify-end",
            className
          )}
          dir={dir}
          {...props}
        />
      </div>
    )
  }
  
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  variant?: 'default' | 'branded'
  icon?: LucideIcon
  badge?: number | string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  tabIndex?: number
  dir?: 'ltr' | 'rtl'
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant = 'branded', icon: Icon, badge, badgeVariant, tabIndex = 0, dir, ...props }, ref) => {
  const isRTL = dir === 'rtl' || (typeof document !== 'undefined' && document.documentElement.dir === 'rtl')
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const combinedRef = React.useCallback((node: HTMLButtonElement | null) => {
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
    triggerRef.current = node
  }, [ref])

  React.useEffect(() => {
    if (variant === 'branded' && triggerRef.current) {
      const colors = getTabColors(tabIndex)
      const element = triggerRef.current
      
      const updateStyles = () => {
        if (!element) return
        const isActive = element.getAttribute('data-state') === 'active'
        const isRTL = element.closest('[dir="rtl"]') !== null || (typeof document !== 'undefined' && document.documentElement.dir === 'rtl')
        if (isActive) {
          const gradientDirection = isRTL ? 'to left' : 'to right'
          element.style.background = `linear-gradient(${gradientDirection}, ${colors.activeFrom}, ${colors.activeTo})`
          element.style.boxShadow = `0 10px 15px -3px ${colors.shadow}, 0 4px 6px -2px ${colors.shadow}`
          element.style.color = 'white'
        } else {
          element.style.background = 'transparent'
          element.style.boxShadow = 'none'
          element.style.color = colors.inactive
        }
      }

      // Initial update with small delay to ensure element is ready
      const timeoutId = setTimeout(updateStyles, 0)

      // Watch for changes
      const observer = new MutationObserver(updateStyles)
      observer.observe(element, {
        attributes: true,
        attributeFilter: ['data-state']
      })

      return () => {
        clearTimeout(timeoutId)
        observer.disconnect()
      }
    }
  }, [variant, tabIndex])

  if (variant === 'branded') {
    const colors = getTabColors(tabIndex)
    
    return (
      <TabsPrimitive.Trigger
        ref={combinedRef}
        className={cn(
          'group relative flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2.5',
          'px-2 sm:px-3 md:px-6 lg:px-7',
          'py-2 sm:py-2.5 md:py-3 lg:py-3.5',
          'text-[10px] sm:text-xs md:text-sm font-bold',
          'rounded-md sm:rounded-lg border-2',
          'flex-1 sm:flex-initial min-w-0 sm:min-w-[80px] md:min-w-0',
          'touch-manipulation',
          'data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-lg',
          'data-[state=inactive]:border-white/40 data-[state=inactive]:bg-white/10 data-[state=inactive]:backdrop-blur-md',
          'data-[state=inactive]:shadow-[0_2px_4px_0_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(255,255,255,0.5)]',
          'transition-all duration-300 bg-transparent',
          'data-[state=inactive]:hover:bg-white/15 data-[state=inactive]:hover:border-white/50',
          'active:scale-95',
          isRTL ? 'flex-row-reverse' : '',
          className
        )}
        style={{
          color: colors.inactive,
        }}
        dir={dir}
        onMouseEnter={(e) => {
          if (e.currentTarget.getAttribute('data-state') !== 'active') {
            e.currentTarget.style.backgroundColor = colors.hoverBg
          }
        }}
        onMouseLeave={(e) => {
          if (e.currentTarget.getAttribute('data-state') !== 'active') {
            e.currentTarget.style.backgroundColor = 'transparent'
          }
        }}
        {...props}
      >
        {Icon && (
          <Icon className={`h-4 w-4 sm:h-4 md:h-4.5 sm:w-4 md:w-4.5 flex-shrink-0 transition-all duration-300 group-data-[state=active]:scale-110 sm:group-data-[state=active]:scale-125 group-data-[state=active]:rotate-3 ${isRTL ? 'order-2' : ''}`} />
        )}
        <span className={`relative z-10 hidden md:inline truncate text-sm ${isRTL ? 'order-1' : ''}`}>{props.children}</span>
        {badge !== undefined && badge !== null && (
          <Badge
            variant={badgeVariant || 'secondary'}
            className={cn(
              isRTL ? 'mr-0.5 sm:mr-1 md:mr-1.5' : 'ml-0.5 sm:ml-1 md:ml-1.5',
              'h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6',
              'min-w-[16px] sm:min-w-[20px] md:min-w-[24px]',
              'px-1 sm:px-1.5 md:px-2',
              'text-[9px] sm:text-[10px] md:text-xs',
              'font-bold text-white border-0 shadow-md transition-all duration-300',
              'flex items-center justify-center flex-shrink-0',
              isRTL ? 'order-3' : '',
              tabIndex === 0
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 group-data-[state=active]:from-yellow-400 group-data-[state=active]:to-amber-500 group-data-[state=active]:shadow-lg group-data-[state=active]:shadow-amber-500/40'
                : 'bg-gradient-to-r from-orange-400 to-red-500 group-data-[state=active]:from-amber-400 group-data-[state=active]:to-orange-500 group-data-[state=active]:shadow-lg group-data-[state=active]:shadow-orange-500/40'
            )}
          >
            {badge}
          </Badge>
        )}
        <div
          className="absolute inset-0 rounded-lg opacity-0 group-data-[state=active]:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: isRTL 
              ? `linear-gradient(to left, ${colors.overlayFrom}, ${colors.overlayTo})`
              : `linear-gradient(to right, ${colors.overlayFrom}, ${colors.overlayTo})`,
          }}
        />
      </TabsPrimitive.Trigger>
    )
  }
  
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 sm:mt-6 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
