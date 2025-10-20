import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BackgroundJobService } from '@/lib/background-jobs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { jobType } = body

    let result

    switch (jobType) {
      case 'automatic-closure':
        result = await BackgroundJobService.processAutomaticCaseClosure()
        break
      case 'update-amounts':
        result = await BackgroundJobService.updateCaseAmounts()
        break
      case 'cleanup-drafts':
        result = await BackgroundJobService.cleanupExpiredDrafts()
        break
      case 'deadline-reminders':
        result = await BackgroundJobService.sendDeadlineReminders()
        break
      default:
        return NextResponse.json({ error: 'Invalid job type' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error running background job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Return available job types
    return NextResponse.json({
      availableJobs: [
        {
          type: 'automatic-closure',
          name: 'Automatic Case Closure',
          description: 'Check and close fully funded one-time cases',
          frequency: 'Daily'
        },
        {
          type: 'update-amounts',
          name: 'Update Case Amounts',
          description: 'Update case current amounts based on contributions',
          frequency: 'On contribution'
        },
        {
          type: 'cleanup-drafts',
          name: 'Cleanup Expired Drafts',
          description: 'Delete drafts older than 30 days',
          frequency: 'Weekly'
        },
        {
          type: 'deadline-reminders',
          name: 'Deadline Reminders',
          description: 'Send reminders for cases nearing deadline',
          frequency: 'Daily'
        }
      ]
    })
  } catch (error) {
    console.error('Error getting background job info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 