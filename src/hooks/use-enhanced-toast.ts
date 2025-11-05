import { useToast as useBaseToast } from '@/hooks/use-toast'

export function useEnhancedToast() {
  const { toast: baseToast } = useBaseToast()

  const toast = {
    success: (title: string, description?: string) => {
      baseToast({
        title: `✅ ${title}`,
        description,
        type: 'success',
      })
    },
    
    error: (title: string, description?: string) => {
      baseToast({
        title: `❌ ${title}`,
        description,
        type: 'error',
      })
    },
    
    warning: (title: string, description?: string) => {
      baseToast({
        title: `⚠️ ${title}`,
        description,
        type: 'warning',
      })
    },
    
    info: (title: string, description?: string) => {
      baseToast({
        title: `ℹ️ ${title}`,
        description,
        type: 'default',
      })
    }
  }

  return { toast }
}
