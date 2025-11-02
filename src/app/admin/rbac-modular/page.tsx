import { redirect } from 'next/navigation'

/**
 * Redirect page for admin/rbac-modular without locale
 * Redirects to the new Access Control roles page
 */
export default function AdminRBACRedirectPage() {
  // Redirect to the new Access Control roles page
  redirect('/admin/access-control/roles')
}
