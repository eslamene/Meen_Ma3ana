import { redirect } from 'next/navigation'

/**
 * Redirect page for admin/roles without locale
 * Redirects to the new Access Control roles page
 */
export default function AdminRolesRedirectPage() {
  // Redirect to the new Access Control roles page
  redirect('/admin/access-control/roles')
}
