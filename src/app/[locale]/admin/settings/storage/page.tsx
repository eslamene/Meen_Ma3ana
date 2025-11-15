'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import PermissionGuard from '@/components/auth/PermissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BucketDetailsDialog } from '@/components/storage/BucketDetailsDialog'
import { toast } from 'sonner'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import DetailPageHeader from '@/components/crud/DetailPageHeader'
import DetailPageFooter from '@/components/crud/DetailPageFooter'
import {
  Settings,
  Eye,
  RefreshCw,
  Loader2,
  Database
} from 'lucide-react'
import type { StorageBucket } from '@/lib/storage/types'

export default function StorageConfigurationPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('admin')
  const { containerVariant } = useLayout()

  const [buckets, setBuckets] = useState<StorageBucket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)

  const fetchBuckets = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/storage/buckets')

      if (!response.ok) {
        throw new Error('Failed to fetch buckets')
      }

      const data = await response.json()
      setBuckets(data.buckets || [])
    } catch (error) {
      console.error('Error fetching buckets:', error)
      toast.error('Error', { description: 'Failed to load storage buckets' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchBuckets()
  }, [fetchBuckets])

  const handleViewDetails = (bucketName: string) => {
    setSelectedBucket(bucketName)
    setIsDetailsDialogOpen(true)
  }

  const handleDetailsClose = () => {
    setIsDetailsDialogOpen(false)
    setSelectedBucket(null)
  }

  const handleRefresh = () => {
    fetchBuckets()
  }

  return (
    <PermissionGuard permissions={['manage:files']} fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Settings className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don&apos;t have permission to manage storage configuration.</p>
            <Button onClick={() => router.push(`/${locale}/admin`)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
        <Container variant={containerVariant}>
          {/* Header */}
          <DetailPageHeader
            backUrl={`/${locale}/admin`}
            icon={Database}
            title="Storage Configuration"
            description="Manage storage buckets and upload rules"
            backLabel="Back to Admin"
            actions={
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="flex items-center gap-2"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            }
          />

          {/* Buckets Table */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Storage Buckets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : buckets.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Buckets Found
                  </h3>
                  <p className="text-gray-600">
                    No storage buckets are configured in your Supabase project
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bucket Name</TableHead>
                        <TableHead>Visibility</TableHead>
                        <TableHead>Max File Size</TableHead>
                        <TableHead>Allowed Types</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buckets.map((bucket) => (
                        <TableRow key={bucket.id}>
                          <TableCell className="font-medium">{bucket.name}</TableCell>
                          <TableCell>
                            <Badge variant={bucket.public ? 'default' : 'secondary'}>
                              {bucket.public ? 'Public' : 'Private'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {bucket.file_size_limit ? (
                              <span className="text-sm text-gray-700">
                                {bucket.file_size_limit} MB
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">Not configured</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {bucket.allowed_mime_types && bucket.allowed_mime_types.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {bucket.allowed_mime_types.slice(0, 3).map((ext) => (
                                  <Badge key={ext} variant="outline" className="text-xs">
                                    {ext.toUpperCase()}
                                  </Badge>
                                ))}
                                {bucket.allowed_mime_types.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{bucket.allowed_mime_types.length - 3}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Not configured</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {new Date(bucket.created_at).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(bucket.name)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bucket Details Dialog */}
          {selectedBucket && (
            <BucketDetailsDialog
              open={isDetailsDialogOpen}
              onOpenChange={setIsDetailsDialogOpen}
              bucketName={selectedBucket}
              onUpdate={fetchBuckets}
            />
          )}

          {/* Footer */}
          <DetailPageFooter
            show={false}
          />
        </Container>
      </div>
    </PermissionGuard>
  )
}

