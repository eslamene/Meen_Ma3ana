import { getMenuModules } from '@/lib/server/menu'
import { createClient } from '@/lib/supabase/server'
import ClientLayout from '@/components/layout/ClientLayout'

interface ServerLayoutProps {
  children: React.ReactNode
  locale: string
}

export default async function ServerLayout({ 
  children, 
  locale 
}: ServerLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch menu modules from the database
  const modules = await getMenuModules(user)

  return (
    <ClientLayout
      locale={locale}
      modules={modules}
      user={user}
    >
      {children}
    </ClientLayout>
  )
}
