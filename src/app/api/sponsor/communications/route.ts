import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Logger } from '@/lib/logger'
import { getCorrelationId } from '@/lib/correlation'

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error fetching messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
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
    const transformedMessages = (messagesData || []).map((item: any) => {
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

    const transformedSponsorships = (sponsorshipsData || []).map((item: any) => {
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
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in sponsor communications API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request)
  const logger = new Logger(correlationId)
  
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { recipient_id, subject, message } = body

    if (!recipient_id || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: recipient_id, subject, message' },
        { status: 400 }
      )
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
      logger.logStableError('INTERNAL_SERVER_ERROR', 'Error creating message:', insertError)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
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
  } catch (error) {
    logger.logStableError('INTERNAL_SERVER_ERROR', 'Error in sponsor communications POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

