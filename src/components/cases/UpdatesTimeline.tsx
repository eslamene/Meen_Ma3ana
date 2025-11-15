'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Plus, Calendar, User, MessageSquare, AlertTriangle, Target, FileText, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { CaseUpdate } from '@/lib/case-updates'
import { createClient } from '@/lib/supabase/client'
import { useAdmin } from '@/lib/admin/hooks'

type UpdateType = 'progress' | 'milestone' | 'general' | 'emergency'

interface UpdatesTimelineProps {
  caseId: string
  updates: CaseUpdate[]
  onUpdateCreated?: (update: CaseUpdate) => void
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

const getUpdateTypeIcon = (type: UpdateType) => {
  switch (type) {
    case 'progress':
      return <Target className="h-4 w-4" />
    case 'milestone':
      return <FileText className="h-4 w-4" />
    case 'emergency':
      return <AlertTriangle className="h-4 w-4" />
    default:
      return <MessageSquare className="h-4 w-4" />
  }
}

const getUpdateTypeColor = (type: UpdateType) => {
  switch (type) {
    case 'progress':
      return 'bg-green-100 text-green-800'
    case 'milestone':
      return 'bg-blue-100 text-blue-800'
    case 'emergency':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatRelativeDate = (date: string | Date) => {
  const now = new Date()
  const updateDate = new Date(date)
  const diffInMs = now.getTime() - updateDate.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  const diffInWeeks = Math.floor(diffInDays / 7)
  const diffInMonths = Math.floor(diffInDays / 30)
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
  if (diffInHours < 24) return `${diffInHours} hours ago`
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`
  if (diffInMonths < 12) return `${diffInMonths} months ago`
  return formatDate(date)
}

export default function UpdatesTimeline({ 
  caseId, 
  updates, 
  onUpdateCreated, 
  canCreate = false,
  canEdit = false,
  canDelete = false 
}: UpdatesTimelineProps) {
  const t = useTranslations('cases')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUpdate, setEditingUpdate] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    updateType: 'general' as UpdateType,
    isPublic: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterType, setFilterType] = useState<UpdateType | 'all'>('all')
  const [showPrivate, setShowPrivate] = useState(false)

  const supabase = createClient()
  const { user: currentUser, hasRole } = useAdmin()

  const filteredUpdates = updates.filter(update => {
    if (filterType !== 'all' && update.updateType !== filterType) return false
    if (!showPrivate && !update.isPublic) return false
    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/cases/${caseId}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          updateType: formData.updateType,
          isPublic: formData.isPublic,
        }),
      })

      if (response.ok) {
        const newUpdate = await response.json()
        onUpdateCreated?.(newUpdate.update)
        setFormData({
          title: '',
          content: '',
          updateType: 'general',
          isPublic: true,
        })
        setShowCreateForm(false)
      } else {
        const error = await response.json()
        console.error('Error creating update:', error)
        // TODO: Show error toast
      }
    } catch (error) {
      console.error('Error creating update:', error)
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (updateId: string, updatedData: {
    title: string
    content: string
    updateType: UpdateType
    isPublic: boolean
  }) => {
    try {
      const response = await fetch(`/api/cases/${caseId}/updates/${updateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      })

      if (response.ok) {
        const updatedUpdate = await response.json()
        // Update the local state
        const updatedUpdates = updates.map(update => 
          update.id === updateId ? updatedUpdate.update : update
        )
        // TODO: Update parent component state
        setEditingUpdate(null)
      } else {
        const error = await response.json()
        console.error('Error updating update:', error)
      }
    } catch (error) {
      console.error('Error updating update:', error as Error)
    }
  }

