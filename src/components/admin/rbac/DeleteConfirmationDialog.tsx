"use client"

import React from "react"
import { AlertTriangle, Info, AlertOctagon, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/omponents/ui/dialog"
import { Button } from "@/omponents/ui/button"
import { Checkbox } from "@/omponents/ui/checkbox"
import { Input } from "@/omponents/ui/input"

interface DeleteConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  itemName: string
  itemType: string
  loading?: boolean
  dangerLevel?: 'low' | 'medium' | 'high'
}

export function DeleteConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  itemType,
  loading = false,
  dangerLevel = 'medium',
}: DeleteConfirmationDialogProps) {
  const [understandChecked, setUnderstandChecked] = React.useState(false)
  const [confirmText, setConfirmText] = React.useState("")

  const handleClose = () => {
    setUnderstandChecked(false)
    setConfirmText("")
    onClose()
  }

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm()
    }
  }

  const canConfirm = React.useMemo(() => {
    if (dangerLevel === 'high') {
      return understandChecked && confirmText === itemName
    }
    return understandChecked
  }, [understandChecked, confirmText, itemName, dangerLevel])

  const getIcon = () => {
    switch (dangerLevel) {
      case 'low':
        return <Info className="h-6 w-6 text-blue-500" />
      case 'medium':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />
      case 'high':
        return <AlertOctagon className="h-6 w-6 text-red-500" />
      default:
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />
    }
  }

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return

      if (event.key === 'Escape') {
        handleClose()
      } else if (event.key === 'Enter' && canConfirm) {
        handleConfirm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, canConfirm])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {description.replace('{itemName}', `<strong>${itemName}</strong>`)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="understand"
              checked={understandChecked}
              onCheckedChange={(checked) => setUnderstandChecked(checked as boolean)}
            />
            <label
              htmlFor="understand"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I understand this action cannot be undone
            </label>
          </div>

          {dangerLevel === 'high' && (
            <div className="space-y-2">
              <label htmlFor="confirm-text" className="text-sm font-medium">
                Type &quot;{itemName}&quot; to confirm deletion:
              </label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type ${itemName} here`}
              />
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <a href="#" className="text-blue-600 hover:underline">
              Learn more about the implications of deleting a {itemType}
            </a>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete {itemType}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}