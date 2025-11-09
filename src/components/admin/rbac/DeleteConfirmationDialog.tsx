'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface DeleteConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  itemName?: string
  itemType?: string
  dangerLevel?: 'low' | 'medium' | 'high'
}

export function DeleteConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  itemName = '',
  itemType = 'item',
  dangerLevel = 'medium'
}: DeleteConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const dangerColors = {
    low: 'text-yellow-600',
    medium: 'text-orange-600',
    high: 'text-red-600'
  }

  const dangerBgColors = {
    low: 'bg-yellow-50 border-yellow-200',
    medium: 'bg-orange-50 border-orange-200',
    high: 'bg-red-50 border-red-200'
  }

  const formattedDescription = description.replace('{itemName}', itemName)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${dangerColors[dangerLevel]}`}>
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {formattedDescription}
          </DialogDescription>
        </DialogHeader>

        {dangerLevel === 'high' && (
          <div className={`p-3 rounded-lg border ${dangerBgColors[dangerLevel]}`}>
            <p className="text-sm font-medium text-red-800">
              Warning: This action cannot be undone and may have serious consequences.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            className={dangerLevel === 'high' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            Delete {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