  const handleDelete = async (updateId: string) => {
    if (!confirm('Are you sure you want to delete this update?')) return

    try {
      const response = await fetch(`/api/cases/${caseId}/updates/${updateId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove from local state
        const updatedUpdates = updates.filter(update => update.id !== updateId)
        // TODO: Update parent component state
      } else {
        const error = await response.json()
        console.error('Error deleting update:', error)
      }
    } catch (error) {
      console.error('Error deleting update:', error)
    }
  }

  const canModifyUpdate = (update: CaseUpdate) => {
    if (!currentUser) return false
    if (hasRole('admin') || hasRole('super_admin')) return true
    return update.createdBy === currentUser.id
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and create button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">{t('updatesObject.title')}</h3>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={(value) => setFilterType(value as UpdateType | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('updatesObject.allUpdates')}</SelectItem>
                <SelectItem value="progress">{t('updatesObject.updateTypes.progress')}</SelectItem>
                <SelectItem value="milestone">{t('updatesObject.updateTypes.milestone')}</SelectItem>
                <SelectItem value="general">{t('updatesObject.updateTypes.general')}</SelectItem>
                <SelectItem value="emergency">{t('updatesObject.updateTypes.emergency')}</SelectItem>
              </SelectContent>
            </Select>
            {canEdit && (
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="showPrivate" 
                  checked={showPrivate} 
                  onCheckedChange={(checked) => setShowPrivate(checked as boolean)}
                />
                <Label htmlFor="showPrivate" className="text-sm">{t('updatesObject.showPrivate')}</Label>
              </div>
            )}
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
                            {t('updatesObject.createUpdate')}
          </Button>
        )}
      </div>

      {/* Create Update Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
                            <CardTitle>{t('updatesObject.createUpdate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">{t('updatesObject.form.title')}</Label>
                                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('updatesObject.updateTitlePlaceholder')}
                    required
                  />
              </div>
              
              <div>
                <Label htmlFor="content">{t('updatesObject.form.content')}</Label>
                                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder={t('updatesObject.updateContentPlaceholder')}
                    rows={4}
                    required
                  />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="updateType">{t('updatesObject.form.type')}</Label>
                  <Select 
                    value={formData.updateType} 
                    onValueChange={(value) => setFormData({ ...formData, updateType: value as UpdateType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{t('updatesObject.updateTypes.general')}</SelectItem>
                      <SelectItem value="progress">{t('updatesObject.updateTypes.progress')}</SelectItem>
                      <SelectItem value="milestone">{t('updatesObject.updateTypes.milestone')}</SelectItem>
                      <SelectItem value="emergency">{t('updatesObject.updateTypes.emergency')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox 
                    id="isPublic" 
                    checked={formData.isPublic} 
                    onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked as boolean })}
                  />
                  <Label htmlFor="isPublic" className="text-sm">{t('updatesObject.form.public')}</Label>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('updatesObject.creating') : t('updatesObject.form.submit')}
                </Button>
                                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    {t('updatesObject.cancel')}
                  </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Updates Timeline */}
      <div className="space-y-4">
        {filteredUpdates.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">{t('updatesObject.noUpdates')}</p>
                <p className="text-sm text-gray-400 mt-2">{t('updatesObject.noUpdatesDescription')}</p>
          </div>
        ) : (
          filteredUpdates.map((update) => (
            <Card key={update.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getUpdateTypeColor(update.updateType)}`}>
                      {getUpdateTypeIcon(update.updateType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{update.title}</h4>
                        <Badge variant="secondary" className={getUpdateTypeColor(update.updateType)}>
                          {t(`updatesObject.updateTypes.${update.updateType}`)}
                        </Badge>
                        {!update.isPublic && (
                          <Badge variant="outline" className="text-xs">
                            <EyeOff className="h-3 w-3 mr-1" />
                            {t('updatesObject.private')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>
                            {update.createdByUser?.first_name && update.createdByUser?.last_name
                              ? `${update.createdByUser.first_name} ${update.createdByUser.last_name}`
                              : t('updatesObject.anonymous')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatRelativeDate(update.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {canModifyUpdate(update) && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUpdate(update.id)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(update.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {editingUpdate === update.id ? (
                  <div className="space-y-4">
                    <Input
                      value={update.title}
                      onChange={(e) => {
                        // TODO: Update local state for editing
                      }}
                      placeholder={t('updatesObject.updateTitlePlaceholder')}
                    />
                    <Textarea
                      value={update.content}
                      onChange={(e) => {
                        // TODO: Update local state for editing
                      }}
                      placeholder={t('updatesObject.updateContentPlaceholder')}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => handleEdit(update.id, {
                          title: update.title,
                          content: update.content,
                          updateType: update.updateType,
                          isPublic: update.isPublic
                        })}
                      >
                        {t('updatesObject.save')}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingUpdate(null)}
                      >
                        {t('updatesObject.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{update.content}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 