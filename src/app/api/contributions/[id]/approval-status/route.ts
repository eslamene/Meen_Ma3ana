import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get the contribution approval status
    const { data: approvalStatus, error } = await supabase
      .from('contribution_approval_status')
      .select(`
        *,
        contributions:contribution_id(*),
        admin:admin_id(id, first_name, last_name, email)
      `)
      .eq('contribution_id', params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(approvalStatus)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const body = await request.json()
    const { status, rejection_reason, admin_comment, donor_reply, payment_proof_url } = body

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if approval status exists
    const { data: existingStatus } = await supabase
      .from('contribution_approval_status')
      .select('*')
      .eq('contribution_id', params.id)
      .single()

    let result

    if (existingStatus) {
      // Update existing status
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'rejected') {
        updateData.admin_id = user.id
        updateData.rejection_reason = rejection_reason
        updateData.admin_comment = admin_comment
        updateData.resubmission_count = existingStatus.resubmission_count + 1
      } else if (status === 'approved') {
        updateData.admin_id = user.id
        updateData.admin_comment = admin_comment
      } else if (status === 'acknowledged') {
        updateData.donor_reply = donor_reply
        updateData.donor_reply_date = new Date().toISOString()
      }

      if (donor_reply) {
        updateData.donor_reply = donor_reply
        updateData.donor_reply_date = new Date().toISOString()
      }

      if (payment_proof_url) {
        updateData.payment_proof_url = payment_proof_url
      }

      const { data, error } = await supabase
        .from('contribution_approval_status')
        .update(updateData)
        .eq('contribution_id', params.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    } else {
      // Create new status
      const newStatus = {
        contribution_id: params.id,
        status,
        admin_id: status === 'rejected' || status === 'approved' ? user.id : null,
        rejection_reason: status === 'rejected' ? rejection_reason : null,
        admin_comment: status === 'rejected' || status === 'approved' ? admin_comment : null,
        donor_reply: donor_reply || null,
        donor_reply_date: donor_reply ? new Date().toISOString() : null,
        payment_proof_url: payment_proof_url || null,
        resubmission_count: 0
      }

      const { data, error } = await supabase
        .from('contribution_approval_status')
        .insert(newStatus)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      result = data
    }

    // Update the main contribution status
    await supabase
      .from('contributions')
      .update({ status })
      .eq('id', params.id)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 