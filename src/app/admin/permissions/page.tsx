import { redirect } from 'next/navigation'

/**
 * Redirect page for admin/permissions without locale
 * Redirects to the RBAC permissions page
 */
export default function AdminPermissionsRedirectPage() {
  // Redirect to the RBAC permissions page
  redirect('/en/rbac/permissions')
}
