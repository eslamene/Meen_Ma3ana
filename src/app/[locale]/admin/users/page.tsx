import { redirect } from 'next/navigation'

/**
 * Redirect page for old admin/users route
 * Redirects to the unified admin management page
 */
export default async function AdminUsersRedirectPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  // Redirect to unified admin management page
  const { locale } = await params
  redirect(`/${locale}/admin/manage`)
}
