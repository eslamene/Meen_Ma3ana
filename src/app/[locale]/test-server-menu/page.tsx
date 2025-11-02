import { getMenuModules } from '@/lib/server/menu'
import { createClient } from '@/lib/supabase/server'
import ClientLayout from '@/components/layout/ClientLayout'

export default async function TestServerMenuPage({
  params
}: {
  params: { locale: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch menu modules from the database
  const modules = await getMenuModules(user)

  return (
    <ClientLayout locale={params.locale} modules={modules} user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Server-Side Menu Test
          </h1>
          <p className="mt-2 text-gray-600">
            This page demonstrates the server-side menu system using your actual rbac_modules table.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Available Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <div key={module.id} className="border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-3 h-3 rounded-full bg-${module.color}-500`}></div>
                  <h3 className="font-medium text-gray-900">{module.display_name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">Menu Items ({module.items.length}):</p>
                  {module.items.map((item, index) => (
                    <div key={index} className="text-xs text-gray-600 flex items-center space-x-2">
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span>{item.label}</span>
                      {item.permission && (
                        <span className="text-gray-400">({item.permission})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            User Information
          </h3>
          {user ? (
            <div className="space-y-2 text-blue-800">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>ID:</strong> {user.id}</p>
              <p><strong>Authenticated:</strong> Yes</p>
            </div>
          ) : (
            <p className="text-blue-800">Not authenticated (visitor mode)</p>
          )}
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            How to Use
          </h3>
          <ol className="space-y-2 text-green-800">
            <li>1. The sidebar on the left shows modules based on your permissions</li>
            <li>2. Click on module headers to expand/collapse menu items</li>
            <li>3. Menu items are filtered based on your actual permissions</li>
            <li>4. All data is fetched server-side for better performance</li>
            <li>5. The menu respects your role and permission assignments</li>
          </ol>
        </div>
      </div>
    </ClientLayout>
  )
}
