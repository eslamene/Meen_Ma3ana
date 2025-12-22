import { NextRequest, NextResponse } from 'next/server'
import { createGetHandler, createPostHandler, ApiHandlerContext } from '@/lib/utils/api-wrapper'
import { ApiError } from '@/lib/utils/api-errors'

async function getHandler(
  request: NextRequest,
  context: ApiHandlerContext
) {
  const { supabase, user, logger } = context

    // Fetch user's messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('communications')
      .select(`
        id,
        sender_id,
        recipient_id,
        subject,
        message,
        is_read,
        created_at,
        sender:users!communications_sender_id_fkey(
          first_name,
          last_name,
          email,
          role
        ),
        recipient:users!communications_recipient_id_fkey(
          first_name,
          last_name,
          email,
          role
        )
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (messagesError) {
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching messages', { error: messagesError })
      throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to fetch messages', 500)
    }

    // Fetch user's approved sponsorships for recipient selection
    const { data: sponsorshipsData, error: sponsorshipsError } = await supabase
      .from('sponsorships')
      .select(`
        id,
        case_id,
        amount,
        status,
        case:cases(
          title_en,
          title_ar,
          description_en,
          description_ar
        )
      `)
      .eq('sponsor_id', user.id)
      .eq('status', 'approved')

    if (sponsorshipsError) {
      logger.warn('Error fetching sponsorships for communications:', sponsorshipsError)
    }

    // Transform the data to match the expected interface
    interface MessageItem {
      id: string
      sender_id: string
      recipient_id: string
      subject: string
      message: string
      is_read: boolean
      created_at: string
      sender?: Array<{ first_name?: string; last_name?: string; email?: string; role?: string }> | { first_name?: string; last_name?: string; email?: string; role?: string }
      recipient?: Array<{ first_name?: string; last_name?: string; email?: string; role?: string }> | { first_name?: string; last_name?: string; email?: string; role?: string }
    }
    const transformedMessages = (messagesData || []).map((item: MessageItem) => {
      // Normalize sender - handle both array and single object cases
      const senderData = Array.isArray(item.sender) 
        ? item.sender[0] 
        : item.sender
      
      // Normalize recipient - handle both array and single object cases
      const recipientData = Array.isArray(item.recipient)
        ? item.recipient[0]
        : item.recipient

      return {
        id: item.id,
        sender_id: item.sender_id,
        recipient_id: item.recipient_id,
        subject: item.subject,
        message: item.message,
        is_read: item.is_read,
        created_at: item.created_at,
        sender: {
          first_name: senderData?.first_name || '',
          last_name: senderData?.last_name || '',
          email: senderData?.email || '',
          role: senderData?.role || ''
        },
        recipient: {
          first_name: recipientData?.first_name || '',
          last_name: recipientData?.last_name || '',
          email: recipientData?.email || '',
          role: recipientData?.role || ''
        }
      }
    })

    interface SponsorshipItem {
      id: string
      case_id: string
      amount: number | string
      status: string
      case?: Array<{ title_en?: string; title_ar?: string; description_en?: string; description_ar?: string }> | { title_en?: string; title_ar?: string; description_en?: string; description_ar?: string }
    }
    const transformedSponsorships = (sponsorshipsData || []).map((item: SponsorshipItem) => {
      // Normalize case - handle both array and single object cases
      const caseData = Array.isArray(item.case)
        ? item.case[0]
        : item.case

      return {
        id: item.id,
        case_id: item.case_id,
        amount: parseFloat(String(item.amount)),
        status: item.status,
        case: {
          title: caseData?.title_en || caseData?.title_ar || '',
          description: caseData?.description_en || caseData?.description_ar || ''
        }
      }
    })

    return NextResponse.json({
      messages: transformedMessages,
      sponsorships: transformedSponsorships
    })
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

  // Insert message
  const { data: newMessage, error: insertError } = await supabase
    .from('communications')
    .insert({
      sender_id: user.id,
      recipient_id,
      subject,
      message
    })
    .select()
    .single()

  if (insertError) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating message', { error: insertError })
    throw new ApiError('INTERNAL_SERVER_ERROR', 'Failed to send message', 500)
  }

    // Create notification for recipient
    await supabase
      .from('notifications')
      .insert({
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
}

export const GET = createGetHandler(getHandler, { 
  requireAuth: true, 
  loggerContext: 'api/sponsor/communications' 
})

export const POST = createPostHandler(postHandler, { 
  requireAuth: true, 
  loggerContext: 'api/sponsor/communications' 
})

