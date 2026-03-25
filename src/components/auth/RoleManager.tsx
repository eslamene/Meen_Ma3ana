'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { UserRole, userRoles, getRoleDisplayName, getRoleDescription } from '@/lib/rbac/types'
import PermissionGuard from '@/components/auth/PermissionGuard'

import { defaultLogger as logger } from '@/lib/logger'

interface RoleManagerProps {
  userId: string
  currentRole: UserRole
  onRoleChange?: (newRole: UserRole) => void
}

export default function RoleManager({ userId, currentRole, onRoleChange }: RoleManagerProps) {
  const t = useTranslations('admin')
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const handleRoleChange = async () => {
    if (selectedRole === currentRole) return
    
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        throw new Error(body.error || body.message || `Update failed (${res.status})`)
      }

      setSuccess(t('roleUpdated'))
      onRoleChange?.(selectedRole)
    } catch (error) {
      logger.error('RoleManager update failed', { error })
      const errorMessage = error instanceof Error ? error.message : t('unknownError')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PermissionGuard permission="users:assign_role">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">{t('manageRole')}</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('selectRole')}
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {userRoles.map((role) => (
                <option key={role} value={role}>
                  {getRoleDisplayName(role)}
                </option>
              ))}
            </select>
          </div>

          {selectedRole !== currentRole && (
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-900 mb-2">
                {getRoleDisplayName(selectedRole)}
              </h4>
              <p className="text-blue-700 text-sm">
                {getRoleDescription(selectedRole)}
              </p>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-600 text-sm">
              {success}
            </div>
          )}

          <button
            onClick={handleRoleChange}
            disabled={loading || selectedRole === currentRole}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? t('updating') : t('updateRole')}
          </button>
        </div>
      </div>
    </PermissionGuard>
  )
} 