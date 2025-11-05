import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const isAdmin = searchParams.get('admin') === 'true'
    
    const offset = (page - 1) * limit

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is actually an admin (verify admin role)
    const isActuallyAdmin = isAdmin && user.user_metadata?.role === 'admin'

    // Build the query with approval status join
    let query = supabase
      .from('contributions')
      .select(`
        *,
        cases:case_id(title),
        users:donor_id(id, email, first_name, last_name, phone),
        approval_status:contribution_approval_status!contribution_id(status, rejection_reason, admin_comment, donor_reply, resubmission_count, created_at, updated_at)
      `, { count: 'exact' })

    // Filter by current user if not actually admin
    if (!isActuallyAdmin) {
      query = query.eq('donor_id', user.id)
    }

    const { data: allContributions, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter contributions based on status if needed
    let contributions = allContributions || []
    if (status && status !== 'all') {
      if (status === 'approved') {
        contributions = contributions.filter(contribution => {
          const approvalStatus = contribution.approval_status
          return Array.isArray(approvalStatus) && approvalStatus.length > 0 && approvalStatus[0]?.status === 'approved'
        })
      } else if (status === 'rejected') {
        contributions = contributions.filter(contribution => {
          const approvalStatus = contribution.approval_status
          // Include both rejected and revised contributions (revised means it was originally rejected)
          return Array.isArray(approvalStatus) && approvalStatus.length > 0 && 
                 (approvalStatus[0]?.status === 'rejected' || approvalStatus[0]?.status === 'revised')
        })
      } else if (status === 'pending') {
        contributions = contributions.filter(contribution => {
          const approvalStatus = contribution.approval_status
          return !approvalStatus || 
                 (Array.isArray(approvalStatus) && approvalStatus.length === 0) ||
                 (Array.isArray(approvalStatus) && approvalStatus[0]?.status === 'pending')
        })
      }
    }

    // Apply pagination after filtering
    const startIndex = offset
    const endIndex = offset + limit
    contributions = contributions.slice(startIndex, endIndex)

    // Normalize field names for frontend (camelCase and denormalized fields)
    const normalizedContributions = (contributions || []).map((c: any) => {
      const approvalArray = Array.isArray(c.approval_status) ? c.approval_status : (c.approval_status ? [c.approval_status] : [])
      const donorFirst = c.users?.first_name || ''
      const donorLast = c.users?.last_name || ''
      const donorName = `${donorFirst} ${donorLast}`.trim() || c.users?.email || 'Anonymous'

      // Normalize approval status timestamps
      const normalizedApprovalStatus = approvalArray.map((approval: any) => ({
        ...approval,
        created_at: approval.created_at || null,
        updated_at: approval.updated_at || null,
      }))

      return {
        // Core fields
        id: c.id,
        amount: typeof c.amount === 'string' ? parseFloat(c.amount) : c.amount,
        status: c.status,
        notes: c.notes || null,
        message: c.message || null,
        anonymous: !!c.anonymous,
        payment_method: c.payment_method || c.payment_method_id || null,

        // Camel-cased timestamps
        createdAt: c.created_at || null,
        updatedAt: c.updated_at || null,

        // Denormalized relations for UI convenience
        caseId: c.case_id || null,
        caseTitle: c.cases?.title || '',
        donorName,
        
        // Individual donor details
        donorId: c.users?.id || null,
        donorEmail: c.users?.email || null,
        donorFirstName: c.users?.first_name || null,
        donorLastName: c.users?.last_name || null,
        donorPhone: c.users?.phone || null,
        
        proofUrl: c.proof_url || c.proof_of_payment || null,

        // Keep raw approval status array for detailed UI
        approval_status: normalizedApprovalStatus,
      }
    })

    // Get statistics based on approval status
    let statsQuery = supabase
      .from('contributions')
      .select(`
        id,
        amount,
        approval_status:contribution_approval_status!contribution_id(status)
      `)
    
    // Apply the same user filtering for stats calculation
    if (!isActuallyAdmin) {
      statsQuery = statsQuery.eq('donor_id', user.id)
    }
    
    const { data: statsData } = await statsQuery

    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      totalAmount: 0
    }

    statsData?.forEach(contribution => {
      // Handle the case where approval_status might be an array or null
      const approvalStatusArray = contribution.approval_status
      const approvalStatus = Array.isArray(approvalStatusArray) && approvalStatusArray.length > 0 
        ? approvalStatusArray[0]?.status || 'pending'
        : 'pending'
      
      if (approvalStatus === 'approved') {
        stats.approved++
        stats.totalAmount += contribution.amount || 0
      } else if (approvalStatus === 'rejected' || approvalStatus === 'revised') {
        // Include both rejected and revised (revised means it was originally rejected)
        stats.rejected++
      } else {
        stats.pending++
      }
    })

    stats.total = stats.approved + stats.pending + stats.rejected

    // Calculate the total count for pagination
    let totalCount = count || 0
    if (status && status !== 'all') {
      // Recalculate total count for filtered results
      let countQuery = supabase
        .from('contributions')
        .select(`
          id,
          approval_status:contribution_approval_status!contribution_id(status)
        `)
      
      // Apply the same user filtering for count calculation
      if (!isActuallyAdmin) {
        countQuery = countQuery.eq('donor_id', user.id)
      }
      
      const { data: allForCount } = await countQuery
      
      if (status === 'approved') {
        totalCount = (allForCount || []).filter(contribution => {
          const approvalStatus = contribution.approval_status
          return Array.isArray(approvalStatus) && approvalStatus.length > 0 && approvalStatus[0]?.status === 'approved'
        }).length
      } else if (status === 'rejected') {
        totalCount = (allForCount || []).filter(contribution => {
          const approvalStatus = contribution.approval_status
          // Include both rejected and revised contributions (revised means it was originally rejected)
          return Array.isArray(approvalStatus) && approvalStatus.length > 0 && 
                 (approvalStatus[0]?.status === 'rejected' || approvalStatus[0]?.status === 'revised')
        }).length
      } else if (status === 'pending') {
        totalCount = (allForCount || []).filter(contribution => {
          const approvalStatus = contribution.approval_status
          return !approvalStatus || 
                 (Array.isArray(approvalStatus) && approvalStatus.length === 0) ||
                 (Array.isArray(approvalStatus) && approvalStatus[0]?.status === 'pending')
        }).length
      }
    }

    return NextResponse.json({
      contributions: normalizedContributions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
      },
      stats
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
    
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the request body
    const body = await request.json()
    const { caseId, amount, message, anonymous, paymentMethod, proofOfPayment } = body

    // Validate required fields
    if (!caseId || !amount || !paymentMethod) {
      return NextResponse.json({ 
        error: 'Missing required fields: caseId, amount, and paymentMethod are required' 
      }, { status: 400 })
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be greater than 0' 
      }, { status: 400 })
    }

    // Check if the case exists
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, title, status')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ 
        error: 'Case not found' 
      }, { status: 404 })
    }

    if (caseData.status !== 'published') {
      return NextResponse.json({ 
        error: 'Case is not published and cannot accept contributions' 
      }, { status: 400 })
    }

    // Insert the contribution
    const { data: contribution, error: insertError } = await supabase
      .from('contributions')
      .insert({
        type: 'donation',
        amount: amount,
        payment_method: paymentMethod,
        status: 'pending',
        proof_of_payment: proofOfPayment || null,
        anonymous: anonymous || false,
        donor_id: user.id,
        case_id: caseId,
        notes: message || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting contribution:', insertError)
      return NextResponse.json({ 
        error: 'Failed to create contribution' 
      }, { status: 500 })
    }

    // Update the case's current amount
    const { data: currentCase } = await supabase
      .from('cases')
      .select('current_amount')
      .eq('id', caseId)
      .single()
    
    if (currentCase) {
      const newAmount = parseFloat(currentCase.current_amount || '0') + parseFloat(amount)
      const { error: updateError } = await supabase
        .from('cases')
        .update({ current_amount: newAmount.toString() })
        .eq('id', caseId)
      
      if (updateError) {
        console.error('Error updating case amount:', updateError)
        // Don't fail the request if this fails, just log it
      }
    }

    // Create notification for admins about new contribution
    try {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          type: 'contribution_pending',
          recipient_id: admin.id,
          title: 'New Contribution Submitted',
          message: `A new contribution of ${amount} EGP has been submitted for case: ${caseData.title}`,
          data: {
            contribution_id: contribution.id,
            case_id: caseId,
            amount: amount
          }
        }))

        await supabase
          .from('notifications')
          .insert(notifications)
      }
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError)
      // Don't fail the request if notifications fail
    }

    return NextResponse.json(contribution, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/contributions:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
    