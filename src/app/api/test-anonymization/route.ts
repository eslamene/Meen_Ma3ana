import { NextRequest, NextResponse } from 'next/server'
import { AnonymizationService } from '@/lib/security/anonymization'
import { SecurityService } from '@/lib/security/rls'

export async function GET(request: NextRequest) {
  try {
    const user = await SecurityService.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await SecurityService.getCurrentUserRole(user.id)
    
    // Only admins can test anonymization
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level') || 'partial'
    const type = searchParams.get('type') || 'all'

    let result: any = {}

    switch (type) {
      case 'users':
        result.users = await AnonymizationService.getAnonymizedUsers(level)
        break
      case 'cases':
        result.cases = await AnonymizationService.getAnonymizedCases(level)
        break
      case 'contributions':
        result.contributions = await AnonymizationService.getAnonymizedContributions(level)
        break
      case 'stats':
        result.stats = await AnonymizationService.getAnonymizationStats()
        break
      case 'export':
        result.export = await AnonymizationService.exportAnonymizedData(level)
        break
      default:
        // Test all anonymization functions
        result = {
          testEmail: AnonymizationService.anonymizeEmail('test@example.com', level),
          testPhone: AnonymizationService.anonymizePhone('+1234567890', level),
          testName: AnonymizationService.anonymizeName('John Doe', level),
          testAddress: AnonymizationService.anonymizeAddress('123 Main St, City, State', level),
          testAmount: AnonymizationService.anonymizeAmount(1500, level),
          users: await AnonymizationService.getAnonymizedUsers(level),
          cases: await AnonymizationService.getAnonymizedCases(level),
          contributions: await AnonymizationService.getAnonymizedContributions(level),
          stats: await AnonymizationService.getAnonymizationStats()
        }
    }

    // Audit the anonymization test
    await SecurityService.auditAction(
      user.id,
      'test_anonymization',
      'api',
      'test-anonymization',
      { 
        level, 
        type, 
        userRole,
        timestamp: new Date().toISOString() 
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Anonymization test completed',
      level,
      type,
      result
    })

  } catch (error) {
    console.error('Anonymization test error:', error)
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
    
    // Only admins can create anonymized views
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    let result: any = {}

    switch (action) {
      case 'create_views':
        result.success = await AnonymizationService.createAnonymizedViews()
        result.message = result.success ? 'Anonymized views created successfully' : 'Failed to create views'
        break
      case 'export_data':
        const level = body.level || 'partial'
        result.data = await AnonymizationService.exportAnonymizedData(level)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Audit the action
    await SecurityService.auditAction(
      user.id,
      `anonymization_${action}`,
      'api',
      'test-anonymization',
      { 
        action,
        userRole,
        timestamp: new Date().toISOString() 
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Anonymization action completed',
      result
    })

  } catch (error) {
    console.error('Anonymization action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 