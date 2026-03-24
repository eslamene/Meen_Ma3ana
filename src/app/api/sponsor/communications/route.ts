import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { supabase, user, logger } = context

  try {
    const { CommunicationService } = await import('@/lib/services/communicationService')
    const { SponsorshipService } = await import('@/lib/services/sponsorshipService')

    // Fetch user's messages
    const communications = await CommunicationService.getByUserId(supabase, user.id)

    // Transform messages to match expected format
    const transformedMessages = communications.map((item) => ({
      id: item.id,
      sender_id: item.sender_id,
      recipient_id: item.recipient_id,
      subject: item.subject,
      message: item.message,
      is_read: item.is_read,
      created_at: item.created_at,
      sender: {
        first_name: item.sender?.first_name || '',
        last_name: item.sender?.last_name || '',
        email: item.sender?.email || '',
        role: item.sender?.role || ''
      },
      recipient: {
        first_name: item.recipient?.first_name || '',
        last_name: item.recipient?.last_name || '',
        email: item.recipient?.email || '',
        role: item.recipient?.role || ''
      }
    }))

    // Fetch user's approved sponsorships for recipient selection
    let transformedSponsorships: Array<{
      id: string
      case_id: string
      amount: number
      status: string
      case: {
        title: string
        description: string
      }
    }> = []

    try {
      const allSponsorships = await SponsorshipService.getAll(supabase)
      const userSponsorships = allSponsorships.filter(
        s => s.sponsor_id === user.id && s.status === 'approved'
      )

      transformedSponsorships = userSponsorships.map((item) => ({
        id: item.id,
        case_id: item.case_id,
        amount: typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount)),
        status: item.status,
        case: {
          title: item.case?.title_en || item.case?.title_ar || '',
          description: item.case?.description_en || item.case?.description_ar || ''
        }
      }))
    } catch (sponsorshipsError) {
      logger.warn('Error fetching sponsorships for communications:', sponsorshipsError)
    }

    return NextResponse.json({
      messages: transformedMessages,
      sponsorships: transformedSponsorships
    })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching messages', { error })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to fetch messages', 500)
  }
}

async function postHandler(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { supabase, user, logger } = context
  const body = await request.json()
  const { recipient_id, subject, message } = body

  if (!recipient_id || !subject || !message) {
    throw new ApiError('VALIDATION_ERROR', 'Missing required fields: recipient_id, subject, message', 400)
  }

  try {
    const { CommunicationService } = await import('@/lib/services/communicationService')
    const { NotificationService } = await import('@/lib/services/notificationService')

    // Create message
    const newMessage = await CommunicationService.create(supabase, {
      sender_id: user.id,
      recipient_id,
      subject,
      message
    })

    // Create notification for recipient
    await NotificationService.create(supabase, {
      type: 'new_message',
      recipient_id,
      title: 'New Message',
      message: `You have received a new message: ${subject}`,
      data: {
        messageId: newMessage.id,
        subject
      }
    })

    return NextResponse.json({ message: newMessage })
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating message', { error })
    throw new ApiError('INTERNAL_SERVER_ERROR', error instanceof Error ? error.message : 'Failed to send message', 500)
  }
}

export const GET = createGetHandler(getHandler, { 
  requireAuth: true, 
  loggerContext: 'api/sponsor/communications' 
})

export const POST = createPostHandler(postHandler, { 
  requireAuth: true, 
  loggerContext: 'api/sponsor/communications' 
})

