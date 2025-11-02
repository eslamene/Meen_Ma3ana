import { redirect } from 'next/navigation'

/**
 * Redirect page for old admin/users route
 * Redirects to the Access Control users page where user management is now handled
 */
export default function AdminUsersRedirectPage({
  params
}: {
  params: { locale: string }
}) {
  // Redirect to Access Control users page where user management is handled
  redirect(`/${params.locale}/admin/access-control/users`)
}
