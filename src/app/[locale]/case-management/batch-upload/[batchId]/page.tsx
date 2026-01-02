'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import PermissionGuard from '@/components/auth/PermissionGuard'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Play, RotateCcw, Trash2, Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Progress } from '@/components/ui/progress'

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

export default function BatchDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { containerVariant } = useLayout()
  const batchId = params.batchId as string
  const locale = params.locale as string

  const [batchData, setBatchData] = useState<BatchUpload | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null)
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rollbackBatchId, setRollbackBatchId] = useState<string | null>(null)
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false)
  const [isPolling, setIsPolling] = useState(false)

  useEffect(() => {
    if (batchId) {
      loadBatchData()
    }
  }, [batchId])

  // Poll for status updates when batch is processing
  useEffect(() => {
    if (!batchData || batchData.status !== 'processing') {
      setIsPolling(false)
      return
    }

    setIsPolling(true)
    const pollInterval = setInterval(() => {
      loadBatchData()
    }, 2000) // Poll every 2 seconds

    return () => {
      clearInterval(pollInterval)
      setIsPolling(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchData?.status, batchId])

  const loadBatchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/cases/batch-upload/${batchId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setBatchData(data.data.batch)
        } else {
          toast.error('Failed to load batch data')
        }
      } else {
        toast.error('Failed to load batch data')
      }
    } catch (error) {
      toast.error('Failed to load batch data')
    } finally {
      setLoading(false)
    }
  }

  const handleProcessBatch = async () => {
    try {
      setProcessingBatchId(batchId)
      const response = await fetch(`/api/admin/cases/batch-upload/${batchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process' })
      })

      const result = await response.json()

      if (result.success) {
        // Start polling for updates
        await loadBatchData()
        toast.success('Batch processing started')
      } else {
        toast.error(result.message || result.error || 'Failed to process batch')
        setProcessingBatchId(null)
      }
    } catch (error) {
      toast.error('Failed to process batch')
      setProcessingBatchId(null)
    }
  }

  const getProgressPercentage = () => {
    if (!batchData || batchData.total_items === 0) return 0
    return Math.min((batchData.processed_items / batchData.total_items) * 100, 100)
  }

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      setDeletingBatchId(batchId)
      const response = await fetch(`/api/admin/cases/batch-upload/${batchId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message || 'Batch upload deleted successfully')
        router.push(`/${locale}/case-management/batch-upload`)
      } else {
        toast.error(result.message || 'Failed to delete batch upload')
      }
    } catch (error) {
      toast.error('Failed to delete batch upload')
    } finally {
      setDeletingBatchId(null)
      setDeleteDialogOpen(false)
    }
  }

  const handleRollbackClick = () => {
    setRollbackDialogOpen(true)
  }

  const handleRollbackConfirm = async () => {
    try {
      setRollbackBatchId(batchId)
      const response = await fetch(`/api/admin/cases/batch-upload/${batchId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message || 'Batch rollback completed successfully')
        await loadBatchData()
      } else {
        toast.error(result.message || 'Failed to rollback batch')
      }
    } catch (error) {
      toast.error('Failed to rollback batch')
    } finally {
      setRollbackBatchId(null)
      setRollbackDialogOpen(false)
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

  if (loading) {
    return (
      <ProtectedRoute>
        <PermissionGuard permission="cases:batch_upload">
          <Container variant={containerVariant}>
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading batch data...</span>
            </div>
          </Container>
        </PermissionGuard>
      </ProtectedRoute>
    )
  }

  if (!batchData) {
    return (
      <ProtectedRoute>
        <PermissionGuard permission="cases:batch_upload">
          <Container variant={containerVariant}>
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Batch not found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push(`/${locale}/case-management/batch-upload`)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Batch Uploads
                </Button>
              </div>
            </div>
          </Container>
        </PermissionGuard>
      </ProtectedRoute>
    )
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
                  onClick={() => router.push(`/${locale}/case-management/batch-upload`)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{batchData.name}</h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
                    Batch Upload Details
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {batchData.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/${locale}/case-management/batch-upload/${batchId}/map`)}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Map Contributors
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleProcessBatch}
                      disabled={processingBatchId === batchId}
                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white"
                    >
                      {processingBatchId === batchId ? (
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
                {(batchData.status === 'completed' || batchData.status === 'failed') && batchData.successful_items > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleRollbackClick}
                    disabled={rollbackBatchId === batchId}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    {rollbackBatchId === batchId ? (
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
                  onClick={handleDeleteClick}
                  disabled={deletingBatchId === batchId || processingBatchId === batchId || rollbackBatchId === batchId}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {deletingBatchId === batchId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Batch Details Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Batch Information
                      <Badge variant={getStatusBadgeVariant(batchData.status)} className="flex items-center gap-1">
                        {getStatusIcon(batchData.status)}
                        {batchData.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Created: {new Date(batchData.created_at).toLocaleString()}
                      {batchData.completed_at && (
                        <> • Completed: {new Date(batchData.completed_at).toLocaleString()}</>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Bar - Show when processing */}
                {batchData.status === 'processing' && (
                  <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Processing Progress</span>
                      <span className="text-sm font-semibold text-indigo-600">
                        {getProgressPercentage().toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={getProgressPercentage()} className="h-3" />
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Processing items... This may take a few minutes.</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Items:</span>
                    <span className="ml-2 font-semibold">{batchData.total_items}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Processed:</span>
                    <span className="ml-2 font-semibold">
                      {batchData.processed_items} / {batchData.total_items}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Successful:</span>
                    <span className="ml-2 font-semibold text-green-600">{batchData.successful_items}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Failed:</span>
                    <span className="ml-2 font-semibold text-red-600">{batchData.failed_items}</span>
                  </div>
                </div>

                {/* Live Statistics - Show when processing */}
                {batchData.status === 'processing' && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-blue-900">Live Updates</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-blue-700">Processed:</span>
                        <span className="ml-1 font-semibold text-blue-900">
                          {batchData.processed_items}
                        </span>
                      </div>
                      <div>
                        <span className="text-green-700">Success:</span>
                        <span className="ml-1 font-semibold text-green-900">
                          {batchData.successful_items}
                        </span>
                      </div>
                      <div>
                        <span className="text-red-700">Failed:</span>
                        <span className="ml-1 font-semibold text-red-900">
                          {batchData.failed_items}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {batchData.error_summary && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Errors:</strong> {batchData.error_summary.total_errors || 0} items failed
                    </p>
                  </div>
                )}
                {batchData.source_file && (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Source File:</strong> {batchData.source_file}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {batchData.status === 'pending' && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/${locale}/case-management/batch-upload/${batchId}/map`)}
                      className="flex-1"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Map Contributors
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleProcessBatch}
                      disabled={processingBatchId === batchId}
                      className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white"
                    >
                      {processingBatchId === batchId ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Process Batch
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Processing Status Card */}
            {batchData.status === 'processing' && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    Processing in Progress
                  </CardTitle>
                  <CardDescription>
                    The batch is being processed. This page will update automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                        <span className="text-sm font-semibold text-indigo-600">
                          {getProgressPercentage().toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={getProgressPercentage()} className="h-4" />
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{batchData.processed_items}</div>
                        <div className="text-xs text-gray-600">Processed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{batchData.successful_items}</div>
                        <div className="text-xs text-gray-600">Successful</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{batchData.failed_items}</div>
                        <div className="text-xs text-gray-600">Failed</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completion Status */}
            {(batchData.status === 'completed' || batchData.status === 'failed') && batchData.processed_items > 0 && (
              <Card className={batchData.status === 'completed' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {batchData.status === 'completed' ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        Processing Completed
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        Processing Failed
                      </>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {batchData.status === 'completed'
                      ? `Successfully processed ${batchData.successful_items} items.`
                      : `Processing completed with ${batchData.failed_items} failed items.`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Final Progress</span>
                      <span className="text-sm font-semibold">
                        {getProgressPercentage().toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={getProgressPercentage()} 
                      className={`h-3 ${batchData.status === 'completed' ? 'bg-green-200' : ''}`}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Delete Confirmation Dialog */}
          <ConfirmationDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={handleDeleteConfirm}
            title="Delete Batch Upload"
            description={`Are you sure you want to delete "${batchData.name}"? This will permanently delete all cases and contributions created by this batch. This action cannot be undone.`}
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
            description={`Are you sure you want to rollback "${batchData.name}"? This will delete all cases and contributions created by this batch (${batchData.successful_items} successful items). The batch will be reset to pending status. This action cannot be undone.`}
            confirmText={rollbackBatchId ? 'Rolling back...' : 'Rollback Batch'}
            cancelText="Cancel"
            variant="destructive"
            disabled={!!rollbackBatchId}
          />
        </Container>
      </PermissionGuard>
    </ProtectedRoute>
  )
}

