import { redirect } from 'next/navigation'

/**
 * Redirect page for admin/permissions without locale
 * Redirects to the new Access Control permissions page
 */
export default function AdminPermissionsRedirectPage() {
  // Redirect to the new Access Control permissions page
  redirect('/admin/access-control/permissions')
}
