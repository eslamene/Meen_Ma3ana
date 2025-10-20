'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { UserRole } from '@/lib/rbac/permissions'
import PermissionGuard from '@/components/auth/PermissionGuard'

// Role display functions
const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Administrator'
    case 'moderator':
      return 'Moderator'
    case 'sponsor':
      return 'Sponsor'
    case 'volunteer':
      return 'Volunteer'
    case 'donor':
      return 'Donor'
    default:
      return 'User'
  }
}

const getRoleDescription = (role: string) => {
  switch (role) {
    case 'admin':
      return 'Full system access with all administrative privileges'
    case 'moderator':
      return 'Can manage cases and contributions with approval rights'
    case 'sponsor':
      return 'Can create sponsorship requests and support cases'
    case 'volunteer':
      return 'Can help with case management and project updates'
    case 'donor':
      return 'Can make contributions and view cases'
    default:
      return 'Basic user access'
  }
}

export default function RBACTest() {
  const { user } = useAuth()
  const { userRole, hasPermission } = usePermissions()
  const [selectedRole, setSelectedRole] = useState<UserRole>(userRole)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Test different permissions
  const canReadCases = hasPermission('cases:read')
  const canCreateCases = hasPermission('cases:create')
  const canReadContributions = hasPermission('contributions:read')
  const canCreateContributions = hasPermission('contributions:create')

  // Update selected role when user role changes
  useEffect(() => {
    setSelectedRole(userRole)
  }, [userRole])

  const handleRoleChange = async (newRole: UserRole) => {
    if (!user) return
    
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/test-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`Role updated to ${getRoleDisplayName(newRole)}`)
        setSelectedRole(newRole)
        // Refresh the page to update the auth context
        window.location.reload()
      } else {
        setMessage(`Error: ${data.message}`)
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">RBAC System Test</h2>
      
      {!user ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Please log in to test RBAC functionality</p>
          <Link
            href="/auth/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Login
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-medium mb-2">User Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Email:</strong> {user.email}
              </div>
              <div>
                <strong>User ID:</strong> {user.id}
              </div>
              <div>
                <strong>Current Role:</strong> {getRoleDisplayName(userRole)}
              </div>
              <div>
                <strong>Role Description:</strong> {getRoleDescription(userRole)}
              </div>
            </div>
          </div>

          {/* Role Switching */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-medium mb-2">Role Switching</h3>
            <p className="text-sm text-gray-600 mb-3">
              Change your role to test different permission levels
            </p>
            <div className="flex gap-2">
              {(['donor', 'sponsor', 'admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  disabled={loading || selectedRole === role}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedRole === role
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } disabled:opacity-50`}
                >
                  {loading ? 'Updating...' : getRoleDisplayName(role)}
                </button>
              ))}
            </div>
            {message && (
              <div className={`mt-2 text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {message}
              </div>
            )}
          </div>

          {/* Permission Tests */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-medium mb-2">Permission Tests</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Case Permissions</h4>
                <div className="space-y-1 text-sm">
                  <div className={`flex justify-between ${canReadCases ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Read Cases:</span>
                    <span>{canReadCases ? '✅ Allowed' : '❌ Denied'}</span>
                  </div>
                  <div className={`flex justify-between ${canCreateCases ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Create Cases:</span>
                    <span>{canCreateCases ? '✅ Allowed' : '❌ Denied'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Contribution Permissions</h4>
                <div className="space-y-1 text-sm">
                  <div className={`flex justify-between ${canReadContributions ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Read Contributions:</span>
                    <span>{canReadContributions ? '✅ Allowed' : '❌ Denied'}</span>
                  </div>
                  <div className={`flex justify-between ${canCreateContributions ? 'text-green-600' : 'text-red-600'}`}>
                    <span>Create Contributions:</span>
                    <span>{canCreateContributions ? '✅ Allowed' : '❌ Denied'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Protected Content Examples */}
          <div>
            <h3 className="text-lg font-medium mb-2">Protected Content Examples</h3>
            <div className="space-y-3">
              <PermissionGuard permission="cases:read">
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <h4 className="font-medium text-green-800">Cases Section</h4>
                  <p className="text-green-700 text-sm">This content is visible because you have permission to read cases.</p>
                </div>
              </PermissionGuard>

              <PermissionGuard permission="cases:create">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-medium text-blue-800">Create Case Button</h4>
                  <p className="text-blue-700 text-sm">This button is visible because you have permission to create cases.</p>
                  <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm">
                    Create New Case
                  </button>
                </div>
              </PermissionGuard>

              <PermissionGuard permission="contributions:create">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                  <h4 className="font-medium text-purple-800">Make Contribution</h4>
                  <p className="text-purple-700 text-sm">This section is visible because you have permission to create contributions.</p>
                  <button className="mt-2 px-3 py-1 bg-purple-600 text-white rounded text-sm">
                    Make Contribution
                  </button>
                </div>
              </PermissionGuard>

              <PermissionGuard permission="admin:dashboard">
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <h4 className="font-medium text-red-800">Admin Panel</h4>
                  <p className="text-red-700 text-sm">This section is only visible to administrators.</p>
                  <Link 
                    href="/admin"
                    className="mt-2 inline-block px-3 py-1 bg-red-600 text-white rounded text-sm"
                  >
                    Go to Admin Panel
                  </Link>
                </div>
              </PermissionGuard>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <h4 className="font-medium text-gray-800">Public Content</h4>
                <p className="text-gray-700 text-sm">This content is always visible to all users.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 