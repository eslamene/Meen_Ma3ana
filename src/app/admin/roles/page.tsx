import { redirect } from 'next/navigation'

/**
 * Redirect page for admin/roles without locale
 * Redirects to the RBAC roles page
 */
export default function AdminRolesRedirectPage() {
  // Redirect to the RBAC roles page
  redirect('/en/rbac/roles')
}
