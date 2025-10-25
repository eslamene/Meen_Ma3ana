import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: caseId } = await params
    const supabase = await createClient()

    // 1. Check if case has any contributions
    const { data: contributions, error: contributionsError } = await supabase
      .from('contributions')
      .select('id')
      .eq('case_id', caseId)
      .limit(1)

    if (contributionsError) {
      console.error('Error checking contributions:', contributionsError)
      return NextResponse.json(
        { error: 'Failed to check case contributions' },
        { status: 500 }
      )
    }

    if (contributions && contributions.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          blocked: true,
          reason: 'contribution_protection',
          message: 'This case has contribution transactions and cannot be deleted. Please contact an administrator if you need to remove this case.'
        },
        { status: 200 }
      )
    }

    // 2. Get all files related to this case for cleanup
    const { data: caseFiles, error: filesError } = await supabase
      .from('case_files')
      .select('file_url, file_path')
      .eq('case_id', caseId)

    if (filesError) {
      console.error('Error fetching case files:', filesError)
      return NextResponse.json(
        { error: 'Failed to fetch case files' },
        { status: 500 }
      )
    }

    // 3. Start cascaded deletion manually
    try {
      // Delete in order to respect foreign key constraints
      
      // 1. Delete case updates
      await supabase.from('case_updates').delete().eq('case_id', caseId)
      
      // 2. Delete case files
      await supabase.from('case_files').delete().eq('case_id', caseId)
      
      // 3. Delete case images backup
      await supabase.from('case_images_backup').delete().eq('case_id', caseId)
      
      // 4. Delete case contributions (should be empty due to check above)
      await supabase.from('contributions').delete().eq('case_id', caseId)
      
      // 5. Delete case notifications
      await supabase.from('notifications').delete().eq('case_id', caseId)
      
      // 6. Delete case comments
      await supabase.from('case_comments').delete().eq('case_id', caseId)
      
      // 7. Delete case favorites
      await supabase.from('case_favorites').delete().eq('case_id', caseId)
      
      // 8. Delete case tags
      await supabase.from('case_tags').delete().eq('case_id', caseId)
      
      // 9. Delete case categories
      await supabase.from('case_categories').delete().eq('case_id', caseId)
      
      // 10. Finally, delete the case itself
      const { error: caseDeleteError } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId)

      if (caseDeleteError) {
        console.error('Error deleting case:', caseDeleteError)
        return NextResponse.json(
          { error: 'Failed to delete case' },
          { status: 500 }
        )
      }

      // 11. Log the deletion to audit_logs
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('audit_logs').insert({
        action: 'DELETE',
        table_name: 'cases',
        record_id: caseId,
        user_id: user?.id,
        details: {
          deleted_at: new Date().toISOString(),
          cascaded_deletion: true
        }
      })
    } catch (deleteError) {
      console.error('Error in cascaded deletion:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete case and related data' },
        { status: 500 }
      )
    }

    // 4. Delete files from storage
    if (caseFiles && caseFiles.length > 0) {
      const filePaths = caseFiles
        .map(file => file.file_path || file.file_url)
        .filter(path => path && path.startsWith('cases/'))

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('case-files')
          .remove(filePaths)

        if (storageError) {
          console.error('Error deleting files from storage:', storageError)
          // Don't fail the entire operation if storage cleanup fails
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Case and all related data deleted successfully'
    })

  } catch (error) {
    console.error('Unexpected error in case deletion:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
