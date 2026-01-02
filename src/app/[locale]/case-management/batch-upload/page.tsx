'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import BatchCaseUploadModal from '@/components/cases/BatchCaseUploadModal'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, Trash2, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, MapPin, Play, RotateCcw } from 'lucide-react'
import { theme } from '@/lib/theme'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BatchUpload {
  id: string
  name: string
  source_file: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  total_items: number
  processed_items: number
  successful_items: number
  failed_items: number
  error_summary: any
  metadata: any
  created_by: string
  created_at: string
  updated_at: string
  completed_at: string | null
}

export default function BatchUploadPage() {
  const router = useRouter()
  const params = useParams()
  const { containerVariant } = useLayout()
  const [batchUploadModalOpen, setBatchUploadModalOpen] = useState(false)
  const [batches, setBatches] = useState<BatchUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchToDelete, setBatchToDelete] = useState<BatchUpload | null>(null)
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null)
  const [rollbackBatchId, setRollbackBatchId] = useState<string | null>(null)
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false)
  const [batchToRollback, setBatchToRollback] = useState<BatchUpload | null>(null)

  // Fetch batches
  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchBatches = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/cases/batch-upload?limit=100')
      const result = await response.json()
      
      if (result.success) {
        setBatches(result.data || [])
      } else {
        toast.error('Failed to fetch batch uploads')
      }
    } catch (error) {
      toast.error('Failed to fetch batch uploads')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (batch: BatchUpload) => {
    setBatchToDelete(batch)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!batchToDelete) return

    try {
      setDeletingBatchId(batchToDelete.id)
      const response = await fetch(`/api/admin/cases/batch-upload/${batchToDelete.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message || 'Batch upload deleted successfully')
        // Refresh batches list
        await fetchBatches()
      } else {
        toast.error(result.message || 'Failed to delete batch upload')
      }
    } catch (error) {
      toast.error('Failed to delete batch upload')
    } finally {
      setDeletingBatchId(null)
      setDeleteDialogOpen(false)
      setBatchToDelete(null)
    }
  }

  const handleProcessBatch = async (batchId: string) => {
    try {
      setProcessingBatchId(batchId)
      const response = await fetch(`/api/admin/cases/batch-upload/${batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process' })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Processed ${result.successful_items} items successfully`)
        // Refresh batches list
        await fetchBatches()
      } else {
        toast.error(result.message || result.error || 'Failed to process batch')
      }
    } catch (error) {
      toast.error('Failed to process batch')
    } finally {
      setProcessingBatchId(null)
    }
  }

  const handleRollbackClick = (batch: BatchUpload) => {
    setBatchToRollback(batch)
    setRollbackDialogOpen(true)
  }

  const handleRollbackConfirm = async () => {
    if (!batchToRollback) return

    try {
      setRollbackBatchId(batchToRollback.id)
      const response = await fetch(`/api/admin/cases/batch-upload/${batchToRollback.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message || 'Batch rollback completed successfully')
        // Refresh batches list
        await fetchBatches()
      } else {
        toast.error(result.message || 'Failed to rollback batch')
      }
    } catch (error) {
      toast.error('Failed to rollback batch')
    } finally {
      setRollbackBatchId(null)
      setRollbackDialogOpen(false)
      setBatchToRollback(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'processing':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <ProtectedRoute>
      <PermissionGuard permission="cases:batch_upload">
        <Container variant={containerVariant}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push(`/${params.locale}/case-management/cases`)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Batch Case Upload</h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
                    Upload cases and contributions in bulk via CSV file
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setBatchUploadModalOpen(true)}
                size="lg"
                className="text-white"
                style={{
                  background: theme.gradients.primary,
                  boxShadow: theme.shadows.primary
                }}
              >
                <Upload className="h-5 w-5 mr-2" />
                New Batch Upload
              </Button>
            </div>

            {/* Instructions Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-3">How to Use Batch Upload</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Prepare your CSV file with columns: CaseNumber, CombinedCaseNumber, CaseTitle, ContributorNickname, Amount, Month</li>
                <li>Click "New Batch Upload" to open the upload dialog</li>
                <li>Upload your CSV file</li>
                <li>Map contributor nicknames to existing users (or create new users)</li>
                <li>Review the batch summary and process the upload</li>
                <li>Monitor the progress and review results</li>
              </ol>
            </div>

            {/* Batches List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Batch Upload History</h2>
              
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Loading batches...</span>
                </div>
              ) : batches.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">No batch uploads found. Create your first batch upload to get started.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {batches.map((batch) => (
                    <Card key={batch.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-lg">{batch.name}</CardTitle>
                              <Badge variant={getStatusBadgeVariant(batch.status)} className="flex items-center gap-1">
                                {getStatusIcon(batch.status)}
                                {batch.status}
                              </Badge>
                            </div>
                            <CardDescription>
                              Created: {new Date(batch.created_at).toLocaleString()}
                              {batch.completed_at && (
                                <> • Completed: {new Date(batch.completed_at).toLocaleString()}</>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {batch.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/${params.locale}/case-management/batch-upload/${batch.id}/map`)}
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Map Contributors
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleProcessBatch(batch.id)}
                                  disabled={processingBatchId === batch.id}
                                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white"
                                >
                                  {processingBatchId === batch.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-4 w-4 mr-2" />
                                      Process Batch
                                    </>
                                  )}
                                </Button>
                              </>
                            )}
                            {(batch.status === 'completed' || batch.status === 'failed') && batch.successful_items > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRollbackClick(batch)}
                                disabled={rollbackBatchId === batch.id}
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              >
                                {rollbackBatchId === batch.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Rolling back...
                                  </>
                                ) : (
                                  <>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Rollback
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(batch)}
                              disabled={deletingBatchId === batch.id || processingBatchId === batch.id || rollbackBatchId === batch.id}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deletingBatchId === batch.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Total Items:</span>
                            <span className="ml-2 font-semibold">{batch.total_items}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Processed:</span>
                            <span className="ml-2 font-semibold">{batch.processed_items}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Successful:</span>
                            <span className="ml-2 font-semibold text-green-600">{batch.successful_items}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Failed:</span>
                            <span className="ml-2 font-semibold text-red-600">{batch.failed_items}</span>
                          </div>
                        </div>
                        {batch.error_summary && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">
                              <strong>Errors:</strong> {batch.error_summary.total_errors || 0} items failed
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Batch Upload Modal */}
            <BatchCaseUploadModal
              open={batchUploadModalOpen}
              onOpenChange={(open) => {
                setBatchUploadModalOpen(open)
              }}
              onSuccess={() => {
                // Refresh batches list after successful upload
                fetchBatches()
              }}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              onConfirm={handleDeleteConfirm}
              title="Delete Batch Upload"
              description={
                batchToDelete
                  ? `Are you sure you want to delete "${batchToDelete.name}"? This will permanently delete all cases and contributions created by this batch. This action cannot be undone.`
                  : 'Are you sure you want to delete this batch upload?'
              }
              confirmText={deletingBatchId ? 'Deleting...' : 'Delete Batch'}
              cancelText="Cancel"
              variant="destructive"
              disabled={!!deletingBatchId}
            />

            {/* Rollback Confirmation Dialog */}
            <ConfirmationDialog
              open={rollbackDialogOpen}
              onOpenChange={setRollbackDialogOpen}
              onConfirm={handleRollbackConfirm}
              title="Rollback Batch Upload"
              description={
                batchToRollback
                  ? `Are you sure you want to rollback "${batchToRollback.name}"? This will delete all cases and contributions created by this batch (${batchToRollback.successful_items} successful items). The batch will be reset to pending status. This action cannot be undone.`
                  : 'Are you sure you want to rollback this batch upload?'
              }
              confirmText={rollbackBatchId ? 'Rolling back...' : 'Rollback Batch'}
              cancelText="Cancel"
              variant="destructive"
              disabled={!!rollbackBatchId}
            />
          </div>
        </Container>
      </PermissionGuard>
    </ProtectedRoute>
  )
}

