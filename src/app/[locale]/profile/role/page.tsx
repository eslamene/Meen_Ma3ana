'use client'

import { useTranslations } from 'next-intl'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import UserRoleInfo from '@/components/profile/UserRoleInfo'
import RoleDataDebug from '@/components/debug/RoleDataDebug'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  User, 
  Key, 
  Settings,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function UserRolePage() {
  const t = useTranslations('profile')

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Profile
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Role & Permissions</h1>
                <p className="text-gray-600">View your current role and access permissions</p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Debug Component - Remove in production */}
            <RoleDataDebug />
            
            {/* Role Information Card */}
            <UserRoleInfo showDetails={true} />

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                  <CardDescription>
                    Your account details and status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Account Status</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Role Type</span>
                    <span className="text-sm text-gray-900">Database Managed</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Last Updated</span>
                    <span className="text-sm text-gray-900">Just now</span>
                  </div>
                </CardContent>
              </Card>

              {/* Permission Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Permission Summary
                  </CardTitle>
                  <CardDescription>
                    Overview of your access capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Total Permissions</span>
                    <span className="text-sm text-gray-900">Loading...</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Access Level</span>
                    <Badge variant="outline">Standard</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">System Access</span>
                    <span className="text-sm text-gray-900">Limited</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Help Section */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Settings className="h-5 w-5" />
                  Need Help?
                </CardTitle>
                <CardDescription className="text-blue-700">
                  Understanding your role and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">What is a role?</p>
                      <p className="text-sm text-blue-700">
                        A role defines your level of access to the system. It determines what you can see and do.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">What are permissions?</p>
                      <p className="text-sm text-blue-700">
                        Permissions are specific actions you can perform, like creating cases or managing users.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Need more access?</p>
                      <p className="text-sm text-blue-700">
                        Contact your administrator if you need additional permissions for your work.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-200">
                    Contact Administrator
                  </Button>
                  <Button size="sm" variant="outline" className="text-blue-600 border-blue-200">
                    Request Access
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
