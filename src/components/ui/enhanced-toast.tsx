'use client'

import React from 'react'
import { CheckCircle2, AlertCircle, XCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedToastProps {
  title: string
  description: string
  variant: 'success' | 'destructive' | 'warning' | 'default'
  className?: string
}

const iconMap = {
  success: CheckCircle2,
  destructive: XCircle,
  warning: AlertTriangle,
  default: AlertCircle,
}

const variantStyles = {
  success: 'border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 text-green-900 shadow-green-200/50',
  destructive: 'border-red-400 bg-gradient-to-r from-red-50 to-rose-50 text-red-900 shadow-red-200/50',
  warning: 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-900 shadow-yellow-200/50',
  default: 'border-gray-400 bg-gradient-to-r from-gray-50 to-slate-50 text-gray-900 shadow-gray-200/50',
}

export function EnhancedToast({ title, description, variant, className }: EnhancedToastProps) {
  const Icon = iconMap[variant]
  
  return (
    <div className={cn(
      "group pointer-events-auto relative flex w-full items-start space-x-4 overflow-hidden rounded-xl border-2 p-6 shadow-2xl transition-all duration-300 backdrop-blur-sm",
      variantStyles[variant],
      className
    )}>
      <div className="flex-shrink-0">
        <Icon className={cn(
          "h-6 w-6",
          variant === 'success' && "text-green-600",
          variant === 'destructive' && "text-red-600",
          variant === 'warning' && "text-yellow-600",
          variant === 'default' && "text-gray-600"
        )} />
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="font-semibold text-lg leading-tight">
          {title}
        </div>
        <div className="text-sm opacity-90 leading-relaxed">
          {description}
        </div>
      </div>
      
      <div className="flex-shrink-0">
        <div className="h-2 w-2 rounded-full bg-current opacity-60 animate-pulse" />
      </div>
    </div>
  )
}
