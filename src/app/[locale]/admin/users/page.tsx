import { redirect } from 'next/navigation'

/**
 * Redirect page for old admin/users route
 * Redirects to the Access Control users page where user management is now handled
 */
export default async function AdminUsersRedirectPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  // Redirect to Access Control users page where user management is handled
  const { locale } = await params
  redirect(`/${locale}/admin/access-control/users`)
}
