'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export default function DatabaseTest() {
  const t = useTranslations('test')
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [userCount, setUserCount] = useState<number | null>(null)

  const testConnection = async () => {
    try {
      setStatus(t('loading'))
      setError('')
      
      // Test database connection via API route
      const response = await fetch('/api/test-db')
      const data = await response.json()
      
      if (data.success) {
        setUserCount(data.userCount)
        setStatus(data.message)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError(`Database connection error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">{t('databaseConnection')}</h3>
      <button 
        onClick={testConnection}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        {t('testConnection')}
      </button>
      {status && (
        <p className="mt-2 text-sm text-gray-600">{status}</p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      {userCount !== null && (
        <p className="mt-2 text-sm text-blue-600">{t('userCount')}: {userCount}</p>
      )}
    </div>
  )
} 