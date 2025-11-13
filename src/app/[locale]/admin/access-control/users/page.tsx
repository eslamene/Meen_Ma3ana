import { redirect } from 'next/navigation'

/**
 * Redirect page for old admin/access-control/users route
 * Redirects to the system management users page
 */
export default async function AccessControlUsersRedirectPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  // Redirect to system management users page
  const { locale } = await params
  redirect(`/${locale}/rbac/users`)
}

