import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware to handle menu-related functionality
 * This can be used to add menu state to request headers or cookies
 */
export function menuMiddleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // You can add menu-related headers here if needed
  // For example, to track which modules are expanded
  const expandedModules = request.cookies.get('expanded-modules')?.value
  
  if (expandedModules) {
    response.headers.set('x-expanded-modules', expandedModules)
  }
  
  return response
}

/**
 * Set expanded modules in cookies
 */
export function setExpandedModules(modules: string[]) {
  const response = NextResponse.next()
  response.cookies.set('expanded-modules', JSON.stringify(modules), {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: false, // Allow client-side access
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })
  return response
}
