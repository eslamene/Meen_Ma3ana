import { NextRequest, NextResponse } from 'next/server'
import { BackgroundJobService } from '@/lib/background-jobs'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function postHandler(request: NextRequest, context: ApiHandlerContext) {
  const { logger } = context

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
      throw new ApiError('VALIDATION_ERROR', 'Invalid job type', 400)
  }

  return NextResponse.json(result)
}

async function getHandler(request: NextRequest, context: ApiHandlerContext) {
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
}

export const POST = createPostHandler(postHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/background-jobs' })
export const GET = createGetHandler(getHandler, { requireAuth: true, requireAdmin: true, loggerContext: 'api/admin/background-jobs' }) 