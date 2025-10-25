import { useToast as useBaseToast } from '@/hooks/use-toast'

export function useEnhancedToast() {
  const { toast: baseToast } = useBaseToast()

  const toast = {
    success: (title: string, description?: string) => {
      baseToast({
        title: `✅ ${title}`,
        description,
        variant: "success",
      })
    },
    
    error: (title: string, description?: string) => {
      baseToast({
        title: `❌ ${title}`,
        description,
        variant: "destructive",
      })
    },
    
    warning: (title: string, description?: string) => {
      baseToast({
        title: `⚠️ ${title}`,
        description,
        variant: "warning",
      })
    },
    
    info: (title: string, description?: string) => {
      baseToast({
        title: `ℹ️ ${title}`,
        description,
        variant: "default",
      })
    }
  }

  return { toast }
}
