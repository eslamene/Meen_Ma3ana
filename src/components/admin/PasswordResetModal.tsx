'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Loader2, Key, AlertTriangle, CheckCircle } from 'lucide-react'

import { defaultLogger as logger } from '@/lib/logger'

interface PasswordResetModalProps {
  open: boolean
  userId: string | null
  userEmail: string | null
  onClose: () => void
  onSuccess: () => void
}

export function PasswordResetModal({ open, userId, userEmail, onClose, onSuccess }: PasswordResetModalProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleReset = async () => {
    if (!userId) return

    try {
      setLoading(true)
      setSuccess(false)

      // Get locale from URL or default to 'en'
      const locale = window.location.pathname.split('/')[1] || 'en'

      const response = await fetch(`/api/admin/users/${userId}/reset-password?locale=${locale}`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send password reset email')
      }

      toast.success('Success', { description: 'Password reset email sent successfully' })
      onSuccess()
      onClose()
    } catch (error) {
      logger.error('Error resetting password:', { error: error })
      toast.error('Error', { description: error instanceof Error ? error.message : 'Failed to send password reset email' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset User Password</DialogTitle>
          <DialogDescription>
            Send a password reset email to {userEmail || 'this user'}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Password reset email has been sent successfully. The user will receive instructions to reset their password.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                This will send a password reset email to the user. They will need to click the link in the email to set a new password.
              </AlertDescription>
            </Alert>

            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                User: <span className="font-medium">{userEmail}</span>
              </p>
            </div>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {success ? 'Close' : 'Cancel'}
          </Button>
          {!success && (
            <Button onClick={handleReset} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Key className="mr-2 h-4 w-4" />
              Send Reset Email
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

