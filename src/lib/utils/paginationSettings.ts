/**
 * Pagination Settings Utility
 * 
 * Fetches pagination settings from system_config table
 * Provides default values if settings are not found
 */

import { createClient } from '@/lib/supabase/client'

export interface PaginationSettings {
  scrollItemsPerPage: number
  desktopDefaultItemsPerPage: number
  desktopItemsPerPageOptions: number[]
}

export const DEFAULT_SETTINGS: PaginationSettings = {
  scrollItemsPerPage: 3,
  desktopDefaultItemsPerPage: 10,
  desktopItemsPerPageOptions: [10, 25, 50, 100],
}

// Export a dedicated constant for scroll items per page for convenience
export const DEFAULT_SCROLL_ITEMS_PER_PAGE = DEFAULT_SETTINGS.scrollItemsPerPage

/**
 * Fetches pagination settings from system_config
 * Returns default values if settings are not found
 */
export async function getPaginationSettings(): Promise<PaginationSettings> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', [
        'pagination.scroll.items_per_page',
        'pagination.desktop.default_items_per_page',
        'pagination.desktop.items_per_page_options'
      ])

    if (error) {
      console.error('Error fetching pagination settings:', error)
      console.warn('Using default pagination settings due to error')
      return DEFAULT_SETTINGS
    }

    // Log if no data returned
    if (!data || data.length === 0) {
      console.warn('No pagination settings found in system_config, using defaults')
      return DEFAULT_SETTINGS
    }

    // Extract values from data array
    const scrollItemsPerPageData = data.find(item => item.config_key === 'pagination.scroll.items_per_page')
    const desktopDefaultData = data.find(item => item.config_key === 'pagination.desktop.default_items_per_page')
    const desktopOptionsData = data.find(item => item.config_key === 'pagination.desktop.items_per_page_options')

    // Parse scroll items per page
    const scrollItemsPerPage = parseInt(
      scrollItemsPerPageData?.config_value || String(DEFAULT_SETTINGS.scrollItemsPerPage),
      10
    )

    // Parse desktop default items per page
    const desktopDefaultItemsPerPage = parseInt(
      desktopDefaultData?.config_value || String(DEFAULT_SETTINGS.desktopDefaultItemsPerPage),
      10
    )

    // Parse desktop items per page options (comma-separated string)
    let desktopItemsPerPageOptions = DEFAULT_SETTINGS.desktopItemsPerPageOptions
    if (desktopOptionsData?.config_value) {
      try {
        desktopItemsPerPageOptions = desktopOptionsData.config_value
          .split(',')
          .map((opt: string) => parseInt(opt.trim(), 10))
          .filter((opt: number) => !isNaN(opt) && opt > 0)
        
        // Fallback to defaults if parsing resulted in empty array
        if (desktopItemsPerPageOptions.length === 0) {
          desktopItemsPerPageOptions = DEFAULT_SETTINGS.desktopItemsPerPageOptions
        }
      } catch (parseError) {
        console.warn('Error parsing desktop items per page options, using defaults:', parseError)
        desktopItemsPerPageOptions = DEFAULT_SETTINGS.desktopItemsPerPageOptions
      }
    }

    const settings = {
      scrollItemsPerPage,
      desktopDefaultItemsPerPage,
      desktopItemsPerPageOptions,
    }

    return settings
  } catch (error) {
    console.error('Exception fetching pagination settings:', error)
    console.warn('Using default pagination settings due to exception')
    return DEFAULT_SETTINGS
  }
}

/**
 * Hook to use pagination settings in React components
 * Caches settings to avoid repeated fetches
 */
let cachedPaginationSettings: PaginationSettings | null = null
let paginationSettingsPromise: Promise<PaginationSettings> | null = null

export function usePaginationSettings(): PaginationSettings {
  // For client components, we'll fetch on first call
  // In a real implementation, you might want to use React Query or similar
  if (!cachedPaginationSettings && !paginationSettingsPromise) {
    paginationSettingsPromise = getPaginationSettings().then(settings => {
      cachedPaginationSettings = settings
      paginationSettingsPromise = null
      return settings
    })
  }

  // Return cached settings or default if not loaded yet
  return cachedPaginationSettings || DEFAULT_SETTINGS
}

/**
 * Clear cached pagination settings (useful for testing or when settings are updated)
 */
export function clearPaginationSettingsCache() {
  cachedPaginationSettings = null
  paginationSettingsPromise = null
}

