import ServerLayout from '@/components/layout/ServerLayout'

export default async function ExampleServerMenuPage({
  params
}: {
  params: { locale: string }
}) {
  return (
    <ServerLayout locale={params.locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Server-Side Menu Example
          </h1>
          <p className="mt-2 text-gray-600">
            This page demonstrates the server-side menu system that fetches data from the rbac_modules table.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <ul className="space-y-2 text-gray-600">
            <li>✅ Fetches menu data from rbac_modules table on the server</li>
            <li>✅ Filters modules based on user permissions</li>
            <li>✅ Server-side rendering for better performance</li>
            <li>✅ Client-side interactivity for UI state</li>
            <li>✅ Responsive design with mobile support</li>
            <li>✅ Caching for improved performance</li>
          </ul>
        </div>

        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            How it works
          </h3>
          <ol className="space-y-2 text-blue-800">
            <li>1. ServerLayout fetches user data and menu modules from the database</li>
            <li>2. Menu modules are filtered based on user permissions</li>
            <li>3. Data is passed to ClientLayout for rendering</li>
            <li>4. ClientSidebarNavigation handles interactive UI state</li>
            <li>5. Menu items are rendered based on user's actual permissions</li>
          </ol>
        </div>

        <div className="bg-green-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Benefits
          </h3>
          <ul className="space-y-1 text-green-800">
            <li>• Better SEO - menu data is server-rendered</li>
            <li>• Improved performance - no client-side API calls</li>
            <li>• Enhanced security - permissions checked on server</li>
            <li>• Better UX - faster initial page load</li>
            <li>• Scalable - can handle complex permission structures</li>
          </ul>
        </div>
      </div>
    </ServerLayout>
  )
}
