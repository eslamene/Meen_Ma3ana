/**
 * Validation Settings Utility
 * 
 * Fetches validation length settings from system_config table
 * Provides default values if settings are not found
 */

import { createClient } from '@/lib/supabase/client'

export interface ValidationSettings {
  caseTitleMinLength: number
  caseTitleMaxLength: number
  caseDescriptionMinLength: number
  caseDescriptionMaxLength: number
  caseTargetAmountMax: number
  caseDurationMax: number
}

const DEFAULT_SETTINGS: ValidationSettings = {
  caseTitleMinLength: 10,
  caseTitleMaxLength: 100,
  caseDescriptionMinLength: 50,
  caseDescriptionMaxLength: 2000,
  caseTargetAmountMax: 1000000,
  caseDurationMax: 365,
}

/**
 * Fetches validation settings from system_config
 * Returns default values if settings are not found
 */
export async function getValidationSettings(): Promise<ValidationSettings> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', [
        'validation.case.title.min_length',
        'validation.case.title.max_length',
        'validation.case.description.min_length',
        'validation.case.description.max_length',
        'validation.case.target_amount.max',
        'validation.case.duration.max',
      ])

    if (error) {
      console.error('Error fetching validation settings:', error)
      console.warn('Using default validation settings due to error')
      return DEFAULT_SETTINGS
    }

    // Log if no data returned
    if (!data || data.length === 0) {
      console.warn('No validation settings found in system_config, using defaults')
      return DEFAULT_SETTINGS
    }

    // Convert array to object for easier access
    const settingsMap = new Map(
      data.map(item => [item.config_key, item.config_value])
    )

    // Log raw data for debugging
    console.log('Raw validation settings data from database:', data)
    console.log('Settings map:', Array.from(settingsMap.entries()))

    const settings = {
      caseTitleMinLength: parseInt(settingsMap.get('validation.case.title.min_length') || String(DEFAULT_SETTINGS.caseTitleMinLength), 10),
      caseTitleMaxLength: parseInt(settingsMap.get('validation.case.title.max_length') || String(DEFAULT_SETTINGS.caseTitleMaxLength), 10),
      caseDescriptionMinLength: parseInt(settingsMap.get('validation.case.description.min_length') || String(DEFAULT_SETTINGS.caseDescriptionMinLength), 10),
      caseDescriptionMaxLength: parseInt(settingsMap.get('validation.case.description.max_length') || String(DEFAULT_SETTINGS.caseDescriptionMaxLength), 10),
      caseTargetAmountMax: parseFloat(settingsMap.get('validation.case.target_amount.max') || String(DEFAULT_SETTINGS.caseTargetAmountMax)),
      caseDurationMax: parseInt(settingsMap.get('validation.case.duration.max') || String(DEFAULT_SETTINGS.caseDurationMax), 10),
    }

    // Log loaded settings for debugging
    console.log('Parsed validation settings:', settings)
    console.log('Using database values:', {
      titleMin: settingsMap.has('validation.case.title.min_length'),
      titleMax: settingsMap.has('validation.case.title.max_length'),
      descMin: settingsMap.has('validation.case.description.min_length'),
      descMax: settingsMap.has('validation.case.description.max_length'),
      targetMax: settingsMap.has('validation.case.target_amount.max'),
      durationMax: settingsMap.has('validation.case.duration.max'),
    })
    
    return settings
  } catch (error) {
    console.error('Exception fetching validation settings:', error)
    console.warn('Using default validation settings due to exception')
    return DEFAULT_SETTINGS
  }
}

/**
 * Hook to use validation settings in React components
 * Caches settings to avoid repeated fetches
 */
let cachedSettings: ValidationSettings | null = null
let settingsPromise: Promise<ValidationSettings> | null = null

export function useValidationSettings(): ValidationSettings {
  // For client components, we'll fetch on first call
  // In a real implementation, you might want to use React Query or similar
  if (!cachedSettings && !settingsPromise) {
    settingsPromise = getValidationSettings().then(settings => {
      cachedSettings = settings
      settingsPromise = null
      return settings
    })
  }

  // Return cached settings or default if not loaded yet
  return cachedSettings || DEFAULT_SETTINGS
}

/**
 * Clear cached settings (useful for testing or when settings are updated)
 */
export function clearValidationSettingsCache() {
  cachedSettings = null
  settingsPromise = null
}

