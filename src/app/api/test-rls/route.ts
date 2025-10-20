import { NextRequest, NextResponse } from 'next/server'
import { SecurityService } from '@/lib/security/rls'
import { db } from '@/lib/db'
import { cases, users, contributions } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const user = await SecurityService.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await SecurityService.getCurrentUserRole(user.id)
    
    // Set security context
    await SecurityService.setSecurityContext(user.id, userRole)
    
    // Audit the test action
    await SecurityService.auditAction(
      user.id,
      'test_rls_access',
      'api',
      'test-rls',
      { userRole, timestamp: new Date().toISOString() }
    )

    const results = {
      user: {
        id: user.id,
        role: userRole,
        email: user.email
      },
      accessibleCases: [],
      accessibleContributions: [],
      accessibleUsers: []
    }

    try {
      // Test cases access
      const casesResult = await db.select({
        id: cases.id,
        title: cases.title,
        status: cases.status,
        createdBy: cases.createdBy
      }).from(cases).limit(5)
      
      results.accessibleCases = casesResult
    } catch (error) {
      console.error('Error accessing cases:', error)
      results.accessibleCases = { error: 'Access denied' }
    }

    try {
      // Test contributions access
      const contributionsResult = await db.select({
        id: contributions.id,
        amount: contributions.amount,
        status: contributions.status,
        donorId: contributions.donorId
      }).from(contributions).limit(5)
      
      results.accessibleContributions = contributionsResult
    } catch (error) {
      console.error('Error accessing contributions:', error)
      results.accessibleContributions = { error: 'Access denied' }
    }

    try {
      // Test users access (should be restricted)
      const usersResult = await db.select({
        id: users.id,
        email: users.email,
        role: users.role
      }).from(users).limit(5)
      
      results.accessibleUsers = usersResult
    } catch (error) {
      console.error('Error accessing users:', error)
      results.accessibleUsers = { error: 'Access denied' }
    }

    // Clear security context
    await SecurityService.clearSecurityContext()

    return NextResponse.json({
      success: true,
      message: 'RLS test completed',
      results
    })

  } catch (error) {
    console.error('RLS test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await SecurityService.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await SecurityService.getCurrentUserRole(user.id)
    const body = await request.json()
    const { action, resourceType, resourceId } = body

    // Set security context
    await SecurityService.setSecurityContext(user.id, userRole)

    // Test resource access
    const canAccess = await SecurityService.canAccessResource(
      user.id,
      resourceType,
      resourceId
    )

    // Audit the access check
    await SecurityService.auditAction(
      user.id,
      'test_resource_access',
      resourceType,
      resourceId,
      { 
        canAccess,
        userRole,
        action,
        timestamp: new Date().toISOString()
      }
    )

    // Clear security context
    await SecurityService.clearSecurityContext()

    return NextResponse.json({
      success: true,
      canAccess,
      userRole,
      resourceType,
      resourceId
    })

  } catch (error) {
    console.error('Resource access test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 