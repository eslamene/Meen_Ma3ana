import { useToast as useBaseToast } from '@/hooks/use-toast'
import { useMemo } from 'react'

type ToastVariant = 'default' | 'destructive' | 'success' | 'warning'

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
}

export function useEnhancedToast() {
  const { toast: baseToast } = useBaseToast()

  const toast = useMemo(() => {
    const toastFn = (options: ToastOptions) => {
      const { title, description, variant = 'default' } = options
      
      // Map variant to type
      const typeMap: Record<ToastVariant, 'default' | 'success' | 'error' | 'warning'> = {
        default: 'default',
        destructive: 'error',
        success: 'success',
        warning: 'warning',
      }
      
      baseToast({
        title,
        description,
        type: typeMap[variant],
      })
    }
    
    // Also provide convenience methods
    toastFn.success = (title: string, description?: string) => {
      toastFn({ title, description, variant: 'success' })
    }
    
    toastFn.error = (title: string, description?: string) => {
      toastFn({ title, description, variant: 'destructive' })
    }
    
    toastFn.warning = (title: string, description?: string) => {
      toastFn({ title, description, variant: 'warning' })
    }
    
    toastFn.info = (title: string, description?: string) => {
      toastFn({ title, description, variant: 'default' })
    }
    
    return toastFn
  }, [baseToast])

  return { toast }
}
