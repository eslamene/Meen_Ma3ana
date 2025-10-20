'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import SponsorshipRequestForm from '@/components/sponsorships/SponsorshipRequestForm'

export default function SponsorshipRequestPage() {
  const t = useTranslations('sponsorships')
  const router = useRouter()

  const handleSuccess = () => {
    // Redirect to dashboard after successful submission
    router.push('/dashboard')
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('cancel')}
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('sponsorshipRequest')}</CardTitle>
            <CardDescription className="text-gray-700">
              {t('sponsorshipRequestDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SponsorshipRequestForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 