'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslations } from 'next-intl'

export default function SupabaseTest() {
  const t = useTranslations('test')
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')

  const testConnection = async () => {
    try {
      setStatus(t('loading'))
      setError('')
      
      // Test basic connection by getting the current user (should work even if not authenticated)
      const { error } = await supabase.auth.getUser()
      
      if (error) {
        // This is expected if not authenticated, but connection should work
        if (error.message.includes('Invalid API key') || error.message.includes('Invalid URL')) {
          setError(t('connectionFailed'))
        } else {
          setStatus(t('connectionSuccessful'))
        }
      } else {
        setStatus(t('connectionSuccessful'))
      }
    } catch (err) {
      setError(`Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">{t('supabaseConnection')}</h3>
      <button 
        onClick={testConnection}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {t('testConnection')}
      </button>
      {status && (
        <p className="mt-2 text-sm text-gray-600">{status}</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
} 