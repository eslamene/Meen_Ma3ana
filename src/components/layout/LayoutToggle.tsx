'use client'

import { useLayoutOptional } from './LayoutProvider'
import { ContainerVariant } from './Container'
import { Button } from '@/components/ui/button'
import { Maximize2, Columns } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const variantConfig: Record<ContainerVariant, { icon: typeof Maximize2; label: string; tooltip: string }> = {
  full: {
    icon: Maximize2,
    label: 'Full',
    tooltip: 'Full width layout',
  },
  boxed: {
    icon: Columns,
    label: 'Boxed',
    tooltip: 'Boxed layout (1600px max)',
  },
}

export default function LayoutToggle() {
  const layoutContext = useLayoutOptional()
  
  // If LayoutProvider is not available, don't render the toggle
  if (!layoutContext) {
    return null
  }
  
  const { containerVariant, setContainerVariant } = layoutContext
  
  const variants: ContainerVariant[] = ['full', 'boxed']
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
        {variants.map((variant) => {
          const config = variantConfig[variant]
          const Icon = config.icon
          const isActive = containerVariant === variant
          
          return (
            <Tooltip key={variant}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setContainerVariant(variant)}
                  className={`h-8 px-3 ${
                    isActive
                      ? 'bg-[#6B8E7E] text-white hover:bg-[#5a7a6b]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  aria-label={config.tooltip}
                >
                  <Icon className="h-4 w-4" />
                  <span className="ml-1.5 text-xs font-medium hidden sm:inline">
                    {config.label}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{config.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

