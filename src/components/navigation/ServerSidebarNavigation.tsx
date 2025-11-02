import { getMenuModules } from '@/lib/server/menu'
import { createClient } from '@/lib/supabase/server'
import ClientSidebarNavigation from './ClientSidebarNavigation'

interface ServerSidebarNavigationProps {
  isOpen: boolean
  onToggle: () => void
  locale: string
}

export default async function ServerSidebarNavigation({ 
  isOpen, 
  onToggle, 
  locale 
}: ServerSidebarNavigationProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch menu modules from the database
  const modules = await getMenuModules(user)

  return (
    <ClientSidebarNavigation
      isOpen={isOpen}
      onToggle={onToggle}
      locale={locale}
      modules={modules}
      user={user}
    />
  )
}
